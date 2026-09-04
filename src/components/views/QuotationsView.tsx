import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { formatMYR, formatDateKL } from '../../lib/finance';
import { Quotation, Product, Customer, BusinessSetting, PaymentMethod, QuotationStatus } from '../../types';
import { generateQuotationPDF } from '../../lib/print';
import {
  FileText,
  Plus,
  Search,
  Download,
  CheckCircle,
  X,
  Trash2,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';

interface QuotationsViewProps {
  settings: BusinessSetting | null;
  onNavigate: (view: string) => void;
}

export const QuotationsView: React.FC<QuotationsViewProps> = ({ settings, onNavigate }) => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Create Quotation Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [expiryDays, setExpiryDays] = useState(14);
  const [quoteItems, setQuoteItems] = useState<{ productId: string; quantity: number; unitPrice: number; discount: number }[]>([]);
  const [quoteNotes, setQuoteNotes] = useState('Quotation valid for 14 days. Prices subject to stock availability.');

  // Convert Quotation Modal
  const [convertingQuote, setConvertingQuote] = useState<Quotation | null>(null);
  const [convertPaymentMethod, setConvertPaymentMethod] = useState<PaymentMethod>('CASH');
  const [convertCashReceived, setConvertCashReceived] = useState<string>('');
  const [isConverting, setIsConverting] = useState(false);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const [qRes, pRes, cRes] = await Promise.all([
        apiFetch<{ quotations: Quotation[] }>('/api/quotations'),
        apiFetch<{ products: Product[] }>('/api/products'),
        apiFetch<{ customers: Customer[] }>('/api/customers'),
      ]);
      setQuotations(qRes.quotations || []);
      setProducts(pRes.products || []);
      setCustomers(cRes.customers || []);
      if (cRes.customers && cRes.customers.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(cRes.customers[0].id);
      }
    } catch (err) {
      console.error('Failed to load quotations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  const handleAddItemToQuote = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    setQuoteItems((prev) => {
      const idx = prev.findIndex((it) => it.productId === productId);
      if (idx > -1) {
        const updated = [...prev];
        updated[idx].quantity += 1;
        return updated;
      }
      return [
        ...prev,
        {
          productId: prod.id,
          quantity: 1,
          unitPrice: prod.sellingPrice,
          discount: 0,
        },
      ];
    });
  };

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quoteItems.length === 0) {
      alert('Please add at least one item to the quotation.');
      return;
    }

    try {
      const expiryDate = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();
      await apiFetch('/api/quotations', {
        method: 'POST',
        body: JSON.stringify({
          customerId: selectedCustomerId,
          expiryDate,
          items: quoteItems,
          notes: quoteNotes,
        }),
      });

      setShowCreateModal(false);
      setQuoteItems([]);
      fetchQuotations();
    } catch (err: any) {
      alert(err.message || 'Failed to create quotation');
    }
  };

  const handleUpdateStatus = async (id: string, status: QuotationStatus) => {
    try {
      await apiFetch(`/api/quotations/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      fetchQuotations();
    } catch (err: any) {
      alert(err.message || 'Failed to update quotation status');
    }
  };

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingQuote) return;
    setIsConverting(true);
    try {
      const cashVal = convertPaymentMethod === 'CASH' ? parseFloat(convertCashReceived) || convertingQuote.total : undefined;
      await apiFetch(`/api/quotations/${convertingQuote.id}/convert`, {
        method: 'POST',
        body: JSON.stringify({
          paymentMethod: convertPaymentMethod,
          cashReceived: cashVal,
        }),
      });
      setConvertingQuote(null);
      fetchQuotations();
      alert('Quotation successfully converted to Invoice!');
    } catch (err: any) {
      alert(err.message || 'Failed to convert quotation.');
    } finally {
      setIsConverting(false);
    }
  };

  const filtered = quotations.filter((q) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return q.quotationNo.toLowerCase().includes(term) || q.customerName.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Formal Quotations & Estimates</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Issue quotes, manage status pipelines, and convert directly to POS sales invoices
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm"
        >
          <Plus className="w-4 h-4" /> Create Quotation
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
            placeholder="Search by quotation number or customer name..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Quotations List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase font-bold tracking-wider">
                <th className="py-3 px-4">Quote No</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Valid Until</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Loading quotations...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No quotations found.
                  </td>
                </tr>
              ) : (
                filtered.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900 font-mono">{q.quotationNo}</td>
                    <td className="py-3 px-4 text-slate-600">{formatDateKL(q.date, 'dd/MM/yyyy')}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{q.customerName}</td>
                    <td className="py-3 px-4 text-slate-500">{formatDateKL(q.expiryDate, 'dd/MM/yyyy')}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{formatMYR(q.total)}</td>
                    <td className="py-3 px-4 text-center">
                      <select
                        value={q.status}
                        disabled={q.status === 'CONVERTED'}
                        onChange={(e) => handleUpdateStatus(q.id, e.target.value as QuotationStatus)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                          q.status === 'CONVERTED'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : q.status === 'ACCEPTED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : q.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        <option value="DRAFT">DRAFT</option>
                        <option value="SENT">SENT</option>
                        <option value="ACCEPTED">ACCEPTED</option>
                        <option value="REJECTED">REJECTED</option>
                        {q.status === 'CONVERTED' && <option value="CONVERTED">CONVERTED</option>}
                      </select>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {settings && (
                          <button
                            type="button"
                            onClick={() => generateQuotationPDF(q, settings)}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Download Official Quotation PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        {q.status !== 'CONVERTED' && (
                          <button
                            type="button"
                            onClick={() => setConvertingQuote(q)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg shadow-xs transition-colors"
                            title="Convert to Invoice"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Convert to Invoice
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE QUOTATION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 p-6 space-y-4 text-xs my-8">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900">Create Official Quotation</h3>
              <button type="button" onClick={() => setShowCreateModal(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateQuotation} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Client / Customer *</label>
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
                  <label className="font-semibold text-slate-700">Validity Period (Days)</label>
                  <input
                    type="number"
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(parseInt(e.target.value) || 14)}
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Product Picker */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Add Items from Inventory
                </label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddItemToQuote(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                >
                  <option value="">-- Choose Product / Hardware to add --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) - {formatMYR(p.sellingPrice)}
                    </option>
                  ))}
                </select>

                {/* Added Items List */}
                <div className="space-y-1.5 mt-2">
                  {quoteItems.map((it, idx) => {
                    const prod = products.find((p) => p.id === it.productId);
                    const subtotal = it.quantity * it.unitPrice - it.discount;
                    return (
                      <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200">
                        <div className="flex-1 pr-2">
                          <p className="font-semibold text-slate-900">{prod?.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{prod?.sku}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            value={it.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1;
                              const updated = [...quoteItems];
                              updated[idx].quantity = val;
                              setQuoteItems(updated);
                            }}
                            className="w-14 p-1 border rounded text-center font-bold"
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={it.unitPrice}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const updated = [...quoteItems];
                              updated[idx].unitPrice = val;
                              setQuoteItems(updated);
                            }}
                            className="w-20 p-1 border rounded text-right font-mono"
                          />
                          <span className="font-bold text-slate-900 font-mono w-20 text-right">
                            {formatMYR(subtotal)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQuoteItems(quoteItems.filter((_, i) => i !== idx))}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Terms & Quotation Notes</label>
                <textarea
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  rows={2}
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
                  Save Formal Quotation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONVERT TO INVOICE MODAL */}
      {convertingQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 p-5 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Convert {convertingQuote.quotationNo} to Invoice
              </h3>
              <button type="button" onClick={() => setConvertingQuote(null)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="p-3 bg-slate-900 text-white rounded-lg text-center">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Amount</span>
              <h2 className="text-2xl font-black font-mono mt-0.5">{formatMYR(convertingQuote.total)}</h2>
              <p className="text-[11px] text-slate-300 mt-0.5">Client: {convertingQuote.customerName}</p>
            </div>

            <form onSubmit={handleConvertSubmit} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700">Payment Settlement Channel</label>
                <select
                  value={convertPaymentMethod}
                  onChange={(e) => setConvertPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg font-semibold"
                >
                  <option value="CASH">Cash</option>
                  <option value="QR">DuitNow QR Transfer</option>
                  <option value="CARD">Debit / Credit Card</option>
                </select>
              </div>

              {convertPaymentMethod === 'CASH' && (
                <div>
                  <label className="font-semibold text-slate-700">Cash Received (MYR)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={convertCashReceived || convertingQuote.total}
                    onChange={(e) => setConvertCashReceived(e.target.value)}
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConvertingQuote(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isConverting}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm"
                >
                  {isConverting ? 'Converting...' : 'Complete & Generate Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
