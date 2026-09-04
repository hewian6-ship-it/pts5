import { db } from '../db';
import { Quotation, QuotationItem, QuotationStatus, PaymentMethod } from '../../src/types';
import { roundMoney, toDecimal, calculateItemDiscount } from '../../src/lib/finance';
import { processCheckout } from './posService';
import { Decimal } from 'decimal.js';

export interface CreateQuotationPayload {
  customerId: string;
  expiryDate?: string;
  items: {
    productId: string;
    quantity: number;
    unitPrice?: number;
    discount?: number;
  }[];
  discount?: number;
  notes?: string;
  terms?: string;
}

export const createQuotation = (payload: CreateQuotationPayload): Quotation => {
  const data = db.getRawData();
  const customer = data.customers.find((c) => c.id === payload.customerId) || data.customers[0];

  if (!payload.items || payload.items.length === 0) {
    throw new Error('Quotation requires at least one item.');
  }

  let totalGross = new Decimal(0);
  let totalDiscounts = new Decimal(0);
  const items: QuotationItem[] = [];

  for (const rawItem of payload.items) {
    const product = data.products.find((p) => p.id === rawItem.productId);
    if (!product) {
      throw new Error(`Product ${rawItem.productId} not found.`);
    }

    const unitPrice = rawItem.unitPrice !== undefined ? rawItem.unitPrice : product.sellingPrice;
    const discount = rawItem.discount || 0;
    const gross = toDecimal(unitPrice).mul(rawItem.quantity);
    const subtotal = gross.minus(discount);

    totalGross = totalGross.plus(gross);
    totalDiscounts = totalDiscounts.plus(discount);

    items.push({
      id: `qt_item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      quotationId: '',
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      quantity: rawItem.quantity,
      unitPrice: unitPrice,
      discount: discount,
      subtotal: roundMoney(subtotal),
    });
  }

  const overallDiscount = toDecimal(payload.discount || 0);
  const finalDiscount = totalDiscounts.plus(overallDiscount);
  const finalTotal = totalGross.minus(finalDiscount);

  const prefix = data.businessSettings.quotationPrefix || 'QT';
  const quotationNo = db.getNextQuotationNumber(prefix);
  const quotationId = `qt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  for (const item of items) {
    item.quotationId = quotationId;
  }

  // Default expiry date: 14 days from now
  const expiry =
    payload.expiryDate ||
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const quotation: Quotation = {
    id: quotationId,
    quotationNo,
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    customerAddress: customer.address,
    date: new Date().toISOString(),
    expiryDate: expiry,
    subtotal: roundMoney(totalGross),
    discount: roundMoney(finalDiscount),
    total: roundMoney(finalTotal),
    status: 'DRAFT',
    notes: payload.notes || 'Quotation valid for 14 days. Prices subject to stock availability.',
    terms: payload.terms || data.businessSettings.warrantyTerms,
    items,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  data.quotations.unshift(quotation);
  db.persist();
  return quotation;
};

export const updateQuotationStatus = (
  id: string,
  status: QuotationStatus
): Quotation => {
  const data = db.getRawData();
  const quotation = data.quotations.find((q) => q.id === id);
  if (!quotation) throw new Error('Quotation not found.');

  quotation.status = status;
  quotation.updatedAt = new Date().toISOString();
  db.persist();
  return quotation;
};

export const convertQuotationToInvoice = (
  quotationId: string,
  paymentMethod: PaymentMethod,
  user: string,
  cashReceived?: number
) => {
  const data = db.getRawData();
  const quotation = data.quotations.find((q) => q.id === quotationId);
  if (!quotation) throw new Error('Quotation not found.');

  if (quotation.status === 'CONVERTED') {
    throw new Error('This quotation has already been converted to an invoice.');
  }

  // Check if there is an active deposit for this quotation
  const deposit = data.deposits.find(
    (d) => d.quotationId === quotation.id && (d.status === 'OPEN' || d.status === 'PARTIAL')
  );

  // Convert quotation items to POS checkout payload
  const checkoutItems = quotation.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    discountType: 'NONE' as const,
    discountValue: item.discount,
  }));

  const checkoutResult = processCheckout({
    customerId: quotation.customerId,
    items: checkoutItems,
    overallDiscountType: 'NONE',
    overallDiscountValue: 0,
    paymentMethod,
    cashReceived,
    appliedDepositId: deposit ? deposit.id : undefined,
    notes: `Converted from Quotation ${quotation.quotationNo}. ${quotation.notes || ''}`,
    user,
  });

  quotation.status = 'CONVERTED';
  quotation.convertedInvoiceId = checkoutResult.invoice.id;
  quotation.updatedAt = new Date().toISOString();

  db.persist();
  return { invoice: checkoutResult.invoice, quotation };
};
