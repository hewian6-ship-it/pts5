import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { formatMYR, formatDateKL } from '../../lib/finance';
import { Expense, ExpenseCategory, PaymentMethod } from '../../types';
import {
  CreditCard,
  Plus,
  Search,
  Tag,
  DollarSign,
  X,
  RotateCcw,
  Receipt,
  Banknote,
  Building,
} from 'lucide-react';

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Rent',
  'Electricity',
  'Internet / Telecom',
  'Staff Salary',
  'Transport & Petrol',
  'Marketing & Advertising',
  'Software & Licenses',
  'Hardware Repair Tools',
  'Office Supplies',
  'Utilities',
  'Other Operating Expense',
];

export const ExpensesView: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('ALL');

  // Add Expense Modal
  const [showModal, setShowModal] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory>('Office Supplies');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [description, setDescription] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{ expenses: Expense[] }>('/api/expenses');
      setExpenses(res.expenses || []);
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    setIsSubmitting(true);
    try {
      await apiFetch('/api/expenses', {
        method: 'POST',
        body: JSON.stringify({
          category,
          amount: parseFloat(amount),
          paymentMethod,
          description,
          receiptNumber,
        }),
      });

      setShowModal(false);
      setAmount('');
      setDescription('');
      setReceiptNumber('');
      fetchExpenses();
    } catch (err: any) {
      alert(err.message || 'Failed to record expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = expenses.filter((exp) => {
    if (selectedCat !== 'ALL' && exp.category !== selectedCat) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        exp.description.toLowerCase().includes(q) ||
        exp.category.toLowerCase().includes(q) ||
        (exp.receiptNumber && exp.receiptNumber.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalExpenseSum = filtered.reduce((acc, it) => acc + it.amount, 0);

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Operating Expenses & P&L Outflows</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log shop utilities, internet, repair tools, rent, and overhead for double-entry P&L
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm"
        >
          <Plus className="w-4 h-4" /> Record Expense
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search expenses by description, receipt number..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="py-2 px-3 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
          >
            <option value="ALL">All Expense Categories</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Total Banner */}
      <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400">Total Filtered Operating Outflows:</span>
        <span className="text-xl font-black font-mono text-rose-400">-{formatMYR(totalExpenseSum)}</span>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase font-bold tracking-wider">
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Receipt / Ref #</th>
                <th className="py-3 px-4 text-center">Paid Via</th>
                <th className="py-3 px-4 text-right">Amount (RM)</th>
                <th className="py-3 px-4 text-right">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Loading expenses...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No operating expenses recorded.
                  </td>
                </tr>
              ) : (
                filtered.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-600 font-mono">
                      {formatDateKL(exp.date, 'dd/MM/yyyy HH:mm')}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{exp.description}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{exp.receiptNumber || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {exp.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                      -{formatMYR(exp.amount)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">{exp.recordedBy}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD EXPENSE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 p-5 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900">Record Operating Expense</h3>
              <button type="button" onClick={() => setShowModal(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg font-semibold"
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Amount (MYR) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 150.00"
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg font-mono font-bold text-base"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Payment Outflow Channel</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg font-semibold"
                >
                  <option value="CASH">Cash Drawer (Petty Cash)</option>
                  <option value="QR">Maybank Business Bank Transfer</option>
                  <option value="CARD">Company Debit/Credit Card</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Description / Payee *</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. TNB Electricity Bill for Shop lot"
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Bill / Receipt Number</label>
                <input
                  type="text"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  placeholder="e.g. TNB-2026-08-991"
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm"
                >
                  {isSubmitting ? 'Recording...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
