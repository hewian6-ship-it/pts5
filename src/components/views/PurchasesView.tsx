import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { formatMYR, formatDateKL } from '../../lib/finance';
import { Purchase, Supplier, Product, PaymentMethod } from '../../types';
import {
  Truck,
  Plus,
  Search,
  CheckCircle2,
  X,
  Trash2,
  Building2,
  Calendar,
} from 'lucide-react';

export const PurchasesView: React.FC = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Create Purchase Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [isPaid, setIsPaid] = useState(true);
  const [purchaseItems, setPurchaseItems] = useState<{ productId: string; quantity: number; costPrice: number }[]>([]);
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const [purRes, supRes, prodRes] = await Promise.all([
        apiFetch<{ purchases: Purchase[] }>('/api/purchases'),
        apiFetch<{ suppliers: Supplier[] }>('/api/suppliers'),
        apiFetch<{ products: Product[] }>('/api/products'),
      ]);
      setPurchases(purRes.purchases || []);
      setSuppliers(supRes.suppliers || []);
      setProducts(prodRes.products || []);
      if (supRes.suppliers && supRes.suppliers.length > 0 && !selectedSupplierId) {
        setSelectedSupplierId(supRes.suppliers[0].id);
      }
    } catch (err) {
      console.error('Failed to load purchases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const handleAddItem = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    setPurchaseItems((prev) => {
      const idx = prev.findIndex((it) => it.productId === productId);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx].quantity += 1;
        return copy;
      }
      return [
        ...prev,
        {
          productId: prod.id,
          quantity: 5,
          costPrice: prod.costPrice,
        },
      ];
    });
  };

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (purchaseItems.length === 0) {
      alert('Please add at least one hardware product to receive into inventory.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiFetch('/api/purchases', {
        method: 'POST',
        body: JSON.stringify({
          supplierId: selectedSupplierId,
          supplierInvoiceNo,
          paymentMethod,
          paymentStatus: isPaid ? 'PAID' : 'UNPAID',
          items: purchaseItems,
          notes: purchaseNotes,
        }),
      });

      setShowCreateModal(false);
      setPurchaseItems([]);
      setSupplierInvoiceNo('');
      setPurchaseNotes('');
      fetchPurchases();
      alert('Purchase Order processed! Inventory stock updated and double-entry ledger created.');
    } catch (err: any) {
      alert(err.message || 'Failed to process purchase order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = purchases.filter((p) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      p.purchaseNo.toLowerCase().includes(term) ||
      p.supplierName.toLowerCase().includes(term) ||
      (p.supplierInvoiceNo && p.supplierInvoiceNo.toLowerCase().includes(term))
    );
  });

  const totalCalculated = purchaseItems.reduce(
    (acc, it) => acc + it.quantity * it.costPrice,
    0
  );

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Purchases & Supplier Stock-In</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log supplier purchases, receive hardware inventory batches, and sync A/P accounts
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm"
        >
          <Plus className="w-4 h-4" /> Record Purchase / Stock In
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
            placeholder="Search by PO number, supplier, or invoice no..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase font-bold tracking-wider">
                <th className="py-3 px-4">PO Number</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Supplier Invoice #</th>
                <th className="py-3 px-4">Items Received</th>
                <th className="py-3 px-4 text-right">Total Cost</th>
                <th className="py-3 px-4 text-center">Payment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Loading purchases...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No supplier purchase records found.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900 font-mono">{p.purchaseNo}</td>
                    <td className="py-3 px-4 text-slate-600">{formatDateKL(p.date, 'dd/MM/yyyy')}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{p.supplierName}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{p.supplierInvoiceNo || '-'}</td>
                    <td className="py-3 px-4 text-slate-600">{p.items.length} hardware lines</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatMYR(p.total)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          p.paymentStatus === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {p.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE PURCHASE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 p-6 space-y-4 text-xs my-8">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900">Record Supplier Purchase & Stock In</h3>
              <button type="button" onClick={() => setShowCreateModal(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreatePurchase} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Supplier Company *</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.companyName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Supplier Invoice / DO Number</label>
                  <input
                    type="text"
                    value={supplierInvoiceNo}
                    onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                    placeholder="e.g. INV-99238"
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              {/* Items Table Picker */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Select Hardware Products to Receive into Stock
                </label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddItem(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                >
                  <option value="">-- Choose Product / Hardware to Stock-In --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) - Cur. Stock: {p.stockQuantity}
                    </option>
                  ))}
                </select>

                <div className="space-y-1.5 mt-2">
                  {purchaseItems.map((it, idx) => {
                    const prod = products.find((p) => p.id === it.productId);
                    const lineCost = it.quantity * it.costPrice;
                    return (
                      <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200">
                        <div className="flex-1 pr-2">
                          <p className="font-semibold text-slate-900">{prod?.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{prod?.sku}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <span className="text-[9px] text-slate-400 block">Quantity</span>
                            <input
                              type="number"
                              min="1"
                              value={it.quantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 1;
                                const copy = [...purchaseItems];
                                copy[idx].quantity = val;
                                setPurchaseItems(copy);
                              }}
                              className="w-16 p-1 border rounded text-center font-bold"
                            />
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-slate-400 block">Unit Cost (RM)</span>
                            <input
                              type="number"
                              step="0.01"
                              value={it.costPrice}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                const copy = [...purchaseItems];
                                copy[idx].costPrice = val;
                                setPurchaseItems(copy);
                              }}
                              className="w-20 p-1 border rounded text-right font-mono font-bold"
                            />
                          </div>
                          <span className="font-bold text-slate-900 font-mono w-20 text-right pt-3">
                            {formatMYR(lineCost)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setPurchaseItems(purchaseItems.filter((_, i) => i !== idx))}
                            className="text-slate-400 hover:text-rose-600 p-1 pt-3"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t flex justify-between items-baseline">
                  <span className="font-bold text-slate-700">Total Purchase Cost:</span>
                  <span className="text-base font-black text-indigo-700 font-mono">
                    {formatMYR(totalCalculated)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Payment Channel</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="CASH">Cash Drawer</option>
                    <option value="QR">Bank Transfer (Maybank)</option>
                    <option value="CARD">Company Card</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="paidCheck"
                    checked={isPaid}
                    onChange={(e) => setIsPaid(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <label htmlFor="paidCheck" className="font-semibold text-slate-800 select-none cursor-pointer">
                    Paid Immediately (Uncheck if on 30-day Supplier Credit)
                  </label>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Purchase Notes</label>
                <input
                  type="text"
                  value={purchaseNotes}
                  onChange={(e) => setPurchaseNotes(e.target.value)}
                  placeholder="e.g. Batch shipment via J&T Express"
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
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm"
                >
                  {isSubmitting ? 'Receiving...' : 'Process Purchase & Stock In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
