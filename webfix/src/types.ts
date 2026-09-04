export type PaymentMethod = 'CASH' | 'QR' | 'CARD';
export type InvoiceStatus = 'PAID' | 'PARTIAL' | 'UNPAID' | 'CANCELLED';
export type QuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'EXPIRED' | 'CONVERTED' | 'CANCELLED';
export type MovementType = 'PURCHASE' | 'SALE' | 'RETURN' | 'ADJUSTMENT' | 'MANUAL_STOCK_IN' | 'MANUAL_STOCK_OUT';
export type PurchaseStatus = 'RECEIVED' | 'PENDING' | 'CANCELLED';
export type AccountType =
  | 'CASH'
  | 'BANK_QR'
  | 'CARD_CLEARING'
  | 'SALES'
  | 'DISCOUNTS'
  | 'INVENTORY'
  | 'COGS'
  | 'ACCOUNTS_RECEIVABLE'
  | 'ACCOUNTS_PAYABLE'
  | 'EXPENSES'
  | 'OTHER_INCOME';

export type ProductCategory =
  | 'Laptop'
  | 'Desktop'
  | 'CPU'
  | 'GPU'
  | 'RAM'
  | 'SSD'
  | 'HDD'
  | 'Motherboard'
  | 'PSU'
  | 'PC Case'
  | 'Monitor'
  | 'Keyboard'
  | 'Mouse'
  | 'Cable'
  | 'Adapter'
  | 'Printer'
  | 'CCTV'
  | 'Networking'
  | 'Software'
  | 'Accessories'
  | 'Services'
  | 'Other';

export type ExpenseCategory =
  | 'Rent'
  | 'Electricity'
  | 'Internet / Telecom'
  | 'Staff Salary'
  | 'Transport & Petrol'
  | 'Marketing & Advertising'
  | 'Software & Licenses'
  | 'Hardware Repair Tools'
  | 'Office Supplies'
  | 'Utilities'
  | 'Other Operating Expense'
  | 'Internet'
  | 'Salary'
  | 'Transport'
  | 'Advertising'
  | 'Software'
  | 'Repair'
  | 'Office'
  | 'Other';

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface User {
  id: string;
  userId: string; // e.g. "007"
  name: string;
  role: string;
  createdAt: string;
}

export interface BusinessSetting {
  id: string;
  businessName: string;
  registrationNo?: string;
  regNumber?: string;
  phone: string;
  email: string;
  website?: string;
  address: string;
  currency: string;
  currencySymbol?: string;
  timezone: string;
  dateFormat: string;
  invoicePrefix: string;
  quotationPrefix: string;
  purchasePrefix: string;
  depositPrefix?: string;
  invoiceFooter?: string;
  invoiceTerms?: string;
  warrantyTerms?: string;
  quotationTerms?: string;
  paymentInfo?: string;
  qrBankName: string;
  qrAccountNo: string;
  qrAccountHolder: string;
  duitNowQrUrl?: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  brand: string;
  category: ProductCategory;
  description: string;
  supplierId?: string;
  supplierName?: string;
  costPrice: number; // in MYR
  sellingPrice: number; // in MYR
  stockQuantity: number;
  minStock: number;
  unit: string;
  warranty: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  type: MovementType;
  quantity: number; // positive or negative
  beforeStock: number;
  afterStock: number;
  reason: string;
  reference?: string; // Invoice # or PO #
  user: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes?: string;
  creditLimit?: number;
  balance?: number; // Accounts Receivable
  outstandingBalance?: number;
  totalSpent: number;
  totalInvoices: number;
  createdAt: string;
}

export interface Supplier {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  notes?: string;
  paymentTerms?: string;
  totalPurchases: number;
  outstandingBalance?: number;
  outstandingPayable?: number;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discountType: 'NONE' | 'PERCENT' | 'FIXED';
  discountValue: number;
  discountAmount: number;
  subtotal: number;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discount: number;
  subtotal: number;
  warranty?: string;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  date: string;
  subtotal: number;
  discount: number;
  overallDiscountType?: 'NONE' | 'PERCENT' | 'FIXED';
  overallDiscountValue?: number;
  total: number;
  paidAmount: number;
  balanceDue: number;
  cogs: number;
  grossProfit: number;
  paymentMethod: PaymentMethod;
  paymentStatus: InvoiceStatus;
  notes?: string;
  cashReceived?: number;
  changeGiven?: number;
  items: InvoiceItem[];
  appliedDepositId?: string;
  appliedDepositAmount?: number;
  cancelledAt?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationItem {
  id: string;
  quotationId: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
}

export interface Quotation {
  id: string;
  quotationNo: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  date: string;
  expiryDate: string;
  subtotal: number;
  discount: number;
  total: number;
  status: QuotationStatus;
  notes?: string;
  terms?: string;
  items: QuotationItem[];
  convertedInvoiceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DepositPayment {
  id: string;
  depositId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  date: string;
}

export interface Deposit {
  id: string;
  depositNo: string;
  customerId: string;
  customerName: string;
  quotationId?: string;
  quotationNo?: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'OPEN' | 'PARTIAL' | 'APPLIED' | 'REFUNDED';
  appliedInvoiceId?: string;
  appliedInvoiceNo?: string;
  notes?: string;
  payments: DepositPayment[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  costPrice: number;
  subtotal: number;
}

export interface Purchase {
  id: string;
  purchaseNo: string;
  supplierId: string;
  supplierName: string;
  date: string;
  total: number;
  paidAmount: number;
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID';
  paymentMethod: PaymentMethod;
  status: PurchaseStatus;
  items: PurchaseItem[];
  notes?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  receiptNumber?: string;
  reference?: string;
  notes?: string;
  recordedBy?: string;
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  date?: string;
  accountCode?: string;
  accountName?: string;
  description: string;
  account?: AccountType;
  debit: number;
  credit: number;
  reference?: string;
  referenceType?: 'INVOICE' | 'PURCHASE' | 'EXPENSE' | 'DEPOSIT' | 'CLOSING' | 'MANUAL';
  referenceId?: string;
  referenceNo?: string;
  createdAt: string;
}

export interface DailyClosing {
  id: string;
  date?: string;
  businessDate?: string; // YYYY-MM-DD
  salesCount?: number;
  transactionsCount?: number;
  cashSales: number;
  qrSales: number;
  cardSales: number;
  totalSales?: number;
  totalDiscounts?: number;
  netSales?: number;
  totalCOGS?: number;
  cogs?: number;
  grossProfit: number;
  totalExpenses?: number;
  cashExpenses?: number;
  netProfit: number;
  openingCash?: number;
  expectedCash: number;
  actualCash?: number;
  actualCashCounted?: number;
  difference?: number;
  cashDifference?: number;
  notes?: string;
  closedAt: string;
  closedBy: string;
  isLocked?: boolean;
}

export interface DashboardStats {
  todaySales: number;
  todayTransactions: number;
  todayCash: number;
  todayQR: number;
  todayCard: number;
  todayDiscounts: number;
  todayCOGS: number;
  todayGrossProfit: number;
  todayExpenses: number;
  todayNetProfit: number;
  lowStockCount: number;
  outstandingCustomerBalance: number;
  outstandingDeposits: number;
  todaySalesChart: { time: string; sales: number }[];
  weekSalesChart: { day: string; sales: number }[];
  monthSalesChart: { date: string; sales: number }[];
  paymentMethodBreakdown: { name: string; value: number }[];
  topSellingProducts: { id: string; name: string; quantity: number; total: number }[];
  recentInvoices: Invoice[];
  lowStockProducts: Product[];
}

export interface PLStatement {
  revenue: number;
  salesDiscounts: number;
  netRevenue: number;
  cogs: number;
  grossProfit: number;
  expensesByCategory: Record<string, number>;
  totalExpenses: number;
  netProfit: number;
}

export interface InventoryValuationItem {
  productId: string;
  sku: string;
  name: string;
  category: string;
  stockQuantity: number;
  costPrice: number;
  totalCost: number;
  sellingPrice: number;
  totalSelling: number;
}

export interface InventoryValuation {
  totalQuantity: number;
  totalCostValue: number;
  totalSellingValue: number;
  potentialGrossProfit: number;
  items: InventoryValuationItem[];
}
