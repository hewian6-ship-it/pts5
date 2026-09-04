import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { formatMYR, formatDateKL } from '../../lib/finance';
import { Invoice, BusinessSetting } from '../../types';
import {
  Search,
  Printer,
  Ban,
  Filter,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  Download,
  Calendar,
  RotateCcw,
} from 'lucide-react';
import { InvoicePrintModal } from '../modals/InvoicePrintModal';

interface InvoicesViewProps {
  settings: BusinessSetting | null;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({ settings }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Invoice for Print / Preview
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [cancellingInvoice, setCancellingInvoice] = useState<Invoice | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (methodFilter !== 'ALL') params.set('paymentMethod', methodFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await apiFetch<{ invoices: Invoice[] }>(`/api/invoices?${params.toString()}`);
      setInvoices(res.invoices || []);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter, methodFilter, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInvoices();
  };

  const handleCancelInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingInvoice) return;
    setIsCancelling(true);
    try {
      await apiFetch(`/api/invoices/${cancellingInvoice.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: cancelReason || 'Customer Void Request' }),
      });
      setCancellingInvoice(null);
      setCancelReason('');
      fetchInvoices();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel invoice.');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Invoices & Billing History</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-grade invoice records, payments, and stock transaction logs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchInvoices()}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
            title="Refresh Invoices"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice number, customer name, or phone..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 px-3 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden"
            >
              <option value="ALL">All Statuses</option>
              <option value="PAID">Paid</option>
              <option value="PARTIAL">Partial</option>
              <option value="UNPAID">Unpaid</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="py-2 px-3 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden"
            >
              <option value="ALL">All Payment Methods</option>
              <option value="CASH">Cash</option>
              <option value="QR">DuitNow QR</option>
              <option value="CARD">Card</option>
            </select>

            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700"
              title="Start Date"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700"
              title="End Date"
            />

            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* Invoices Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase font-bold tracking-wider">
                <th className="py-3 px-4">Invoice No</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Items Count</th>
                <th className="py-3 px-4 text-right">Gross Subtotal</th>
                <th className="py-3 px-4 text-right">Discount</th>
                <th className="py-3 px-4 text-right">Net Total</th>
                <th className="py-3 px-4 text-center">Payment</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400">
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400">
                    No invoices found matching current criteria.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const isCancelled = inv.paymentStatus === 'CANCELLED';
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                        {inv.invoiceNo}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {formatDateKL(inv.date, 'dd/MM/yyyy HH:mm')}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{inv.customerName}</p>
                        {inv.customerPhone && inv.customerPhone !== '-' && (
                          <p className="text-[10px] text-slate-400">{inv.customerPhone}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {inv.items.length} {inv.items.length === 1 ? 'item' : 'items'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        {formatMYR(inv.subtotal)}
                      </td>
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
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.paymentStatus === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : inv.paymentStatus === 'PARTIAL'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : isCancelled
                              ? 'bg-slate-100 text-slate-500 line-through'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {inv.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedInvoice(inv)}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View / Print Tax Invoice"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {!isCancelled && (
                            <button
                              type="button"
                              onClick={() => setCancellingInvoice(inv)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Cancel / Void Invoice"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CANCEL INVOICE CONFIRMATION MODAL */}
      {cancellingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 p-5 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-3 text-rose-600">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <h3 className="text-sm font-bold">Void / Cancel Invoice {cancellingInvoice.invoiceNo}</h3>
              </div>
              <button type="button" onClick={() => setCancellingInvoice(null)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 space-y-1">
              <p className="font-bold">This operation will automatically:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                <li>Restore physical inventory stock for all items on this invoice.</li>
                <li>Record reversing stock movements (`RETURN`).</li>
                <li>Reverse double-entry revenue and COGS ledger entries.</li>
                <li>Adjust customer lifetime spend and account receivable balances.</li>
              </ul>
            </div>

            <form onSubmit={handleCancelInvoice} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700">Reason for Cancellation *</label>
                <input
                  type="text"
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Wrong hardware selected / customer exchange"
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancellingInvoice(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCancelling}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-sm"
                >
                  {isCancelling ? 'Voiding...' : 'Confirm Void'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT PREVIEW MODAL */}
      {selectedInvoice && settings && (
        <InvoicePrintModal
          invoice={selectedInvoice}
          settings={settings}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
};
