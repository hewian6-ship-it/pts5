import { db } from '../db';
import { Purchase, PurchaseItem, PaymentMethod } from '../../src/types';
import { roundMoney, toDecimal } from '../../src/lib/finance';
import { Decimal } from 'decimal.js';

export interface CreatePurchasePayload {
  supplierId: string;
  items: {
    productId: string;
    quantity: number;
    costPrice: number;
  }[];
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID';
  paymentMethod: PaymentMethod;
  paidAmount?: number;
  notes?: string;
  user: string;
}

export const createPurchase = (payload: CreatePurchasePayload): Purchase => {
  const data = db.getRawData();
  const supplier = data.suppliers.find((s) => s.id === payload.supplierId);
  if (!supplier) throw new Error('Supplier not found.');

  if (!payload.items || payload.items.length === 0) {
    throw new Error('Purchase requires at least one item.');
  }

  let totalCost = new Decimal(0);
  const items: PurchaseItem[] = [];
  const stockChanges: { product: any; quantity: number; costPrice: number; beforeStock: number; afterStock: number }[] = [];

  for (const rawItem of payload.items) {
    const product = data.products.find((p) => p.id === rawItem.productId);
    if (!product) throw new Error(`Product ${rawItem.productId} not found.`);

    const cost = rawItem.costPrice !== undefined ? rawItem.costPrice : product.costPrice;
    const subtotal = new Decimal(cost).mul(rawItem.quantity);
    totalCost = totalCost.plus(subtotal);

    items.push({
      id: `po_item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      purchaseId: '',
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      quantity: rawItem.quantity,
      costPrice: cost,
      subtotal: roundMoney(subtotal),
    });

    stockChanges.push({
      product,
      quantity: rawItem.quantity,
      costPrice: cost,
      beforeStock: product.stockQuantity,
      afterStock: product.stockQuantity + rawItem.quantity,
    });
  }

  const prefix = data.businessSettings.purchasePrefix || 'PO';
  const purchaseNo = db.getNextPurchaseNumber(prefix);
  const purchaseId = `po_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  for (const item of items) {
    item.purchaseId = purchaseId;
  }

  const finalTotal = roundMoney(totalCost);
  const paid = roundMoney(
    payload.paymentStatus === 'PAID'
      ? finalTotal
      : payload.paymentStatus === 'UNPAID'
      ? 0
      : payload.paidAmount || 0
  );
  const balancePayable = roundMoney(toDecimal(finalTotal).minus(paid));

  const nowIso = new Date().toISOString();

  // 1. Update Product Inventory & Movement History
  for (const change of stockChanges) {
    change.product.stockQuantity = change.afterStock;
    change.product.costPrice = change.costPrice; // Update last purchase cost price
    change.product.updatedAt = nowIso;

    data.movements.push({
      id: `mov_po_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      productId: change.product.id,
      productName: change.product.name,
      sku: change.product.sku,
      type: 'PURCHASE',
      quantity: change.quantity,
      beforeStock: change.beforeStock,
      afterStock: change.afterStock,
      reason: `Stock In from Supplier (${purchaseNo}) - ${supplier.companyName}`,
      reference: purchaseNo,
      user: payload.user || '007',
      createdAt: nowIso,
    });
  }

  // 2. Update Supplier Accounts Payable & Stats
  supplier.totalPurchases = roundMoney(toDecimal(supplier.totalPurchases).plus(finalTotal));
  if (balancePayable > 0) {
    supplier.outstandingPayable = roundMoney(
      toDecimal(supplier.outstandingPayable).plus(balancePayable)
    );
  }

  // 3. Double-Entry Accounting
  // Debit Inventory Asset
  data.ledgerEntries.push({
    id: `ledg_po_inv_${Date.now()}`,
    date: nowIso,
    description: `Inventory stock addition from ${purchaseNo} (${supplier.companyName})`,
    account: 'INVENTORY',
    debit: finalTotal,
    credit: 0,
    referenceType: 'PURCHASE',
    referenceId: purchaseId,
    referenceNo: purchaseNo,
    createdAt: nowIso,
  });

  // Credit Cash/Bank if paid
  if (paid > 0) {
    const acct =
      payload.paymentMethod === 'CASH'
        ? 'CASH'
        : payload.paymentMethod === 'QR'
        ? 'BANK_QR'
        : 'CARD_CLEARING';

    data.ledgerEntries.push({
      id: `ledg_po_pay_${Date.now()}`,
      date: nowIso,
      description: `Payment to supplier for ${purchaseNo}`,
      account: acct,
      debit: 0,
      credit: paid,
      referenceType: 'PURCHASE',
      referenceId: purchaseId,
      referenceNo: purchaseNo,
      createdAt: nowIso,
    });
  }

  // Credit Accounts Payable if balance owed
  if (balancePayable > 0) {
    data.ledgerEntries.push({
      id: `ledg_po_ap_${Date.now()}`,
      date: nowIso,
      description: `Accounts Payable balance owed for ${purchaseNo}`,
      account: 'ACCOUNTS_PAYABLE',
      debit: 0,
      credit: balancePayable,
      referenceType: 'PURCHASE',
      referenceId: purchaseId,
      referenceNo: purchaseNo,
      createdAt: nowIso,
    });
  }

  const purchase: Purchase = {
    id: purchaseId,
    purchaseNo,
    supplierId: supplier.id,
    supplierName: supplier.companyName,
    date: nowIso,
    total: finalTotal,
    paidAmount: paid,
    paymentStatus: payload.paymentStatus,
    paymentMethod: payload.paymentMethod,
    status: 'RECEIVED',
    items,
    notes: payload.notes,
    createdAt: nowIso,
  };

  data.purchases.unshift(purchase);
  db.persist();
  return purchase;
};
