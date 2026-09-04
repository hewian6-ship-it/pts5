import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { POSProvider } from './context/POSContext';
import { apiFetch } from './lib/api';
import { BusinessSetting, Invoice, Product, Quotation } from './types';

// Views
import { LoginView } from './components/views/LoginView';
import { DashboardView } from './components/views/DashboardView';
import { POSView } from './components/views/POSView';
import { InvoicesView } from './components/views/InvoicesView';
import { QuotationsView } from './components/views/QuotationsView';
import { DepositsView } from './components/views/DepositsView';
import { InventoryView } from './components/views/InventoryView';
import { PurchasesView } from './components/views/PurchasesView';
import { SuppliersView } from './components/views/SuppliersView';
import { CustomersView } from './components/views/CustomersView';
import { SalesView } from './components/views/SalesView';
import { DailyClosingView } from './components/views/DailyClosingView';
import { ExpensesView } from './components/views/ExpensesView';
import { AccountingView } from './components/views/AccountingView';
import { ReportsView } from './components/views/ReportsView';
import { SettingsView } from './components/views/SettingsView';

// Modals
import { GlobalSearchModal } from './components/modals/GlobalSearchModal';
import { InvoicePrintModal } from './components/modals/InvoicePrintModal';

// Icons
import {
  LayoutDashboard,
  ShoppingBag,
  Receipt,
  FileText,
  DollarSign,
  Package,
  Truck,
  Building2,
  Users,
  TrendingUp,
  Lock,
  CreditCard,
  Layers,
  FileSpreadsheet,
  Settings,
  Search,
  LogOut,
  Cpu,
  Menu,
  X,
  Clock,
  ChevronRight,
} from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { user, logout, loading: authLoading } = useAuth();
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [settings, setSettings] = useState<BusinessSetting | null>(null);

  // Global Search Modal
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);

  // Selected Invoice for Global Print Modal
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  // Mobile sidebar drawer
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Live KL Clock
  const [timeStr, setTimeStr] = useState('');

  const fetchSettings = async () => {
    try {
      const res = await apiFetch<{ settings: BusinessSetting }>('/api/settings');
      setSettings(res.settings);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  // Live Clock & Hotkeys
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-GB', {
          timeZone: 'Asia/Kuala_Lumpur',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }) + ' (MYT)'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowGlobalSearch((prev) => !prev);
      }
      // F2 hotkey: jump to POS
      if (e.key === 'F2') {
        e.preventDefault();
        setCurrentView('pos');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs text-slate-400 font-medium">Initializing Peace Tech POS Terminal...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, category: 'Operations' },
    { id: 'pos', label: 'POS Terminal (F2)', icon: ShoppingBag, category: 'Operations', badge: 'Active' },
    { id: 'invoices', label: 'Invoices', icon: Receipt, category: 'Sales & Billing' },
    { id: 'quotations', label: 'Quotations', icon: FileText, category: 'Sales & Billing' },
    { id: 'deposits', label: 'Deposits', icon: DollarSign, category: 'Sales & Billing' },
    { id: 'sales', label: 'Sales History', icon: TrendingUp, category: 'Sales & Billing' },
    { id: 'inventory', label: 'Hardware Catalog', icon: Package, category: 'Inventory' },
    { id: 'purchases', label: 'Stock In (PO)', icon: Truck, category: 'Inventory' },
    { id: 'suppliers', label: 'Suppliers', icon: Building2, category: 'Contacts' },
    { id: 'customers', label: 'Customers', icon: Users, category: 'Contacts' },
    { id: 'closing', label: 'Daily Closing', icon: Lock, category: 'Accounting' },
    { id: 'expenses', label: 'Expenses', icon: CreditCard, category: 'Accounting' },
    { id: 'accounting', label: 'General Ledger & P&L', icon: Layers, category: 'Accounting' },
    { id: 'reports', label: 'Reports & Export', icon: FileSpreadsheet, category: 'Reports' },
    { id: 'settings', label: 'System Settings', icon: Settings, category: 'System' },
  ];

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex flex-col font-sans antialiased text-[#1f2937] selection:bg-blue-600 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="h-16 bg-white text-slate-800 border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-30 shadow-xs">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div
            onClick={() => setCurrentView('dashboard')}
            className="flex items-center gap-3 cursor-pointer select-none"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-xs font-black text-white text-sm tracking-tighter">
              PT
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm tracking-tight text-gray-900">
                  {settings?.businessName || 'PEACE TECH'}
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full uppercase tracking-wider border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1" />
                  Live POS
                </span>
              </div>
              <p className="text-[10px] text-gray-500 font-mono hidden sm:block">
                SSM: {settings?.registrationNo || '202401009876-X'} • MYR (RM)
              </p>
            </div>
          </div>
        </div>

        {/* Center: Global Search Bar Trigger */}
        <div className="hidden md:flex items-center max-w-md w-full mx-4">
          <button
            type="button"
            onClick={() => setShowGlobalSearch(true)}
            className="w-full flex items-center justify-between px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200/70 text-gray-500 hover:text-gray-800 border border-gray-200 rounded-xl text-xs transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <span>Search products, barcodes, invoices, customers...</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-gray-500 bg-white rounded-md border border-gray-200 shadow-2xs">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Right: Clock & User & POS Quick Action */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCurrentView('pos')}
            className="hidden sm:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            New Sale (F2)
          </button>

          <div className="hidden sm:flex flex-col text-right px-2 py-0.5">
            <span className="text-[10px] text-gray-500 font-medium">Kuala Lumpur</span>
            <span className="text-xs font-bold text-gray-800 font-mono">{timeStr || 'KL Time'}</span>
          </div>

          <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
            <button
              type="button"
              onClick={logout}
              className="p-2 text-gray-400 hover:text-rose-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              title="Sign Out of Terminal"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Body Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR NAVIGATION (Desktop) */}
        <aside className="hidden lg:flex w-64 bg-[#0f172a] text-gray-300 border-r border-gray-800 flex-col shrink-0">
          {/* Nav List */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            <div className="px-3 pb-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Business Suite
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCurrentView(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all select-none cursor-pointer ${
                    isActive
                      ? 'bg-blue-600/10 text-blue-400 border-l-4 border-blue-500 font-bold'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-gray-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && !isActive && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer User Card */}
          <div className="p-4 mt-auto border-t border-gray-800 bg-[#0c1322]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-black text-white shrink-0">
                {user.userId || '007'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{user.name}</p>
                <p className="text-[10px] text-gray-400 font-mono truncate">
                  ID: {user.userId} • {user.role || 'Admin'}
                </p>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Online & Synced" />
            </div>
          </div>
        </aside>

        {/* MOBILE SIDEBAR DRAWER */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden flex">
            <div
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-64 max-w-[80vw] bg-[#0f172a] text-white flex flex-col z-50 p-4 space-y-1">
              <div className="flex justify-between items-center px-2 py-3 border-b border-gray-800 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-xs text-white">
                    PT
                  </div>
                  <span className="font-bold text-sm text-white tracking-tight">PEACE TECH</span>
                </div>
                <button type="button" onClick={() => setMobileMenuOpen(false)}>
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setCurrentView(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium ${
                        isActive
                          ? 'bg-blue-600/10 text-blue-400 border-l-4 border-blue-500 font-bold'
                          : 'text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* MAIN VIEW CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#f3f4f6]">
          {currentView === 'dashboard' && (
            <DashboardView
              onNavigate={(v) => setCurrentView(v)}
              onOpenInvoice={(inv) => setPreviewInvoice(inv)}
            />
          )}

          {currentView === 'pos' && <POSView settings={settings} />}

          {currentView === 'invoices' && <InvoicesView settings={settings} />}

          {currentView === 'quotations' && (
            <QuotationsView
              settings={settings}
              onNavigate={(v) => setCurrentView(v)}
            />
          )}

          {currentView === 'deposits' && <DepositsView />}

          {currentView === 'inventory' && <InventoryView />}

          {currentView === 'purchases' && <PurchasesView />}

          {currentView === 'suppliers' && <SuppliersView />}

          {currentView === 'customers' && <CustomersView />}

          {currentView === 'sales' && <SalesView />}

          {currentView === 'closing' && <DailyClosingView settings={settings} />}

          {currentView === 'expenses' && <ExpensesView />}

          {currentView === 'accounting' && <AccountingView />}

          {currentView === 'reports' && <ReportsView />}

          {currentView === 'settings' && (
            <SettingsView
              settings={settings}
              onRefreshSettings={fetchSettings}
            />
          )}
        </main>
      </div>

      {/* GLOBAL SEARCH MODAL (Ctrl+K) */}
      <GlobalSearchModal
        isOpen={showGlobalSearch}
        onClose={() => setShowGlobalSearch(false)}
        onNavigateView={(v) => setCurrentView(v)}
        onSelectInvoice={(inv) => {
          setPreviewInvoice(inv);
        }}
      />

      {/* INVOICE PRINT PREVIEW MODAL */}
      {previewInvoice && settings && (
        <InvoicePrintModal
          invoice={previewInvoice}
          settings={settings}
          onClose={() => setPreviewInvoice(null)}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <POSProvider>
        <MainAppContent />
      </POSProvider>
    </AuthProvider>
  );
}
