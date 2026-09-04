import { db } from '../db';
import { DailyClosing } from '../../src/types';
import { roundMoney, toDecimal } from '../../src/lib/finance';
import { Decimal } from 'decimal.js';

export const getDailyClosingPreview = (dateStr?: string): DailyClosing => {
  const data = db.getRawData();
  const targetDate = dateStr || new Date().toISOString().split('T')[0];

  // Filter invoices for this date that are not cancelled
  const dayInvoices = data.invoices.filter((inv) => {
    const invDate = inv.date.split('T')[0];
    return invDate === targetDate && inv.paymentStatus !== 'CANCELLED';
  });

  // Filter expenses for this date
  const dayExpenses = data.expenses.filter((exp) => {
    const expDate = exp.date.split('T')[0];
    return expDate === targetDate;
  });

  let salesCount = dayInvoices.length;
  let cashSales = new Decimal(0);
  let qrSales = new Decimal(0);
  let cardSales = new Decimal(0);
  let totalDiscounts = new Decimal(0);
  let netSales = new Decimal(0);
  let totalCOGS = new Decimal(0);
  let grossProfit = new Decimal(0);

  for (const inv of dayInvoices) {
    totalDiscounts = totalDiscounts.plus(inv.discount);
    netSales = netSales.plus(inv.total);
    totalCOGS = totalCOGS.plus(inv.cogs);
    grossProfit = grossProfit.plus(inv.grossProfit);

    if (inv.paymentMethod === 'CASH') {
      cashSales = cashSales.plus(inv.paidAmount);
    } else if (inv.paymentMethod === 'QR') {
      qrSales = qrSales.plus(inv.paidAmount);
    } else if (inv.paymentMethod === 'CARD') {
      cardSales = cardSales.plus(inv.paidAmount);
    }
  }

  let totalExpenses = new Decimal(0);
  let cashExpenses = new Decimal(0);
  for (const exp of dayExpenses) {
    totalExpenses = totalExpenses.plus(exp.amount);
    if (exp.paymentMethod === 'CASH') {
      cashExpenses = cashExpenses.plus(exp.amount);
    }
  }

  const netProfit = grossProfit.minus(totalExpenses);
  const expectedCash = cashSales.minus(cashExpenses);

  // Check if an existing closed record already exists
  const existingClosing = data.dailyClosings.find((c) => c.businessDate === targetDate);

  if (existingClosing) {
    return existingClosing;
  }

  return {
    id: `close_preview_${targetDate}`,
    businessDate: targetDate,
    salesCount,
    cashSales: roundMoney(cashSales),
    qrSales: roundMoney(qrSales),
    cardSales: roundMoney(cardSales),
    totalSales: roundMoney(netSales),
    totalDiscounts: roundMoney(totalDiscounts),
    netSales: roundMoney(netSales),
    totalCOGS: roundMoney(totalCOGS),
    grossProfit: roundMoney(grossProfit),
    totalExpenses: roundMoney(totalExpenses),
    netProfit: roundMoney(netProfit),
    expectedCash: roundMoney(expectedCash),
    actualCashCounted: undefined,
    cashDifference: undefined,
    closedAt: '',
    closedBy: '',
    isLocked: false,
  };
};

export const closeBusinessDay = (
  businessDate: string,
  actualCashCounted: number,
  notes: string,
  user: string
): DailyClosing => {
  const data = db.getRawData();
  const dateStr = businessDate || new Date().toISOString().split('T')[0];

  // Prevent duplicate closing
  const existing = data.dailyClosings.find((c) => c.businessDate === dateStr && c.isLocked);
  if (existing) {
    throw new Error(`Business day for ${dateStr} has already been closed and locked.`);
  }

  const preview = getDailyClosingPreview(dateStr);
  const cashCounted = roundMoney(actualCashCounted !== undefined ? actualCashCounted : preview.expectedCash);
  const cashDifference = roundMoney(toDecimal(cashCounted).minus(preview.expectedCash));

  const nowIso = new Date().toISOString();
  const closingRecord: DailyClosing = {
    id: `closing_${dateStr}`,
    businessDate: dateStr,
    salesCount: preview.salesCount,
    cashSales: preview.cashSales,
    qrSales: preview.qrSales,
    cardSales: preview.cardSales,
    totalSales: preview.totalSales || preview.netSales,
    totalDiscounts: preview.totalDiscounts,
    netSales: preview.netSales,
    totalCOGS: preview.totalCOGS,
    grossProfit: preview.grossProfit,
    totalExpenses: preview.totalExpenses,
    netProfit: preview.netProfit,
    expectedCash: preview.expectedCash,
    actualCashCounted: cashCounted,
    cashDifference: cashDifference,
    notes: notes || 'Daily shift end business closing.',
    closedAt: nowIso,
    closedBy: user || '007',
    isLocked: true,
  };

  // Remove any draft preview and add locked closing
  data.dailyClosings = data.dailyClosings.filter((c) => c.businessDate !== dateStr);
  data.dailyClosings.unshift(closingRecord);

  // Accounting entry for daily closing record
  data.ledgerEntries.push({
    id: `ledg_close_${dateStr}`,
    date: nowIso,
    description: `Daily Business Closing (${dateStr}) - Net Sales: RM ${preview.netSales.toFixed(2)}, Net Profit: RM ${preview.netProfit.toFixed(2)}`,
    account: 'SALES',
    debit: 0,
    credit: 0,
    referenceType: 'CLOSING',
    referenceId: closingRecord.id,
    referenceNo: `CLOSE-${dateStr}`,
    createdAt: nowIso,
  });

  db.persist();
  return closingRecord;
};
