import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { formatMYR, formatDateKL } from '../../lib/finance';
import { Deposit, Customer, PaymentMethod } from '../../types';
import {
  DollarSign,
  Plus,
  Search,
  CheckCircle2,
  X,
  CreditCard,
  Banknote,
  QrCode,
  RotateCcw,
} from 'lucide-react';

export const DepositsView: React.FC = () => {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [initialPaid, setInitialPaid] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [notes, setNotes] = useState('');

  // Add Payment Modal
  const [selectedDepositForPay, setSelectedDepositForPay] = useState<Deposit | null>(null);
  const [addPayAmount, setAddPayAmount] = useState('');
  const [addPayMethod, setAddPayMethod] = useState<PaymentMethod>('CASH');
  const [addPayRef, setAddPayRef] = useState('');

  const fetchDeposits = async () => {
    try {
      setLoading(true);
      const [dRes, cRes] = await Promise.all([
        apiFetch<{ deposits: Deposit[] }>('/api/deposits'),
        apiFetch<{ customers: Customer[] }>('/api/customers'),
      ]);
      setDeposits(dRes.deposits || []);
      setCustomers(cRes.customers || []);
      if (cRes.customers && cRes.customers.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(cRes.customers[0].id);
      }
    } catch (err) {
      console.error('Failed to load deposits:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeposits();
  }, []);

  const handleCreateDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/deposits', {
        method: 'POST',
        body: JSON.stringify({
          customerId: selectedCustomerId,
          totalAmount: parseFloat(totalAmount) || 0,
          initialPaymentAmount: parseFloat(initialPaid) || 0,
          paymentMethod: method,
          notes,
        }),
      });
      setShowCreateModal(false);
      setTotalAmount('');
      setInitialPaid('');
      setNotes('');
      fetchDeposits();
    } catch (err: any) {
      alert(err.message || 'Failed to create deposit.');
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDepositForPay) return;
    try {
      await apiFetch(`/api/deposits/${selectedDepositForPay.id}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          amount: parseFloat(addPayAmount) || 0,
          method: addPayMethod,
          reference: addPayRef,
        }),
      });
      setSelectedDepositForPay(null);
      setAddPayAmount('');
      setAddPayRef('');
      fetchDeposits();
    } catch (err: any) {
      alert(err.message || 'Failed to add deposit payment.');
    }
  };

  const filtered = deposits.filter((d) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return d.depositNo.toLowerCase().includes(term) || d.customerName.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-5 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Customer Deposits & Downpayments</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage advance customer deposits for custom PC builds, repairs, and special orders
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm"
        >
          <Plus className="w-4 h-4" /> Record New Deposit
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search deposit number or customer..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Deposits Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase font-bold tracking-wider">
                <th className="py-3 px-4">Deposit No</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 text-right">Agreed Target</th>
                <th className="py-3 px-4 text-right">Paid to Date</th>
                <th className="py-3 px-4 text-right">Available to Apply</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Loading deposits...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No customer deposits recorded.
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900 font-mono">{d.depositNo}</td>
                    <td className="py-3 px-4 text-slate-600">{formatDateKL(d.createdAt, 'dd/MM/yyyy')}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{d.customerName}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">{formatMYR(d.totalAmount)}</td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-600 font-bold">{formatMYR(d.paidAmount)}</td>
                    <td className="py-3 px-4 text-right font-mono text-indigo-700 font-bold">{formatMYR(d.remainingAmount)}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          d.status === 'APPLIED'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : d.status === 'OPEN'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {d.status !== 'APPLIED' && (
                        <button
                          type="button"
                          onClick={() => setSelectedDepositForPay(d)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold rounded-lg transition-colors"
                        >
                          + Add Payment
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD DEPOSIT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 p-5 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900">Record Customer Deposit</h3>
              <button type="button" onClick={() => setShowCreateModal(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateDeposit} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700">Customer *</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Total Agreed Job / Order Value (MYR) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="e.g. 3500.00"
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Initial Deposit Paid (MYR) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={initialPaid}
                  onChange={(e) => setInitialPaid(e.target.value)}
                  placeholder="e.g. 1000.00"
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Payment Channel</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                >
                  <option value="CASH">Cash</option>
                  <option value="QR">DuitNow QR Instant</option>
                  <option value="CARD">Debit / Credit Card</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Deposit Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Custom Gaming PC Build 50% deposit"
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm"
                >
                  Save Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD DEPOSIT PAYMENT MODAL */}
      {selectedDepositForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-sm bg-white rounded-xl shadow-2xl border border-slate-200 p-5 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Add Payment: {selectedDepositForPay.depositNo}
              </h3>
              <button type="button" onClick={() => setSelectedDepositForPay(null)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg text-[11px] space-y-1">
              <p>Customer: <span className="font-bold text-slate-900">{selectedDepositForPay.customerName}</span></p>
              <p>Target: <span className="font-mono">{formatMYR(selectedDepositForPay.totalAmount)}</span></p>
              <p>Paid so far: <span className="font-mono text-emerald-600 font-bold">{formatMYR(selectedDepositForPay.paidAmount)}</span></p>
            </div>

            <form onSubmit={handleAddPayment} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700">Payment Amount (MYR) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={addPayAmount}
                  onChange={(e) => setAddPayAmount(e.target.value)}
                  placeholder="e.g. 500.00"
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Payment Channel</label>
                <select
                  value={addPayMethod}
                  onChange={(e) => setAddPayMethod(e.target.value as PaymentMethod)}
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                >
                  <option value="CASH">Cash</option>
                  <option value="QR">DuitNow QR Instant</option>
                  <option value="CARD">Debit / Credit Card</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Reference / Bank Transaction No</label>
                <input
                  type="text"
                  value={addPayRef}
                  onChange={(e) => setAddPayRef(e.target.value)}
                  placeholder="Optional reference"
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDepositForPay(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
