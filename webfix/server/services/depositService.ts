import { db } from '../db';
import { Deposit, DepositPayment, PaymentMethod } from '../../src/types';
import { roundMoney, toDecimal } from '../../src/lib/finance';

export interface CreateDepositPayload {
  customerId: string;
  quotationId?: string;
  totalAmount: number;
  initialPaymentAmount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export const createDeposit = (payload: CreateDepositPayload): Deposit => {
  const data = db.getRawData();
  const customer = data.customers.find((c) => c.id === payload.customerId);
  if (!customer) throw new Error('Customer not found.');

  const total = roundMoney(payload.totalAmount);
  const initialPaid = roundMoney(payload.initialPaymentAmount || 0);

  if (initialPaid > total) {
    throw new Error('Initial deposit payment cannot exceed total deposit amount.');
  }

  const prefix = 'DEP';
  const depositNo = db.getNextDepositNumber(prefix);
  const depositId = `dep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  let quotationNo: string | undefined = undefined;
  if (payload.quotationId) {
    const quote = data.quotations.find((q) => q.id === payload.quotationId);
    if (quote) quotationNo = quote.quotationNo;
  }

  const payments: DepositPayment[] = [];
  const nowIso = new Date().toISOString();

  if (initialPaid > 0) {
    const paymentId = `dpay_${Date.now()}_1`;
    payments.push({
      id: paymentId,
      depositId,
      amount: initialPaid,
      method: payload.paymentMethod,
      reference: depositNo,
      date: nowIso,
    });

    // Record Accounting Ledger for initial deposit cash inflow (Debit Cash/Bank, Credit Customer Deposit / Other Income)
    const acct =
      payload.paymentMethod === 'CASH'
        ? 'CASH'
        : payload.paymentMethod === 'QR'
        ? 'BANK_QR'
        : 'CARD_CLEARING';

    data.ledgerEntries.push({
      id: `ledg_dep_${Date.now()}`,
      date: nowIso,
      description: `Customer Deposit received (${depositNo}) from ${customer.name}`,
      account: acct,
      debit: initialPaid,
      credit: 0,
      referenceType: 'DEPOSIT',
      referenceId: depositId,
      referenceNo: depositNo,
      createdAt: nowIso,
    });

    data.ledgerEntries.push({
      id: `ledg_dep_liab_${Date.now()}`,
      date: nowIso,
      description: `Customer Deposit liability (${depositNo}) from ${customer.name}`,
      account: 'OTHER_INCOME',
      debit: 0,
      credit: initialPaid,
      referenceType: 'DEPOSIT',
      referenceId: depositId,
      referenceNo: depositNo,
      createdAt: nowIso,
    });
  }

  const remaining = roundMoney(toDecimal(total).minus(initialPaid));
  const status = remaining === 0 ? 'OPEN' : initialPaid > 0 ? 'PARTIAL' : 'OPEN';

  const deposit: Deposit = {
    id: depositId,
    depositNo,
    customerId: customer.id,
    customerName: customer.name,
    quotationId: payload.quotationId,
    quotationNo,
    totalAmount: total,
    paidAmount: initialPaid,
    remainingAmount: initialPaid, // available to apply
    status,
    notes: payload.notes,
    payments,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  data.deposits.unshift(deposit);
  db.persist();
  return deposit;
};

export const addDepositPayment = (
  depositId: string,
  amount: number,
  method: PaymentMethod,
  reference?: string
): Deposit => {
  const data = db.getRawData();
  const deposit = data.deposits.find((d) => d.id === depositId);
  if (!deposit) throw new Error('Deposit not found.');

  const paymentAmt = roundMoney(amount);
  if (paymentAmt <= 0) throw new Error('Payment amount must be greater than zero.');

  const nowIso = new Date().toISOString();
  deposit.payments.push({
    id: `dpay_${Date.now()}_${deposit.payments.length + 1}`,
    depositId: deposit.id,
    amount: paymentAmt,
    method,
    reference,
    date: nowIso,
  });

  deposit.paidAmount = roundMoney(toDecimal(deposit.paidAmount).plus(paymentAmt));
  deposit.remainingAmount = roundMoney(toDecimal(deposit.remainingAmount).plus(paymentAmt));
  deposit.status = 'OPEN';
  deposit.updatedAt = nowIso;

  // Accounting Ledger
  const acct = method === 'CASH' ? 'CASH' : method === 'QR' ? 'BANK_QR' : 'CARD_CLEARING';
  data.ledgerEntries.push({
    id: `ledg_dep_add_${Date.now()}`,
    date: nowIso,
    description: `Additional Deposit Payment (${deposit.depositNo}) from ${deposit.customerName}`,
    account: acct,
    debit: paymentAmt,
    credit: 0,
    referenceType: 'DEPOSIT',
    referenceId: deposit.id,
    referenceNo: deposit.depositNo,
    createdAt: nowIso,
  });

  data.ledgerEntries.push({
    id: `ledg_dep_add_cr_${Date.now()}`,
    date: nowIso,
    description: `Additional Customer Deposit liability (${deposit.depositNo})`,
    account: 'OTHER_INCOME',
    debit: 0,
    credit: paymentAmt,
    referenceType: 'DEPOSIT',
    referenceId: deposit.id,
    referenceNo: deposit.depositNo,
    createdAt: nowIso,
  });

  db.persist();
  return deposit;
};
