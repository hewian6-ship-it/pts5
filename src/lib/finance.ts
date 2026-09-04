import { Decimal } from 'decimal.js';
import { format, parseISO } from 'date-fns';

// Configure Decimal for financial precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export const toDecimal = (val: number | string | Decimal | undefined | null): Decimal => {
  if (val === undefined || val === null || val === '') return new Decimal(0);
  try {
    return new Decimal(val);
  } catch {
    return new Decimal(0);
  }
};

export const roundMoney = (val: number | string | Decimal): number => {
  return toDecimal(val).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
};

export const formatMYR = (amount: number | string | Decimal | undefined | null): string => {
  const num = roundMoney(amount || 0);
  return 'RM ' + num.toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatDateKL = (dateInput: string | Date | undefined | null, formatStr: string = 'dd/MM/yyyy'): string => {
  if (!dateInput) return '-';
  try {
    const d = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    return format(d, formatStr);
  } catch {
    return String(dateInput);
  }
};

export const calculateItemDiscount = (
  unitPrice: number,
  quantity: number,
  discountType: 'NONE' | 'PERCENT' | 'FIXED',
  discountValue: number
): { discountAmount: number; subtotal: number } => {
  const price = toDecimal(unitPrice);
  const qty = toDecimal(quantity);
  const gross = price.mul(qty);

  let discount = new Decimal(0);
  if (discountType === 'PERCENT') {
    const pct = toDecimal(discountValue).dividedBy(100);
    discount = gross.mul(pct);
  } else if (discountType === 'FIXED') {
    discount = toDecimal(discountValue);
  }

  // Discount cannot exceed gross
  if (discount.gt(gross)) {
    discount = gross;
  }
  if (discount.lt(0)) {
    discount = new Decimal(0);
  }

  const subtotal = gross.minus(discount);
  return {
    discountAmount: roundMoney(discount),
    subtotal: roundMoney(subtotal),
  };
};

export const calculateOverallDiscount = (
  subtotal: number,
  discountType: 'NONE' | 'PERCENT' | 'FIXED',
  discountValue: number
): number => {
  const gross = toDecimal(subtotal);
  let discount = new Decimal(0);

  if (discountType === 'PERCENT') {
    discount = gross.mul(toDecimal(discountValue).dividedBy(100));
  } else if (discountType === 'FIXED') {
    discount = toDecimal(discountValue);
  }

  if (discount.gt(gross)) {
    discount = gross;
  }
  if (discount.lt(0)) {
    discount = new Decimal(0);
  }

  return roundMoney(discount);
};
