import { db } from '../db';
import {
  Invoice,
  InvoiceItem,
  PaymentMethod,
  InvoiceStatus,
  Product,
} from '../../src/types';
import {
  toDecimal,
  roundMoney,
  calculateItemDiscount,
  calculateOverallDiscount,
} from '../../src/lib/finance';
import { Decimal } from 'decimal.js';

export interface CheckoutPayload {
  customerId: string;
  items: {
    productId: string;
    quantity: number;
    unitPrice?: number;
    discountType: 'NONE' | 'PERCENT' | 'FIXED';
    discountValue: number;
  }[];
  overallDiscountType: 'NONE' | 'PERCENT' | 'FIXED';
  overallDiscountValue: number;
  paymentMethod: PaymentMethod;
  cashReceived?: number;
  appliedDepositId?: string;
  notes?: string;
  user: string;
}

export const processCheckout = (payload: CheckoutPayload): { success: boolean; invoice: Invoice } => {
  const data = db.getRawData();

  if (!payload.items || payload.items.length === 0) {
    throw new Error('Cannot checkout with empty cart.');
  }

  // 1. Find Customer
  const customer = data.customers.find((c) => c.id === payload.customerId) || data.customers[0];
  if (!customer) {
    throw new Error('Customer not found.');
  }

  // 2. Validate stock and fetch real product data
  let totalGross = new Decimal(0);
  let totalLineDiscounts = new Decimal(0);
  let totalCOGS = new Decimal(0);

  const invoiceItems: InvoiceItem[] = [];
  const stockChanges: { product: Product; quantity: number; beforeStock: number; afterStock: number }[] = [];

  for (const rawItem of payload.items) {
    const product = data.products.find((p) => p.id === rawItem.productId);
    if (!product) {
      throw new Error(`Product ID ${rawItem.productId} not found in inventory.`);
    }

    if (rawItem.quantity <= 0) {
      throw new Error(`Invalid quantity (${rawItem.quantity}) for product: ${product.name}`);
    }

    // Check stock for non-service items
    if (product.category !== 'Services' && product.stockQuantity < rawItem.quantity) {
      throw new Error(
        `Insufficient stock for "${product.name}". Available: ${product.stockQuantity}, Requested: ${rawItem.quantity}`
      );
    }

    // Always use official sellingPrice and costPrice from database
    const sellingPrice = product.sellingPrice;
    const costPrice = product.costPrice;

    // Recalculate line discount server-side
    const { discountAmount, subtotal } = calculateItemDiscount(
      sellingPrice,
      rawItem.quantity,
      rawItem.discountType || 'NONE',
      rawItem.discountValue || 0
    );

    const grossLine = toDecimal(sellingPrice).mul(rawItem.quantity);
    totalGross = totalGross.plus(grossLine);
    totalLineDiscounts = totalLineDiscounts.plus(discountAmount);

    const lineCOGS = toDecimal(costPrice).mul(rawItem.quantity);
    totalCOGS = totalCOGS.plus(lineCOGS);

    invoiceItems.push({
      id: `inv_item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      invoiceId: '', // Will assign once invoice is created
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      quantity: rawItem.quantity,
      unitPrice: sellingPrice,
      costPrice: costPrice,
      discount: discountAmount,
      subtotal: subtotal,
      warranty: product.warranty,
    });

    stockChanges.push({
      product,
      quantity: rawItem.quantity,
      beforeStock: product.stockQuantity,
      afterStock: product.category === 'Services' ? product.stockQuantity : product.stockQuantity - rawItem.quantity,
    });
  }

  // 3. Recalculate Overall Discount
  const itemsSubtotal = totalGross.minus(totalLineDiscounts);
  const overallDiscount = calculateOverallDiscount(
    itemsSubtotal.toNumber(),
    payload.overallDiscountType || 'NONE',
    payload.overallDiscountValue || 0
  );

  const totalDiscount = totalLineDiscounts.plus(overallDiscount);
  const finalTotal = totalGross.minus(totalDiscount);

  // 4. Handle Applied Deposit
  let depositAmount = new Decimal(0);
  let appliedDeposit = null;
  if (payload.appliedDepositId) {
    appliedDeposit = data.deposits.find((d) => d.id === payload.appliedDepositId && d.status === 'OPEN');
    if (appliedDeposit) {
      const depositAvail = toDecimal(appliedDeposit.remainingAmount);
      depositAmount = depositAvail.gt(finalTotal) ? finalTotal : depositAvail;
      appliedDeposit.remainingAmount = depositAvail.minus(depositAmount).toNumber();
      appliedDeposit.status = appliedDeposit.remainingAmount === 0 ? 'APPLIED' : 'OPEN';
    }
  }

  // 5. Calculate Payment amounts
  const payableAfterDeposit = finalTotal.minus(depositAmount);
  let paidAmount = new Decimal(0);
  let changeGiven = 0;
  let cashReceived = 0;

  if (payload.paymentMethod === 'CASH') {
    cashReceived = payload.cashReceived || payableAfterDeposit.toNumber();
    if (cashReceived < payableAfterDeposit.toNumber()) {
      // Partial cash
      paidAmount = toDecimal(cashReceived).plus(depositAmount);
    } else {
      paidAmount = finalTotal;
      changeGiven = roundMoney(toDecimal(cashReceived).minus(payableAfterDeposit));
    }
  } else {
    // QR or CARD
    paidAmount = finalTotal;
  }

  const balanceDue = roundMoney(finalTotal.minus(paidAmount));
  let paymentStatus: InvoiceStatus = 'PAID';
  if (balanceDue > 0) {
    paymentStatus = paidAmount.gt(0) ? 'PARTIAL' : 'UNPAID';
  }

  // 6. Generate Concurrency-Safe Invoice Number
  const prefix = data.businessSettings.invoicePrefix || 'INV';
  const invoiceNo = db.getNextInvoiceNumber(prefix);
  const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Link invoice items to invoice ID
  for (const item of invoiceItems) {
    item.invoiceId = invoiceId;
  }

  const invoice: Invoice = {
    id: invoiceId,
    invoiceNo,
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    customerAddress: customer.address,
    date: new Date().toISOString(),
    subtotal: roundMoney(totalGross),
    discount: roundMoney(totalDiscount),
    overallDiscountType: payload.overallDiscountType,
    overallDiscountValue: payload.overallDiscountValue,
    total: roundMoney(finalTotal),
    paidAmount: roundMoney(paidAmount),
    balanceDue: balanceDue,
    cogs: roundMoney(totalCOGS),
    grossProfit: roundMoney(finalTotal.minus(totalCOGS)),
    paymentMethod: payload.paymentMethod,
    paymentStatus,
    notes: payload.notes,
    cashReceived: payload.paymentMethod === 'CASH' ? cashReceived : undefined,
    changeGiven: payload.paymentMethod === 'CASH' ? changeGiven : undefined,
    items: invoiceItems,
    appliedDepositId: appliedDeposit ? appliedDeposit.id : undefined,
    appliedDepositAmount: depositAmount.gt(0) ? roundMoney(depositAmount) : undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 7. Apply Stock Deductions & Record Movements
  for (const change of stockChanges) {
    if (change.product.category !== 'Services') {
      change.product.stockQuantity = change.afterStock;
      change.product.updatedAt = new Date().toISOString();

      data.movements.push({
        id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        productId: change.product.id,
        productName: change.product.name,
        sku: change.product.sku,
        type: 'SALE',
        quantity: -change.quantity,
        beforeStock: change.beforeStock,
        afterStock: change.afterStock,
        reason: `POS Sale Checkout (${invoiceNo})`,
        reference: invoiceNo,
        user: payload.user || '007',
        createdAt: new Date().toISOString(),
      });
    }
  }

  // 8. Create Double-Entry Accounting Ledger Entries
  const nowIso = new Date().toISOString();
  const netPaidExcludingDeposit = paidAmount.minus(depositAmount);

  // Debit Payment method account (Cash / QR / Card)
  if (netPaidExcludingDeposit.gt(0)) {
    const acct =
      payload.paymentMethod === 'CASH'
        ? 'CASH'
        : payload.paymentMethod === 'QR'
        ? 'BANK_QR'
        : 'CARD_CLEARING';

    data.ledgerEntries.push({
      id: `ledg_${Date.now()}_1`,
      date: nowIso,
      description: `Payment received for ${invoiceNo}`,
      account: acct,
      debit: roundMoney(netPaidExcludingDeposit),
      credit: 0,
      referenceType: 'INVOICE',
      referenceId: invoice.id,
      referenceNo: invoiceNo,
      createdAt: nowIso,
    });
  }

  // Debit Applied Deposit if any
  if (depositAmount.gt(0)) {
    data.ledgerEntries.push({
      id: `ledg_${Date.now()}_dep`,
      date: nowIso,
      description: `Applied customer deposit ${appliedDeposit?.depositNo} to ${invoiceNo}`,
      account: 'OTHER_INCOME', // or liability deposit clearing
      debit: roundMoney(depositAmount),
      credit: 0,
      referenceType: 'INVOICE',
      referenceId: invoice.id,
      referenceNo: invoiceNo,
      createdAt: nowIso,
    });
  }

  // Debit Accounts Receivable if partial payment / unpaid
  if (balanceDue > 0) {
    data.ledgerEntries.push({
      id: `ledg_${Date.now()}_ar`,
      date: nowIso,
      description: `Unpaid customer balance for ${invoiceNo}`,
      account: 'ACCOUNTS_RECEIVABLE',
      debit: balanceDue,
      credit: 0,
      referenceType: 'INVOICE',
      referenceId: invoice.id,
      referenceNo: invoiceNo,
      createdAt: nowIso,
    });

    // Update Customer Accounts Receivable Balance
    customer.balance = roundMoney(toDecimal(customer.balance).plus(balanceDue));
  }

  // Credit Sales Revenue
  data.ledgerEntries.push({
    id: `ledg_${Date.now()}_sales`,
    date: nowIso,
    description: `Gross sales revenue from ${invoiceNo}`,
    account: 'SALES',
    debit: 0,
    credit: roundMoney(finalTotal),
    referenceType: 'INVOICE',
    referenceId: invoice.id,
    referenceNo: invoiceNo,
    createdAt: nowIso,
  });

  // Debit Cost of Goods Sold (COGS) & Credit Inventory Asset
  if (totalCOGS.gt(0)) {
    data.ledgerEntries.push({
      id: `ledg_${Date.now()}_cogs`,
      date: nowIso,
      description: `Cost of Goods Sold for ${invoiceNo}`,
      account: 'COGS',
      debit: roundMoney(totalCOGS),
      credit: 0,
      referenceType: 'INVOICE',
      referenceId: invoice.id,
      referenceNo: invoiceNo,
      createdAt: nowIso,
    });

    data.ledgerEntries.push({
      id: `ledg_${Date.now()}_inv`,
      date: nowIso,
      description: `Inventory reduction for ${invoiceNo}`,
      account: 'INVENTORY',
      debit: 0,
      credit: roundMoney(totalCOGS),
      referenceType: 'INVOICE',
      referenceId: invoice.id,
      referenceNo: invoiceNo,
      createdAt: nowIso,
    });
  }

  // Update Customer Spending Stats
  customer.totalSpent = roundMoney(toDecimal(customer.totalSpent).plus(finalTotal));
  customer.totalInvoices = (customer.totalInvoices || 0) + 1;

  // Append invoice
  data.invoices.unshift(invoice);

  // 9. Persist DB atomically
  db.persist();

  return { success: true, invoice };
};

export const cancelInvoice = (
  invoiceId: string,
  reason: string,
  user: string
): Invoice => {
  const data = db.getRawData();
  const invoice = data.invoices.find((inv) => inv.id === invoiceId);

  if (!invoice) {
    throw new Error('Invoice not found.');
  }

  if (invoice.paymentStatus === 'CANCELLED') {
    throw new Error('Invoice is already cancelled.');
  }

  const nowIso = new Date().toISOString();

  // 1. Restore Product Stock Quantities
  for (const item of invoice.items) {
    const product = data.products.find((p) => p.id === item.productId);
    if (product && product.category !== 'Services') {
      const beforeStock = product.stockQuantity;
      const afterStock = beforeStock + item.quantity;
      product.stockQuantity = afterStock;
      product.updatedAt = nowIso;

      data.movements.push({
        id: `mov_cancel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        type: 'RETURN',
        quantity: item.quantity,
        beforeStock,
        afterStock,
        reason: `Invoice Cancellation (${invoice.invoiceNo}): ${reason}`,
        reference: invoice.invoiceNo,
        user: user || '007',
        createdAt: nowIso,
      });
    }
  }

  // 2. Adjust Customer Stats & Balance
  const customer = data.customers.find((c) => c.id === invoice.customerId);
  if (customer) {
    customer.totalSpent = roundMoney(
      toDecimal(customer.totalSpent).minus(invoice.total).clamp(0, Infinity)
    );
    if (invoice.balanceDue > 0) {
      customer.balance = roundMoney(
        toDecimal(customer.balance).minus(invoice.balanceDue).clamp(0, Infinity)
      );
    }
  }

  // 3. Reversal Double-Entry Accounting
  data.ledgerEntries.push({
    id: `ledg_rev_sales_${Date.now()}`,
    date: nowIso,
    description: `Reversal - Invoice Cancelled: ${invoice.invoiceNo} (${reason})`,
    account: 'SALES',
    debit: invoice.total,
    credit: 0,
    referenceType: 'INVOICE',
    referenceId: invoice.id,
    referenceNo: invoice.invoiceNo,
    createdAt: nowIso,
  });

  if (invoice.paidAmount > 0) {
    const acct =
      invoice.paymentMethod === 'CASH'
        ? 'CASH'
        : invoice.paymentMethod === 'QR'
        ? 'BANK_QR'
        : 'CARD_CLEARING';

    data.ledgerEntries.push({
      id: `ledg_rev_pay_${Date.now()}`,
      date: nowIso,
      description: `Refund / Reversal for Cancelled ${invoice.invoiceNo}`,
      account: acct,
      debit: 0,
      credit: invoice.paidAmount,
      referenceType: 'INVOICE',
      referenceId: invoice.id,
      referenceNo: invoice.invoiceNo,
      createdAt: nowIso,
    });
  }

  if (invoice.cogs > 0) {
    data.ledgerEntries.push({
      id: `ledg_rev_inv_${Date.now()}`,
      date: nowIso,
      description: `Inventory restoration for Cancelled ${invoice.invoiceNo}`,
      account: 'INVENTORY',
      debit: invoice.cogs,
      credit: 0,
      referenceType: 'INVOICE',
      referenceId: invoice.id,
      referenceNo: invoice.invoiceNo,
      createdAt: nowIso,
    });

    data.ledgerEntries.push({
      id: `ledg_rev_cogs_${Date.now()}`,
      date: nowIso,
      description: `COGS reversal for Cancelled ${invoice.invoiceNo}`,
      account: 'COGS',
      debit: 0,
      credit: invoice.cogs,
      referenceType: 'INVOICE',
      referenceId: invoice.id,
      referenceNo: invoice.invoiceNo,
      createdAt: nowIso,
    });
  }

  invoice.paymentStatus = 'CANCELLED';
  invoice.cancelledAt = nowIso;
  invoice.cancelReason = reason;
  invoice.updatedAt = nowIso;

  db.persist();
  return invoice;
};
