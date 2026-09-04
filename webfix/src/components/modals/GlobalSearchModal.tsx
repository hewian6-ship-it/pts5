import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../../lib/api';
import { formatMYR } from '../../lib/finance';
import {
  Search,
  X,
  Package,
  FileText,
  Users,
  Building2,
  Receipt,
  ArrowRight,
  Barcode,
} from 'lucide-react';
import { Product, Invoice, Quotation, Customer, Supplier } from '../../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct?: (product: Product) => void;
  onSelectInvoice?: (invoice: Invoice) => void;
  onSelectQuotation?: (quotation: Quotation) => void;
  onNavigateView?: (view: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
  onSelectInvoice,
  onSelectQuotation,
  onNavigateView,
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    products: Product[];
    invoices: Invoice[];
    quotations: Quotation[];
    customers: Customer[];
    suppliers: Supplier[];
  }>({
    products: [],
    invoices: [],
    quotations: [],
    customers: [],
    suppliers: [],
  });

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults({ products: [], invoices: [], quotations: [], customers: [], suppliers: [] });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ products: [], invoices: [], quotations: [], customers: [], suppliers: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiFetch<{
          results: {
            products: Product[];
            invoices: Invoice[];
            quotations: Quotation[];
            customers: Customer[];
            suppliers: Supplier[];
          };
        }>(`/api/search?q=${encodeURIComponent(query.trim())}`);
        setResults(res.results || { products: [], invoices: [], quotations: [], customers: [], suppliers: [] });
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const totalHits =
    results.products.length +
    results.invoices.length +
    results.quotations.length +
    results.customers.length +
    results.suppliers.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-slate-950/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 bg-slate-50/50">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by product name, barcode, SKU, invoice no, customer, supplier..."
            className="w-full bg-transparent border-none text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-slate-200/80 rounded border border-slate-300">
            ESC
          </kbd>
        </div>

        {/* Results Container */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {loading && (
            <div className="py-8 text-center text-xs text-slate-400">
              Searching database...
            </div>
          )}

          {!loading && query && totalHits === 0 && (
            <div className="py-8 text-center text-xs text-slate-400">
              No matching records found for "{query}".
            </div>
          )}

          {!loading && !query && (
            <div className="py-6 text-center text-xs text-slate-400">
              Type anything to search across inventory, invoices, quotations, customers, and suppliers.
            </div>
          )}

          {/* Products */}
          {results.products.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-indigo-500" /> Products & Hardware ({results.products.length})
              </h4>
              <div className="space-y-1">
                {results.products.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      if (onSelectProduct) onSelectProduct(p);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-indigo-50/70 border border-transparent hover:border-indigo-100 cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{p.name}</p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span>SKU: {p.sku}</span>
                        {p.barcode && (
                          <span className="flex items-center gap-0.5 text-slate-600 font-mono">
                            <Barcode className="w-3 h-3" /> {p.barcode}
                          </span>
                        )}
                        <span className="text-indigo-600 font-medium">Category: {p.category}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-900 font-mono">{formatMYR(p.sellingPrice)}</p>
                      <p className="text-[10px] text-slate-500">Stock: {p.stockQuantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invoices */}
          {results.invoices.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-emerald-500" /> Invoices ({results.invoices.length})
              </h4>
              <div className="space-y-1">
                {results.invoices.map((inv) => (
                  <div
                    key={inv.id}
                    onClick={() => {
                      if (onSelectInvoice) onSelectInvoice(inv);
                      else if (onNavigateView) onNavigateView('invoices');
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-emerald-50/70 border border-transparent hover:border-emerald-100 cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{inv.invoiceNo}</p>
                      <p className="text-[11px] text-slate-500">Customer: {inv.customerName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-900 font-mono">{formatMYR(inv.total)}</p>
                      <span className="text-[10px] font-semibold text-emerald-600 uppercase">{inv.paymentStatus}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quotations */}
          {results.quotations.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-500" /> Quotations ({results.quotations.length})
              </h4>
              <div className="space-y-1">
                {results.quotations.map((qt) => (
                  <div
                    key={qt.id}
                    onClick={() => {
                      if (onSelectQuotation) onSelectQuotation(qt);
                      else if (onNavigateView) onNavigateView('quotations');
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-amber-50/70 border border-transparent hover:border-amber-100 cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{qt.quotationNo}</p>
                      <p className="text-[11px] text-slate-500">To: {qt.customerName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-900 font-mono">{formatMYR(qt.total)}</p>
                      <span className="text-[10px] font-semibold text-amber-600 uppercase">{qt.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customers */}
          {results.customers.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-500" /> Customers ({results.customers.length})
              </h4>
              <div className="space-y-1">
                {results.customers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      if (onNavigateView) onNavigateView('customers');
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-blue-50/70 border border-transparent hover:border-blue-100 cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{c.name}</p>
                      <p className="text-[11px] text-slate-500">Phone: {c.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-slate-600 font-mono">Spent: {formatMYR(c.totalSpent)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suppliers */}
          {results.suppliers.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-purple-500" /> Suppliers ({results.suppliers.length})
              </h4>
              <div className="space-y-1">
                {results.suppliers.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      if (onNavigateView) onNavigateView('suppliers');
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-purple-50/70 border border-transparent hover:border-purple-100 cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{s.companyName}</p>
                      <p className="text-[11px] text-slate-500">Contact: {s.contactPerson} ({s.phone})</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-slate-600 font-mono">Purchases: {formatMYR(s.totalPurchases)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
