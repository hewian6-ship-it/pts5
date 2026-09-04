import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { formatMYR, formatDateKL } from '../../lib/finance';
import { DashboardStats, Invoice, Product } from '../../types';
import {
  TrendingUp,
  CreditCard,
  ShoppingBag,
  DollarSign,
  AlertTriangle,
  Receipt,
  ArrowUpRight,
  Sparkles,
  Layers,
  FileText,
  Clock,
  Printer,
  ChevronRight,
  Banknote,
  QrCode,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface DashboardViewProps {
  onNavigate: (view: string) => void;
  onOpenInvoice: (invoice: Invoice) => void;
}

const COLORS = ['#10B981', '#6366F1', '#F59E0B', '#EC4899'];

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenInvoice,
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{ stats: DashboardStats }>('/api/accounting/dashboard');
      setStats(res.stats);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading || !stats) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading real-time business metrics...</p>
        </div>
      </div>
    );
  }

  const grossMarginPct =
    stats.todaySales > 0 ? ((stats.todayGrossProfit / stats.todaySales) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-gray-800 tracking-tight">Business Overview</h1>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full uppercase tracking-wider border border-emerald-200">
              Status: Open
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Real-time financial positions, inventory health, and transaction flow for Peace Tech Solution
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('pos')}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            New Sale (F2)
          </button>
          <button
            type="button"
            onClick={() => onNavigate('closing')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5" />
            Daily Closing
          </button>
        </div>
      </div>

      {/* Bento Grid: 4 Top Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Bento Tile 1: Today's Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between hover:border-blue-300 transition-all">
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Today's Revenue</p>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-3xl font-black text-blue-600 font-mono tracking-tight">
              {formatMYR(stats.todaySales)}
            </h2>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-emerald-600 font-bold">
              <span>+{stats.todayTransactions} Sales Today</span>
              <span className="text-gray-400 font-normal">•</span>
              <span className="text-gray-500 font-medium">Disc: -{formatMYR(stats.todayDiscounts)}</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-mono">
            <span>Cash: {formatMYR(stats.todayCash)}</span>
            <span>QR: {formatMYR(stats.todayQR)}</span>
            <span>Card: {formatMYR(stats.todayCard)}</span>
          </div>
        </div>

        {/* Bento Tile 2: Gross Profit */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between hover:border-gray-300 transition-all">
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Gross Profit</p>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-3xl font-black text-gray-800 font-mono tracking-tight">
              {formatMYR(stats.todayGrossProfit)}
            </h2>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                Margin: {grossMarginPct}%
              </span>
              <span>COGS: {formatMYR(stats.todayCOGS)}</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-400">
            Automated double-entry COGS calculation
          </div>
        </div>

        {/* Bento Tile 3: Net Profit & Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between hover:border-gray-300 transition-all">
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Net Operating Profit</p>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h2
              className={`text-3xl font-black font-mono tracking-tight ${
                stats.todayNetProfit >= 0 ? 'text-gray-800' : 'text-rose-600'
              }`}
            >
              {formatMYR(stats.todayNetProfit)}
            </h2>
            <p className="text-xs text-gray-500 mt-1.5 font-medium">
              Expenses: <span className="font-bold text-rose-600 font-mono">-{formatMYR(stats.todayExpenses)}</span>
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-[11px]">
            <span className="text-gray-400">Net Business Position</span>
            <button
              type="button"
              onClick={() => onNavigate('expenses')}
              className="text-blue-600 font-bold hover:underline cursor-pointer"
            >
              Log Expense &rarr;
            </button>
          </div>
        </div>

        {/* Bento Tile 4: Critical Alerts (Orange Bento Card) */}
        <div className="bg-orange-600 p-5 rounded-2xl shadow-md shadow-orange-200/50 flex flex-col justify-between text-white hover:bg-orange-700 transition-all">
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-white/70 uppercase tracking-widest">Critical Alerts</p>
            <div className="p-2 bg-white/20 rounded-xl text-white">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-3xl font-black font-mono">
              {String(stats.lowStockCount).padStart(2, '0')} Items
            </h2>
            <p className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded mt-1.5 inline-block text-white">
              {stats.lowStockCount > 0 ? 'Low Stock Action Required' : 'Inventory Optimal'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/20 flex justify-between items-center text-[11px] text-white/90">
            <span>A/R: {formatMYR(stats.outstandingCustomerBalance)}</span>
            <button
              type="button"
              onClick={() => onNavigate('inventory')}
              className="font-bold text-white hover:underline cursor-pointer"
            >
              View Items &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Bento Grid: Charts & Inflow Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Live Sales Performance Chart (3 cols on large) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-xs p-6 flex flex-col">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h3 className="font-bold text-gray-800 uppercase text-xs tracking-widest">
                Live Sales Performance (Last 7 Days)
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Daily revenue trend in Ringgit Malaysia (MYR)</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
              <span className="text-xs font-bold text-gray-600 font-mono">Daily Inflow</span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.weekSalesChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `RM${val}`}
                />
                <Tooltip
                  formatter={(val: any) => [`RM ${Number(val).toFixed(2)}`, 'Sales Revenue']}
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                />
                <Bar dataKey="sales" fill="#2563EB" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-between mt-3 border-t border-gray-100 pt-3 text-xs font-bold text-gray-400">
            <span>Terminal Operating Schedule</span>
            <span className="text-gray-600">Asia/Kuala_Lumpur (MYT)</span>
          </div>
        </div>

        {/* Payment Methods Distribution (1 col) */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-800 uppercase text-xs tracking-widest">
              Payment Inflow
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Distribution by channel</p>
          </div>

          <div className="h-44 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={
                    stats.paymentMethodBreakdown.filter((p) => p.value > 0).length > 0
                      ? stats.paymentMethodBreakdown.filter((p) => p.value > 0)
                      : [{ name: 'No Sales Yet', value: 1 }]
                  }
                  cx="50%"
                  cy="50%"
                  innerRadius={46}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {stats.paymentMethodBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: any) => [`RM ${Number(val).toFixed(2)}`, 'Amount']} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100 text-center">
            <div className="p-2 rounded-xl bg-gray-50">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Cash</p>
              <p className="text-xs font-bold text-gray-900 font-mono mt-0.5">{formatMYR(stats.todayCash)}</p>
            </div>
            <div className="p-2 rounded-xl bg-blue-50/50">
              <p className="text-[10px] font-bold text-blue-600 uppercase">QR</p>
              <p className="text-xs font-bold text-blue-700 font-mono mt-0.5">{formatMYR(stats.todayQR)}</p>
            </div>
            <div className="p-2 rounded-xl bg-amber-50/50">
              <p className="text-[10px] font-bold text-amber-600 uppercase">Card</p>
              <p className="text-xs font-bold text-amber-700 font-mono mt-0.5">{formatMYR(stats.todayCard)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bento Grid: Recent Sales & Low Stock List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Invoices Bento Tile */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-800 uppercase text-xs tracking-widest">
                  Recent Sales
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Latest POS counter checkouts</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('invoices')}
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                View All Invoices <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {stats.recentInvoices.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">
                  No sales recorded yet today.
                </div>
              ) : (
                stats.recentInvoices.slice(0, 5).map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          inv.paymentStatus === 'PAID'
                            ? 'bg-emerald-500'
                            : inv.paymentStatus === 'CANCELLED'
                            ? 'bg-gray-400'
                            : 'bg-amber-500'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900">{inv.invoiceNo}</span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {formatDateKL(inv.date, 'HH:mm')}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 truncate">{inv.customerName}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-bold font-mono text-gray-900">
                        {formatMYR(inv.total)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenInvoice(inv)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="View / Print"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('invoices')}
            className="mt-4 pt-3 border-t border-gray-100 text-center text-xs font-bold text-blue-600 hover:underline cursor-pointer"
          >
            View All Invoices
          </button>
        </div>

        {/* Low Stock Reorder Alerts Bento Tile */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-800 uppercase text-xs tracking-widest">
                  Low Stock Reorder Alerts
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Hardware items nearing threshold</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('purchases')}
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                Order Stock (PO) <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {stats.lowStockProducts.length === 0 ? (
                <div className="py-8 text-center text-xs text-emerald-600 font-bold bg-emerald-50/50 rounded-xl">
                  ✓ All hardware products have healthy stock levels.
                </div>
              ) : (
                stats.lowStockProducts.slice(0, 5).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{p.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono">
                        {p.sku} • {p.category}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-bold text-xs rounded-md">
                        {p.stockQuantity} {p.unit}
                      </span>
                      <span className="text-xs font-bold font-mono text-gray-900">
                        {formatMYR(p.sellingPrice)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('inventory')}
            className="mt-4 pt-3 border-t border-gray-100 text-center text-xs font-bold text-blue-600 hover:underline cursor-pointer"
          >
            Manage Hardware Inventory
          </button>
        </div>
      </div>
    </div>
  );
};
