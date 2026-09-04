import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { formatMYR, formatDateKL } from '../../lib/finance';
import { LedgerEntry, PLStatement, InventoryValuation } from '../../types';
import {
  Layers,
  BookOpen,
  DollarSign,
  TrendingUp,
  Package,
  Users,
  Building2,
  Download,
  Calendar,
  Filter,
} from 'lucide-react';

export const AccountingView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'GL' | 'PL' | 'VALUATION' | 'AR' | 'AP'>('PL');
  const [loading, setLoading] = useState(true);

  // Data States
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [plStatement, setPlStatement] = useState<PLStatement | null>(null);
  const [valuation, setValuation] = useState<InventoryValuation | null>(null);
  const [arList, setArList] = useState<{ invoiceNo: string; customerName: string; total: string; paidAmount: string; balanceDue: string }[]>([]);
  const [apList, setApList] = useState<{ purchaseNo: string; supplierName: string; total: string; paidAmount: string; balanceDue: string }[]>([]);

  // P&L Date Range
  const [plStartDate, setPlStartDate] = useState('');
  const [plEndDate, setPlEndDate] = useState('');

  const fetchAccountingData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (plStartDate) params.set('startDate', plStartDate);
      if (plEndDate) params.set('endDate', plEndDate);

      const [glRes, plRes, valRes, arRes, apRes] = await Promise.all([
        apiFetch<{ entries: LedgerEntry[] }>('/api/accounting/ledger'),
        apiFetch<{ pl: PLStatement }>(`/api/accounting/pl?${params.toString()}`),
        apiFetch<{ valuation: InventoryValuation }>('/api/accounting/inventory-valuation'),
        apiFetch<{ ar: any[] }>('/api/accounting/ar'),
        apiFetch<{ ap: any[] }>('/api/accounting/ap'),
      ]);

      setLedgerEntries(glRes.entries || []);
      setPlStatement(plRes.pl || null);
      setValuation(valRes.valuation || null);
      setArList(arRes.ar || []);
      setApList(apRes.ap || []);
    } catch (err) {
      console.error('Failed to load accounting data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountingData();
  }, [plStartDate, plEndDate]);

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Double-Entry Financial Accounting</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-grade double-entry general ledger, realtime P&L, inventory asset valuation, A/R and A/P
          </p>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 pt-2 rounded-t-xl overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('PL')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'PL'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Profit & Loss Statement (P&L)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('GL')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'GL'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          General Ledger (Audit Trail)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('VALUATION')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'VALUATION'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Inventory Asset Valuation
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('AR')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'AR'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Accounts Receivable ({arList.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('AP')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'AP'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Accounts Payable ({apList.length})
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading financial statements...</div>
      ) : (
        <>
          {/* TAB 1: PROFIT & LOSS */}
          {activeTab === 'PL' && plStatement && (
            <div className="space-y-5">
              {/* Date Filter */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Financial Reporting Period</span>
                <div className="flex items-center gap-2 text-xs">
                  <input
                    type="date"
                    value={plStartDate}
                    onChange={(e) => setPlStartDate(e.target.value)}
                    className="p-1.5 border border-slate-300 rounded-lg text-slate-800"
                  />
                  <span className="text-slate-400">to</span>
                  <input
                    type="date"
                    value={plEndDate}
                    onChange={(e) => setPlEndDate(e.target.value)}
                    className="p-1.5 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              {/* Statement Sheet */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 max-w-3xl mx-auto space-y-6">
                <div className="text-center border-b pb-4">
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                    Statement of Profit and Loss
                  </h2>
                  <p className="text-xs text-slate-500">Peace Tech Solution (SSM: 202401009876-X)</p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    For the period ended {formatDateKL(new Date().toISOString(), 'dd MMMM yyyy')}
                  </p>
                </div>

                {/* Operating Revenue Section */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between font-bold text-slate-900 pb-1 border-b">
                    <span>OPERATING REVENUE</span>
                    <span>MYR</span>
                  </div>
                  <div className="flex justify-between text-slate-600 pl-4">
                    <span>Gross Sales Revenue (Hardware & IT Services)</span>
                    <span className="font-mono">{formatMYR(plStatement.revenue)}</span>
                  </div>
                  <div className="flex justify-between text-rose-600 pl-4">
                    <span>Less: Sales Discounts & Allowances</span>
                    <span className="font-mono">-{formatMYR(plStatement.salesDiscounts)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 pt-1 border-t pl-4">
                    <span>Net Sales Revenue</span>
                    <span className="font-mono">{formatMYR(plStatement.netRevenue)}</span>
                  </div>
                </div>

                {/* Cost of Goods Sold */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between font-bold text-slate-900 pb-1 border-b">
                    <span>COST OF GOODS SOLD (COGS)</span>
                    <span>MYR</span>
                  </div>
                  <div className="flex justify-between text-slate-600 pl-4">
                    <span>Cost of Hardware Sold</span>
                    <span className="font-mono text-rose-600">-{formatMYR(plStatement.cogs)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-700 pt-1 border-t pl-4 text-sm bg-emerald-50/50 p-2 rounded">
                    <span>GROSS OPERATING PROFIT</span>
                    <span className="font-mono font-black">{formatMYR(plStatement.grossProfit)}</span>
                  </div>
                </div>

                {/* Operating Expenses */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between font-bold text-slate-900 pb-1 border-b">
                    <span>OPERATING EXPENSES (OPEX)</span>
                    <span>MYR</span>
                  </div>
                  {Object.entries(plStatement.expensesByCategory).map(([cat, amt]) => (
                    <div key={cat} className="flex justify-between text-slate-600 pl-4">
                      <span>{cat}</span>
                      <span className="font-mono">-{formatMYR(amt as number)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-rose-700 pt-1 border-t pl-4">
                    <span>Total Operating Expenses</span>
                    <span className="font-mono">-{formatMYR(plStatement.totalExpenses)}</span>
                  </div>
                </div>

                {/* Net Bottom Line */}
                <div className="p-4 bg-slate-900 text-white rounded-xl flex justify-between items-baseline">
                  <div>
                    <span className="text-xs uppercase font-bold text-slate-400">NET OPERATING PROFIT (EBIT)</span>
                    <p className="text-[10px] text-slate-400">Net bottom line for selected period</p>
                  </div>
                  <span className="text-2xl font-black font-mono text-emerald-400">
                    {formatMYR(plStatement.netProfit)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GENERAL LEDGER */}
          {activeTab === 'GL' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase font-bold tracking-wider">
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Account Code</th>
                      <th className="py-3 px-4">Account Name</th>
                      <th className="py-3 px-4">Description & Ref</th>
                      <th className="py-3 px-4 text-right">Debit (RM)</th>
                      <th className="py-3 px-4 text-right">Credit (RM)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ledgerEntries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-slate-400">
                          No ledger entries found.
                        </td>
                      </tr>
                    ) : (
                      ledgerEntries.map((le) => (
                        <tr key={le.id} className="hover:bg-slate-50 font-mono">
                          <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                            {formatDateKL(le.createdAt, 'dd/MM/yyyy HH:mm')}
                          </td>
                          <td className="py-2.5 px-4 font-bold text-slate-900">{le.accountCode}</td>
                          <td className="py-2.5 px-4 font-sans font-semibold text-slate-800">
                            {le.accountName}
                          </td>
                          <td className="py-2.5 px-4 font-sans text-slate-600 text-[11px]">
                            {le.description} {le.reference && <span className="font-mono text-slate-400">({le.reference})</span>}
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-indigo-700">
                            {le.debit > 0 ? formatMYR(le.debit) : '-'}
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                            {le.credit > 0 ? formatMYR(le.credit) : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: INVENTORY VALUATION */}
          {activeTab === 'VALUATION' && valuation && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Hardware Stock Count</span>
                  <h3 className="text-2xl font-black text-slate-900 font-mono mt-1">
                    {valuation.totalQuantity} Units
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1">{valuation.items.length} Unique Hardware SKUs</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Total Inventory Asset (Cost)</span>
                  <h3 className="text-2xl font-black text-indigo-700 font-mono mt-1">
                    {formatMYR(valuation.totalCostValue)}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1">Current Balance Sheet Asset</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Total Retail Value (Sales)</span>
                  <h3 className="text-2xl font-black text-slate-900 font-mono mt-1">
                    {formatMYR(valuation.totalSellingValue)}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1">At standard list prices</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Unrealized Gross Margin</span>
                  <h3 className="text-2xl font-black text-emerald-600 font-mono mt-1">
                    {formatMYR(valuation.potentialGrossProfit)}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1">Locked in inventory</p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase font-bold tracking-wider">
                        <th className="py-3 px-4">Hardware SKU & Name</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4 text-center">In Stock</th>
                        <th className="py-3 px-4 text-right">Unit Cost</th>
                        <th className="py-3 px-4 text-right">Total Cost Asset</th>
                        <th className="py-3 px-4 text-right">Unit Selling</th>
                        <th className="py-3 px-4 text-right">Potential Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {valuation.items.map((it) => (
                        <tr key={it.productId} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4">
                            <p className="font-bold text-slate-900">{it.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{it.sku}</p>
                          </td>
                          <td className="py-2.5 px-4 text-slate-600">{it.category}</td>
                          <td className="py-2.5 px-4 text-center font-bold font-mono text-slate-900">
                            {it.stockQuantity}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                            {formatMYR(it.costPrice)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-indigo-700">
                            {formatMYR(it.totalCost)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                            {formatMYR(it.sellingPrice)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                            {formatMYR(it.totalSelling)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ACCOUNTS RECEIVABLE */}
          {activeTab === 'AR' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase font-bold tracking-wider">
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Customer Name</th>
                      <th className="py-3 px-4 text-right">Invoice Total</th>
                      <th className="py-3 px-4 text-right">Paid to Date</th>
                      <th className="py-3 px-4 text-right">Outstanding Balance Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {arList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-emerald-600 font-medium">
                          All customer invoices are fully settled. No outstanding receivables.
                        </td>
                      </tr>
                    ) : (
                      arList.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">{item.invoiceNo}</td>
                          <td className="py-3 px-4 font-semibold text-slate-800">{item.customerName}</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600">{formatMYR(item.total)}</td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-600">{formatMYR(item.paidAmount)}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">{formatMYR(item.balanceDue)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: ACCOUNTS PAYABLE */}
          {activeTab === 'AP' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase font-bold tracking-wider">
                      <th className="py-3 px-4">PO #</th>
                      <th className="py-3 px-4">Supplier Company</th>
                      <th className="py-3 px-4 text-right">PO Total</th>
                      <th className="py-3 px-4 text-right">Paid to Date</th>
                      <th className="py-3 px-4 text-right">Outstanding Payable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {apList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-emerald-600 font-medium">
                          All supplier purchase orders are fully settled. No outstanding payables.
                        </td>
                      </tr>
                    ) : (
                      apList.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">{item.purchaseNo}</td>
                          <td className="py-3 px-4 font-semibold text-slate-800">{item.supplierName}</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600">{formatMYR(item.total)}</td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-600">{formatMYR(item.paidAmount)}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">{formatMYR(item.balanceDue)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
