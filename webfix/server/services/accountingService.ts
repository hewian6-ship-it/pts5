import { db } from '../db';
import {
  DashboardStats,
  LedgerEntry,
  AccountType,
} from '../../src/types';
import { roundMoney, toDecimal } from '../../src/lib/finance';
import { Decimal } from 'decimal.js';

export const getDashboardStats = (): DashboardStats => {
  const data = db.getRawData();
  const todayStr = new Date().toISOString().split('T')[0];

  const todayInvoices = data.invoices.filter((inv) => {
    return inv.date.startsWith(todayStr) && inv.paymentStatus !== 'CANCELLED';
  });

  const todayExpenses = data.expenses.filter((exp) => exp.date.startsWith(todayStr));

  let todaySales = new Decimal(0);
  let todayCash = new Decimal(0);
  let todayQR = new Decimal(0);
  let todayCard = new Decimal(0);
  let todayDiscounts = new Decimal(0);
  let todayCOGS = new Decimal(0);
  let todayGrossProfit = new Decimal(0);

  for (const inv of todayInvoices) {
    todaySales = todaySales.plus(inv.total);
    todayDiscounts = todayDiscounts.plus(inv.discount);
    todayCOGS = todayCOGS.plus(inv.cogs);
    todayGrossProfit = todayGrossProfit.plus(inv.grossProfit);

    if (inv.paymentMethod === 'CASH') todayCash = todayCash.plus(inv.paidAmount);
    else if (inv.paymentMethod === 'QR') todayQR = todayQR.plus(inv.paidAmount);
    else if (inv.paymentMethod === 'CARD') todayCard = todayCard.plus(inv.paidAmount);
  }

  let totalTodayExpenses = new Decimal(0);
  for (const exp of todayExpenses) {
    totalTodayExpenses = totalTodayExpenses.plus(exp.amount);
  }

  const todayNetProfit = todayGrossProfit.minus(totalTodayExpenses);

  // Low stock products
  const lowStockProducts = data.products.filter(
    (p) => p.category !== 'Services' && p.stockQuantity <= p.minStock
  );

  // Outstanding Customer Balances (Accounts Receivable)
  let outstandingCustomerBalance = new Decimal(0);
  for (const c of data.customers) {
    outstandingCustomerBalance = outstandingCustomerBalance.plus(c.balance || 0);
  }

  // Outstanding Deposits
  let outstandingDeposits = new Decimal(0);
  for (const d of data.deposits) {
    if (d.status === 'OPEN' || d.status === 'PARTIAL') {
      outstandingDeposits = outstandingDeposits.plus(d.remainingAmount || 0);
    }
  }

  // Today Sales by Hour Chart
  const hoursMap: { [hour: string]: number } = {
    '10 AM': 0,
    '12 PM': 0,
    '02 PM': 0,
    '04 PM': 0,
    '06 PM': 0,
    '08 PM': 0,
  };

  for (const inv of todayInvoices) {
    const hourNum = new Date(inv.date).getHours();
    let slot = '10 AM';
    if (hourNum >= 20) slot = '08 PM';
    else if (hourNum >= 18) slot = '06 PM';
    else if (hourNum >= 16) slot = '04 PM';
    else if (hourNum >= 14) slot = '02 PM';
    else if (hourNum >= 12) slot = '12 PM';
    hoursMap[slot] = (hoursMap[slot] || 0) + inv.total;
  }

  const todaySalesChart = Object.keys(hoursMap).map((k) => ({
    time: k,
    sales: roundMoney(hoursMap[k]),
  }));

  // Week Sales Chart (Last 7 Days)
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekSalesMap: { [day: string]: number } = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayName = daysOfWeek[d.getDay()];
    weekSalesMap[dayName] = 0;
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  for (const inv of data.invoices) {
    if (inv.paymentStatus === 'CANCELLED') continue;
    const invDate = new Date(inv.date);
    if (invDate >= sevenDaysAgo) {
      const dayName = daysOfWeek[invDate.getDay()];
      if (weekSalesMap[dayName] !== undefined) {
        weekSalesMap[dayName] += inv.total;
      }
    }
  }

  const weekSalesChart = Object.keys(weekSalesMap).map((d) => ({
    day: d,
    sales: roundMoney(weekSalesMap[d]),
  }));

  // Month Sales Chart (Weeks / Days of current month)
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthSalesMap: { [dateStr: string]: number } = {};

  for (let d = 1; d <= 28; d += 4) {
    const label = `${d}/${currentMonth + 1}`;
    monthSalesMap[label] = 0;
  }

  for (const inv of data.invoices) {
    if (inv.paymentStatus === 'CANCELLED') continue;
    const invDate = new Date(inv.date);
    if (invDate.getFullYear() === currentYear && invDate.getMonth() === currentMonth) {
      const dayNum = invDate.getDate();
      let label = '1/' + (currentMonth + 1);
      if (dayNum >= 25) label = '25/' + (currentMonth + 1);
      else if (dayNum >= 21) label = '21/' + (currentMonth + 1);
      else if (dayNum >= 17) label = '17/' + (currentMonth + 1);
      else if (dayNum >= 13) label = '13/' + (currentMonth + 1);
      else if (dayNum >= 9) label = '9/' + (currentMonth + 1);
      else if (dayNum >= 5) label = '5/' + (currentMonth + 1);
      monthSalesMap[label] = (monthSalesMap[label] || 0) + inv.total;
    }
  }

  const monthSalesChart = Object.keys(monthSalesMap).map((k) => ({
    date: k,
    sales: roundMoney(monthSalesMap[k]),
  }));

  // Payment Breakdown
  const paymentMethodBreakdown = [
    { name: 'Cash', value: roundMoney(todayCash) },
    { name: 'QR (DuitNow)', value: roundMoney(todayQR) },
    { name: 'Card', value: roundMoney(todayCard) },
  ];

  // Top Selling Products
  const productSalesMap: { [id: string]: { name: string; quantity: number; total: number } } = {};
  for (const inv of data.invoices) {
    if (inv.paymentStatus === 'CANCELLED') continue;
    for (const item of inv.items) {
      if (!productSalesMap[item.productId]) {
        productSalesMap[item.productId] = {
          name: item.productName,
          quantity: 0,
          total: 0,
        };
      }
      productSalesMap[item.productId].quantity += item.quantity;
      productSalesMap[item.productId].total += item.subtotal;
    }
  }

  const topSellingProducts = Object.keys(productSalesMap)
    .map((id) => ({
      id,
      name: productSalesMap[id].name,
      quantity: productSalesMap[id].quantity,
      total: roundMoney(productSalesMap[id].total),
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 6);

  return {
    todaySales: roundMoney(todaySales),
    todayTransactions: todayInvoices.length,
    todayCash: roundMoney(todayCash),
    todayQR: roundMoney(todayQR),
    todayCard: roundMoney(todayCard),
    todayDiscounts: roundMoney(todayDiscounts),
    todayCOGS: roundMoney(todayCOGS),
    todayGrossProfit: roundMoney(todayGrossProfit),
    todayExpenses: roundMoney(totalTodayExpenses),
    todayNetProfit: roundMoney(todayNetProfit),
    lowStockCount: lowStockProducts.length,
    outstandingCustomerBalance: roundMoney(outstandingCustomerBalance),
    outstandingDeposits: roundMoney(outstandingDeposits),
    todaySalesChart,
    weekSalesChart,
    monthSalesChart,
    paymentMethodBreakdown,
    topSellingProducts,
    recentInvoices: data.invoices.slice(0, 5),
    lowStockProducts: lowStockProducts.slice(0, 8),
  };
};

export const getProfitAndLoss = (startDate?: string, endDate?: string) => {
  const data = db.getRawData();

  const invoices = data.invoices.filter((inv) => {
    if (inv.paymentStatus === 'CANCELLED') return false;
    const d = inv.date.split('T')[0];
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  });

  const expenses = data.expenses.filter((exp) => {
    const d = exp.date.split('T')[0];
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  });

  let grossSales = new Decimal(0);
  let totalDiscounts = new Decimal(0);
  let cogs = new Decimal(0);

  for (const inv of invoices) {
    grossSales = grossSales.plus(toDecimal(inv.subtotal));
    totalDiscounts = totalDiscounts.plus(toDecimal(inv.discount));
    cogs = cogs.plus(toDecimal(inv.cogs));
  }

  const netSales = grossSales.minus(totalDiscounts);
  const grossProfit = netSales.minus(cogs);

  const expenseBreakdown: { [cat: string]: number } = {};
  let totalExpenses = new Decimal(0);

  for (const exp of expenses) {
    expenseBreakdown[exp.category] = (expenseBreakdown[exp.category] || 0) + exp.amount;
    totalExpenses = totalExpenses.plus(exp.amount);
  }

  const netProfit = grossProfit.minus(totalExpenses);

  return {
    period: {
      startDate: startDate || 'Beginning',
      endDate: endDate || 'Current Date',
    },
    grossSales: roundMoney(grossSales),
    totalDiscounts: roundMoney(totalDiscounts),
    netSales: roundMoney(netSales),
    cogs: roundMoney(cogs),
    grossProfit: roundMoney(grossProfit),
    expenses: Object.keys(expenseBreakdown).map((k) => ({
      category: k,
      amount: roundMoney(expenseBreakdown[k]),
    })),
    totalExpenses: roundMoney(totalExpenses),
    netProfit: roundMoney(netProfit),
  };
};

export const getInventoryValuation = () => {
  const data = db.getRawData();
  let totalItems = 0;
  let totalCostValue = new Decimal(0);
  let totalSellingValue = new Decimal(0);

  const categoryBreakdown: { [cat: string]: { stock: number; costVal: number; sellVal: number } } = {};

  for (const prod of data.products) {
    if (prod.category === 'Services') continue;
    const qty = prod.stockQuantity || 0;
    totalItems += qty;

    const costVal = toDecimal(prod.costPrice).mul(qty);
    const sellVal = toDecimal(prod.sellingPrice).mul(qty);

    totalCostValue = totalCostValue.plus(costVal);
    totalSellingValue = totalSellingValue.plus(sellVal);

    if (!categoryBreakdown[prod.category]) {
      categoryBreakdown[prod.category] = { stock: 0, costVal: 0, sellVal: 0 };
    }
    categoryBreakdown[prod.category].stock += qty;
    categoryBreakdown[prod.category].costVal += costVal.toNumber();
    categoryBreakdown[prod.category].sellVal += sellVal.toNumber();
  }

  const potentialProfit = totalSellingValue.minus(totalCostValue);

  return {
    totalProductCount: data.products.length,
    totalPhysicalUnits: totalItems,
    totalCostValue: roundMoney(totalCostValue),
    totalSellingValue: roundMoney(totalSellingValue),
    potentialProfit: roundMoney(potentialProfit),
    categoryBreakdown: Object.keys(categoryBreakdown).map((cat) => ({
      category: cat,
      stockCount: categoryBreakdown[cat].stock,
      costValue: roundMoney(categoryBreakdown[cat].costVal),
      sellingValue: roundMoney(categoryBreakdown[cat].sellVal),
      profit: roundMoney(categoryBreakdown[cat].sellVal - categoryBreakdown[cat].costVal),
    })),
  };
};
