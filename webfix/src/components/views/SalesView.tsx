import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { formatMYR, formatDateKL } from '../../lib/finance';
import { Invoice } from '../../types';
import {
  TrendingUp,
  Download,
  Calendar,
  Search,
  DollarSign,
  Receipt,
  Percent,
  Banknote,
} from 'lucide-react';

export const SalesView: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom'>('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchSales = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('status', 'PAID');
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await apiFetch<{ invoices: Invoice[] }>(`/api/invoices?${params.toString()}`);
      setInvoices(res.invoices || []);
    } catch (err) {
      console.error('Failed to load sales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Quick period setter
    const now = new Date();
    if (period === 'today') {
      const todayStr = now.toISOString().slice(0, 10);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (period === 'yesterday') {
      const yest = new Date(now.getTime() - 86400000);
      const yestStr = yest.toISOString().slice(0, 10);
      setStartDate(yestStr);
      setEndDate(yestStr);
    } else if (period === 'this_week') {
      const day = now.getDay() || 7;
      const mon = new Date(now.getTime() - (day - 1) * 86400000);
      setStartDate(mon.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (period === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    }
  }, [period]);

  useEffect(() => {
    if (startDate && endDate) {
      fetchSales();
    }
  }, [startDate, endDate]);

  const totalGross = invoices.reduce((acc, inv) => acc + inv.subtotal, 0);
  const totalDiscounts = invoices.reduce((acc, inv) => acc + inv.discount, 0);
  const totalNet = invoices.reduce((acc, inv) => acc + inv.total, 0);

  const exportCSV = () => {
    const headers = ['Invoice No', 'Date', 'Customer', 'Items Count', 'Gross (RM)', 'Discount (RM)', 'Net Total (RM)', 'Payment Method'];
    const rows = invoices.map((inv) => [
      inv.invoiceNo,
      formatDateKL(inv.date, 'yyyy-MM-dd HH:mm'),
      inv.customerName,
      inv.items.length,
      inv.subtotal.toFixed(2),
      inv.discount.toFixed(2),
      inv.total.toFixed(2),
      inv.paymentMethod,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `peace_tech_sales_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Sales Transactions & Revenue</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-verified sales revenues, line discounts, and exportable financial sheets
          </p>
        </div>
        <button
          type="button"
          onClick={exportCSV}
          disabled={invoices.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50 cursor-pointer"
        >
          <Download className="w-4 h-4" /> Export CSV Report
        </button>
      </div>

      {/* Period Filter Buttons */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {(['today', 'yesterday', 'this_week', 'this_month', 'custom'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${
                period === p
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {p.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setPeriod('custom');
              setStartDate(e.target.value);
            }}
            className="p-1.5 border border-slate-300 rounded-lg text-slate-800"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setPeriod('custom');
              setEndDate(e.target.value);
            }}
            className="p-1.5 border border-slate-300 rounded-lg text-slate-800"
          />
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Sales</span>
          <h3 className="text-2xl font-black text-slate-900 font-mono mt-1">{formatMYR(totalGross)}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Undiscounted list prices</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Discounts Given</span>
          <h3 className="text-2xl font-black text-rose-600 font-mono mt-1">-{formatMYR(totalDiscounts)}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Item & invoice overall discounts</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Settled Sales</span>
          <h3 className="text-2xl font-black text-indigo-700 font-mono mt-1">{formatMYR(totalNet)}</h3>
          <p className="text-[10px] text-slate-400 mt-1">{invoices.length} Completed Invoices</p>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase font-bold tracking-wider">
                <th className="py-3 px-4">Invoice No</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 text-right">Gross</th>
                <th className="py-3 px-4 text-right">Discount</th>
                <th className="py-3 px-4 text-right">Net Total</th>
                <th className="py-3 px-4 text-center">Payment Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Loading sales records...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No sales recorded for this timeframe.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900 font-mono">{inv.invoiceNo}</td>
                    <td className="py-3 px-4 text-slate-600">{formatDateKL(inv.date, 'dd/MM/yyyy HH:mm')}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{inv.customerName}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">{formatMYR(inv.subtotal)}</td>
                    <td className="py-3 px-4 text-right font-mono text-rose-600">
                      {inv.discount > 0 ? `-${formatMYR(inv.discount)}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatMYR(inv.total)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {inv.paymentMethod}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
