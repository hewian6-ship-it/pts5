import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { formatMYR, formatDateKL } from '../../lib/finance';
import { DailyClosing, BusinessSetting } from '../../types';
import {
  Lock,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Banknote,
  QrCode,
  CreditCard,
  DollarSign,
  Printer,
  ChevronRight,
} from 'lucide-react';

interface DailyClosingViewProps {
  settings: BusinessSetting | null;
}

export const DailyClosingView: React.FC<DailyClosingViewProps> = ({ settings }) => {
  const [preview, setPreview] = useState<{
    date: string;
    openingCash: number;
    cashSales: number;
    qrSales: number;
    cardSales: number;
    totalSales: number;
    cashExpenses: number;
    cashDeposits: number;
    expectedCash: number;
    grossProfit: number;
    netProfit: number;
    transactionsCount: number;
    isAlreadyClosed: boolean;
  } | null>(null);

  const [closingsHistory, setClosingsHistory] = useState<DailyClosing[]>([]);
  const [loading, setLoading] = useState(true);
  const [actualCash, setActualCash] = useState<string>('');
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [isClosing, setIsClosing] = useState(false);

  // Denominations Breakdown Calculator State
  const [d100, setD100] = useState(0);
  const [d50, setD50] = useState(0);
  const [d20, setD20] = useState(0);
  const [d10, setD10] = useState(0);
  const [d5, setD5] = useState(0);
  const [d1, setD1] = useState(0);
  const [c50, setC50] = useState(0);
  const [c20, setC20] = useState(0);
  const [c10, setC10] = useState(0);

  const fetchClosingData = async () => {
    try {
      setLoading(true);
      const [pRes, hRes] = await Promise.all([
        apiFetch<{ preview: any }>('/api/closing/preview'),
        apiFetch<{ closings: DailyClosing[] }>('/api/closing/history'),
      ]);
      setPreview(pRes.preview);
      setClosingsHistory(hRes.closings || []);
      if (pRes.preview) {
        setActualCash(pRes.preview.expectedCash.toFixed(2));
      }
    } catch (err) {
      console.error('Failed to load daily closing:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClosingData();
  }, []);

  // Update actualCash when denominations change
  const calcFromDenoms = () => {
    const total =
      d100 * 100 +
      d50 * 50 +
      d20 * 20 +
      d10 * 10 +
      d5 * 5 +
      d1 * 1 +
      c50 * 0.5 +
      c20 * 0.2 +
      c10 * 0.1;
    setActualCash(total.toFixed(2));
  };

  const handlePerformClosing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview) return;

    if (!confirm('Are you sure you want to perform Daily Closing? This will lock today\'s ledger and record the cash drawer reconciliation.')) {
      return;
    }

    setIsClosing(true);
    try {
      await apiFetch('/api/closing/close', {
        method: 'POST',
        body: JSON.stringify({
          actualCash: parseFloat(actualCash) || 0,
          notes: closingNotes,
        }),
      });

      alert('Daily closing completed successfully! Shift records locked.');
      fetchClosingData();
    } catch (err: any) {
      alert(err.message || 'Failed to complete daily closing');
    } finally {
      setIsClosing(false);
    }
  };

  if (loading || !preview) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        Loading daily closing reconciliation...
      </div>
    );
  }

  const actualCashNum = parseFloat(actualCash) || 0;
  const difference = actualCashNum - preview.expectedCash;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Daily Business Closing (Z-Report)</h1>
            {preview.isAlreadyClosed ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                Shift Closed & Locked
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                Shift Active
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-grade cash drawer balancing, payment channel settlement, and end-of-day ledger locking
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Business Date (MYT)</p>
          <p className="text-sm font-bold text-slate-900 font-mono">{formatDateKL(preview.date, 'EEEE, dd MMMM yyyy')}</p>
        </div>
      </div>

      {/* Main Closing Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Financial Summary & Drawer Reconciliation */}
        <div className="lg:col-span-2 space-y-5">
          {/* Revenue Breakdown */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-indigo-600" />
              Today's Settlement Channels
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                  <Banknote className="w-3.5 h-3.5 text-emerald-600" /> Cash Sales
                </span>
                <p className="text-lg font-black text-slate-900 font-mono mt-1">
                  {formatMYR(preview.cashSales)}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                  <QrCode className="w-3.5 h-3.5 text-indigo-600" /> DuitNow QR
                </span>
                <p className="text-lg font-black text-indigo-700 font-mono mt-1">
                  {formatMYR(preview.qrSales)}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-amber-600" /> Card Settlement
                </span>
                <p className="text-lg font-black text-amber-700 font-mono mt-1">
                  {formatMYR(preview.cardSales)}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-slate-500">Gross Sales Revenue:</span>
                <p className="font-bold text-slate-900 font-mono text-sm">{formatMYR(preview.totalSales)}</p>
              </div>
              <div>
                <span className="text-slate-500">Operating Expenses:</span>
                <p className="font-bold text-rose-600 font-mono text-sm">{formatMYR(preview.cashExpenses)}</p>
              </div>
              <div>
                <span className="text-slate-500">Net Shift Profit:</span>
                <p className="font-bold text-emerald-600 font-mono text-sm">{formatMYR(preview.netProfit)}</p>
              </div>
            </div>
          </div>

          {/* Cash Drawer Calculation Formula */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Cash Drawer Reconciliation Equation</h3>
            <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">1. Drawer Opening Float:</span>
                <span>+{formatMYR(preview.openingCash)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">2. Cash Sales Received:</span>
                <span>+{formatMYR(preview.cashSales)}</span>
              </div>
              {preview.cashDeposits > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-400">3. Cash Deposits Inflow:</span>
                  <span>+{formatMYR(preview.cashDeposits)}</span>
                </div>
              )}
              <div className="flex justify-between text-rose-300">
                <span className="text-rose-400">4. Cash Paid Out for Expenses:</span>
                <span>-{formatMYR(preview.cashExpenses)}</span>
              </div>
              <div className="pt-2 border-t border-slate-700 flex justify-between text-sm font-black text-emerald-400">
                <span>= System Expected Cash in Drawer:</span>
                <span>{formatMYR(preview.expectedCash)}</span>
              </div>
            </div>
          </div>

          {/* Denominations Physical Count Tool */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900">Cash Denomination Breakdown</h3>
              <button
                type="button"
                onClick={calcFromDenoms}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Apply Count to Actual Field
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs">
              <div className="p-2 bg-slate-50 rounded-lg border">
                <span className="text-[10px] font-bold text-slate-500">RM 100</span>
                <input
                  type="number"
                  min="0"
                  value={d100}
                  onChange={(e) => setD100(parseInt(e.target.value) || 0)}
                  className="w-full mt-1 p-1 border rounded text-center font-bold"
                />
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border">
                <span className="text-[10px] font-bold text-slate-500">RM 50</span>
                <input
                  type="number"
                  min="0"
                  value={d50}
                  onChange={(e) => setD50(parseInt(e.target.value) || 0)}
                  className="w-full mt-1 p-1 border rounded text-center font-bold"
                />
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border">
                <span className="text-[10px] font-bold text-slate-500">RM 20</span>
                <input
                  type="number"
                  min="0"
                  value={d20}
                  onChange={(e) => setD20(parseInt(e.target.value) || 0)}
                  className="w-full mt-1 p-1 border rounded text-center font-bold"
                />
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border">
                <span className="text-[10px] font-bold text-slate-500">RM 10</span>
                <input
                  type="number"
                  min="0"
                  value={d10}
                  onChange={(e) => setD10(parseInt(e.target.value) || 0)}
                  className="w-full mt-1 p-1 border rounded text-center font-bold"
                />
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border">
                <span className="text-[10px] font-bold text-slate-500">RM 5</span>
                <input
                  type="number"
                  min="0"
                  value={d5}
                  onChange={(e) => setD5(parseInt(e.target.value) || 0)}
                  className="w-full mt-1 p-1 border rounded text-center font-bold"
                />
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border">
                <span className="text-[10px] font-bold text-slate-500">RM 1</span>
                <input
                  type="number"
                  min="0"
                  value={d1}
                  onChange={(e) => setD1(parseInt(e.target.value) || 0)}
                  className="w-full mt-1 p-1 border rounded text-center font-bold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Closing Action Box & Historical List */}
        <div className="space-y-5">
          {/* Action Box */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Execute Daily Closing</h3>

            <form onSubmit={handlePerformClosing} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Actual Physical Cash Counted (MYR) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                  className="w-full mt-1 p-2.5 border border-slate-300 rounded-lg font-mono font-black text-lg text-slate-900"
                />
              </div>

              {/* Variance Indicator */}
              <div
                className={`p-3 rounded-lg border flex items-center justify-between font-mono ${
                  difference === 0
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : difference > 0
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <span className="font-bold text-xs font-sans">
                  {difference === 0
                    ? 'Balanced Exactly'
                    : difference > 0
                    ? 'Cash Overage (+)'
                    : 'Cash Shortage (-)'}
                </span>
                <span className="font-black text-sm">
                  {difference >= 0 ? `+${formatMYR(difference)}` : formatMYR(difference)}
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Closing Remarks</label>
                <textarea
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="e.g. All shifts balanced. Float RM300 left in drawer for tomorrow."
                  rows={2}
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <button
                type="submit"
                disabled={isClosing}
                className="w-full py-3 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Lock className="w-4 h-4 text-emerald-400" />
                {isClosing ? 'Closing Day...' : 'LOCK & CLOSE BUSINESS DAY'}
              </button>
            </form>
          </div>

          {/* Historical Closings List */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Recent Z-Report Closings</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {closingsHistory.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No past closings recorded yet.</p>
              ) : (
                closingsHistory.map((cl) => (
                  <div key={cl.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-900 font-mono">{formatDateKL(cl.date, 'dd/MM/yyyy')}</p>
                        <p className="text-[10px] text-slate-400">{cl.closedBy}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold font-mono text-slate-900">{formatMYR(cl.totalSales)}</p>
                        <span
                          className={`text-[10px] font-bold ${
                            cl.difference === 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          Diff: {formatMYR(cl.difference)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
