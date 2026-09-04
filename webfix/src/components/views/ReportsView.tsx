import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { formatMYR, formatDateKL } from '../../lib/finance';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Layers,
  DollarSign,
  TrendingUp,
  Package,
  Users,
  Building2,
  Receipt,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const [reportType, setReportType] = useState<
    'sales_summary' | 'inventory_valuation' | 'expenses_summary' | 'customer_balances' | 'supplier_balances'
  >('sales_summary');

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      if (reportType === 'sales_summary') {
        const res = await apiFetch<{ invoices: any[] }>('/api/invoices?status=PAID');
        setReportData(res.invoices || []);
      } else if (reportType === 'inventory_valuation') {
        const res = await apiFetch<{ valuation: any }>('/api/accounting/inventory-valuation');
        setReportData(res.valuation || null);
      } else if (reportType === 'expenses_summary') {
        const res = await apiFetch<{ expenses: any[] }>('/api/expenses');
        setReportData(res.expenses || []);
      } else if (reportType === 'customer_balances') {
        const res = await apiFetch<{ customers: any[] }>('/api/customers');
        setReportData(res.customers || []);
      } else if (reportType === 'supplier_balances') {
        const res = await apiFetch<{ suppliers: any[] }>('/api/suppliers');
        setReportData(res.suppliers || []);
      }
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType]);

  const handleExportCSV = () => {
    if (!reportData) return;
    let headers: string[] = [];
    let rows: any[][] = [];

    if (reportType === 'sales_summary') {
      headers = ['Invoice No', 'Date', 'Customer', 'Gross', 'Discount', 'Total', 'Payment Method'];
      rows = reportData.map((r: any) => [
        r.invoiceNo,
        formatDateKL(r.date, 'yyyy-MM-dd HH:mm'),
        r.customerName,
        r.subtotal,
        r.discount,
        r.total,
        r.paymentMethod,
      ]);
    } else if (reportType === 'inventory_valuation') {
      headers = ['SKU', 'Product Name', 'Category', 'Quantity', 'Cost Price', 'Total Cost', 'Selling Price', 'Total Selling'];
      rows = (reportData.items || []).map((it: any) => [
        it.sku,
        it.name,
        it.category,
        it.stockQuantity,
        it.costPrice,
        it.totalCost,
        it.sellingPrice,
        it.totalSelling,
      ]);
    } else if (reportType === 'expenses_summary') {
      headers = ['Date', 'Category', 'Description', 'Receipt No', 'Amount', 'Payment Method'];
      rows = reportData.map((e: any) => [
        formatDateKL(e.date, 'yyyy-MM-dd HH:mm'),
        e.category,
        e.description,
        e.receiptNumber || '-',
        e.amount,
        e.paymentMethod,
      ]);
    } else if (reportType === 'customer_balances') {
      headers = ['Customer Name', 'Phone', 'Email', 'Lifetime Spent', 'Outstanding Balance'];
      rows = reportData.map((c: any) => [
        c.name,
        c.phone,
        c.email,
        c.totalSpent,
        c.outstandingBalance,
      ]);
    } else if (reportType === 'supplier_balances') {
      headers = ['Supplier Company', 'Contact Person', 'Phone', 'Total Purchases', 'Outstanding Payable'];
      rows = reportData.map((s: any) => [
        s.companyName,
        s.contactPerson,
        s.phone,
        s.totalPurchases,
        s.outstandingBalance,
      ]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `peace_tech_report_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Analytics & Business Reports</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Export official audit statements, stock valuation sheets, and customer ledgers
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportCSV}
          disabled={!reportData}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50 cursor-pointer"
        >
          <Download className="w-4 h-4" /> Download Clean CSV
        </button>
      </div>

      {/* Report Selector Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { id: 'sales_summary', label: 'Sales Transactions', icon: DollarSign },
          { id: 'inventory_valuation', label: 'Inventory Valuation', icon: Package },
          { id: 'expenses_summary', label: 'Operating Expenses', icon: Receipt },
          { id: 'customer_balances', label: 'Customer Balances', icon: Users },
          { id: 'supplier_balances', label: 'Supplier Payables', icon: Building2 },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = reportType === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setReportType(item.id as any)}
              className={`p-3.5 rounded-xl border flex flex-col items-center text-center gap-2 transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-bold">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Report Table Preview */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Live Data Preview ({reportType.replace('_', ' ')})
        </h3>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Compiling report data...</div>
        ) : !reportData ? (
          <div className="py-12 text-center text-xs text-slate-400">No data generated.</div>
        ) : (
          <div className="overflow-x-auto max-h-[60vh]">
            <pre className="text-[11px] font-mono bg-slate-900 text-slate-200 p-4 rounded-lg overflow-x-auto leading-relaxed">
              {JSON.stringify(reportData, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
