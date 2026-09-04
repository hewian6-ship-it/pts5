import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { formatMYR, formatDateKL } from '../../lib/finance';
import { Product, ProductCategory, InventoryMovement, Supplier } from '../../types';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Barcode,
  History,
  Edit2,
  Sliders,
  X,
  RotateCcw,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

export const InventoryView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('ALL');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Add / Edit Modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formSku, setFormSku] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('Peace Tech');
  const [formCategory, setFormCategory] = useState<ProductCategory>('Accessories');
  const [formDescription, setFormDescription] = useState('');
  const [formSupplierId, setFormSupplierId] = useState('');
  const [formCostPrice, setFormCostPrice] = useState('');
  const [formSellingPrice, setFormSellingPrice] = useState('');
  const [formStock, setFormStock] = useState('10');
  const [formMinStock, setFormMinStock] = useState('3');
  const [formUnit, setFormUnit] = useState('Unit');
  const [formWarranty, setFormWarranty] = useState('1 Year');

  // Stock Adjustment Modal
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjType, setAdjType] = useState<'MANUAL_STOCK_IN' | 'MANUAL_STOCK_OUT' | 'ADJUSTMENT'>('MANUAL_STOCK_IN');
  const [adjQty, setAdjQty] = useState('1');
  const [adjReason, setAdjReason] = useState('');

  // Movement History Modal
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const [pRes, sRes] = await Promise.all([
        apiFetch<{ products: Product[]; categories: { id: string; name: string }[] }>('/api/products'),
        apiFetch<{ suppliers: Supplier[] }>('/api/suppliers'),
      ]);
      setProducts(pRes.products || []);
      setCategories(pRes.categories || []);
      setSuppliers(sRes.suppliers || []);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormSku(`SKU-${Date.now().toString().slice(-6)}`);
    setFormBarcode('');
    setFormName('');
    setFormBrand('Peace Tech');
    setFormCategory('Accessories');
    setFormDescription('');
    setFormSupplierId(suppliers.length > 0 ? suppliers[0].id : '');
    setFormCostPrice('0.00');
    setFormSellingPrice('0.00');
    setFormStock('10');
    setFormMinStock('3');
    setFormUnit('Unit');
    setFormWarranty('1 Year');
    setShowProductModal(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormSku(p.sku);
    setFormBarcode(p.barcode || '');
    setFormName(p.name);
    setFormBrand(p.brand || 'Peace Tech');
    setFormCategory(p.category);
    setFormDescription(p.description || '');
    setFormSupplierId(p.supplierId || '');
    setFormCostPrice(p.costPrice.toString());
    setFormSellingPrice(p.sellingPrice.toString());
    setFormStock(p.stockQuantity.toString());
    setFormMinStock(p.minStock.toString());
    setFormUnit(p.unit || 'Unit');
    setFormWarranty(p.warranty || '1 Year');
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        sku: formSku,
        barcode: formBarcode,
        name: formName,
        brand: formBrand,
        category: formCategory,
        description: formDescription,
        supplierId: formSupplierId || undefined,
        costPrice: parseFloat(formCostPrice) || 0,
        sellingPrice: parseFloat(formSellingPrice) || 0,
        stockQuantity: parseInt(formStock) || 0,
        minStock: parseInt(formMinStock) || 0,
        unit: formUnit,
        warranty: formWarranty,
      };

      if (editingProduct) {
        await apiFetch(`/api/products/${editingProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/api/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setShowProductModal(false);
      fetchInventory();
    } catch (err: any) {
      alert(err.message || 'Failed to save product.');
    }
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    try {
      const qtyNum = parseInt(adjQty) || 0;
      const change = adjType === 'MANUAL_STOCK_OUT' ? -Math.abs(qtyNum) : Math.abs(qtyNum);

      await apiFetch(`/api/products/${adjustingProduct.id}/adjust-stock`, {
        method: 'POST',
        body: JSON.stringify({
          type: adjType,
          quantityChange: change,
          reason: adjReason,
        }),
      });

      setAdjustingProduct(null);
      setAdjReason('');
      fetchInventory();
    } catch (err: any) {
      alert(err.message || 'Failed to adjust stock.');
    }
  };

  const openHistoryModal = async (p: Product) => {
    setHistoryProduct(p);
    setLoadingMovements(true);
    try {
      const res = await apiFetch<{ movements: InventoryMovement[] }>(
        `/api/inventory/movements?productId=${p.id}`
      );
      setMovements(res.movements || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingMovements(false);
    }
  };

  const filtered = products.filter((p) => {
    if (selectedCat !== 'ALL' && p.category !== selectedCat) return false;
    if (lowStockOnly && (p.category === 'Services' || p.stockQuantity > p.minStock)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Inventory & Hardware Catalog</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Strict stock tracking, barcodes, COGS valuation, and movement audit trails
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add New Hardware
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
              placeholder="Search by name, SKU, barcode, brand..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="py-2 px-3 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              lowStockOnly
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Low Stock Alerts Only
          </button>
        </div>
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase font-bold tracking-wider">
                <th className="py-3 px-4">Product & SKU</th>
                <th className="py-3 px-4">Barcode</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Cost (RM)</th>
                <th className="py-3 px-4 text-right">Selling (RM)</th>
                <th className="py-3 px-4 text-right">Gross Margin</th>
                <th className="py-3 px-4 text-center">Stock Level</th>
                <th className="py-3 px-4">Warranty</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    Loading inventory...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    No products found matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const isLow = p.category !== 'Services' && p.stockQuantity <= p.minStock;
                  const marginPct =
                    p.sellingPrice > 0
                      ? (((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100).toFixed(0)
                      : '0';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{p.name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                          <span>SKU: {p.sku}</span>
                          {p.brand && <span>• Brand: {p.brand}</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {p.barcode ? (
                          <span className="flex items-center gap-1">
                            <Barcode className="w-3 h-3 text-slate-400" /> {p.barcode}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">{formatMYR(p.costPrice)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{formatMYR(p.sellingPrice)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 font-mono">
                          +{marginPct}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {p.category === 'Services' ? (
                          <span className="text-slate-400 font-medium">Service (N/A)</span>
                        ) : (
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isLow
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {p.stockQuantity} {p.unit} (Min {p.minStock})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{p.warranty || '-'}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openHistoryModal(p)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Stock Movement Audit Log"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          {p.category !== 'Services' && (
                            <button
                              type="button"
                              onClick={() => {
                                setAdjustingProduct(p);
                                setAdjType('MANUAL_STOCK_IN');
                                setAdjQty('1');
                                setAdjReason('Manual Stock In');
                              }}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Manual Stock Adjustment"
                            >
                              <Sliders className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditModal(p)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Product"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
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

      {/* ADD / EDIT PRODUCT MODAL */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 p-6 space-y-4 text-xs my-8">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingProduct ? 'Edit Hardware Product' : 'Add New Hardware Product'}
              </h3>
              <button type="button" onClick={() => setShowProductModal(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">SKU Code *</label>
                  <input
                    type="text"
                    required
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    placeholder="e.g. SSD-KNG-NV3-1TB"
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Barcode (EAN / UPC)</label>
                  <input
                    type="text"
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    placeholder="Scan or type barcode"
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Product Name & Specifications *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Kingston NV3 1TB PCIe 4.0 NVMe M.2 SSD"
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg font-medium"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Category *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ProductCategory)}
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg font-semibold"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Brand</label>
                  <input
                    type="text"
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    placeholder="e.g. Kingston"
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Preferred Supplier</label>
                  <select
                    value={formSupplierId}
                    onChange={(e) => setFormSupplierId(e.target.value)}
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="">-- None / Direct --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.companyName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="font-semibold text-slate-700">Cost Price (MYR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formCostPrice}
                    onChange={(e) => setFormCostPrice(e.target.value)}
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Selling Price (MYR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formSellingPrice}
                    onChange={(e) => setFormSellingPrice(e.target.value)}
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg font-mono font-bold text-indigo-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="font-semibold text-slate-700">Initial Stock</label>
                  <input
                    type="number"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg text-center font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Min Alert</label>
                  <input
                    type="number"
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(e.target.value)}
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg text-center"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Unit</label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    placeholder="Unit / Set"
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg text-center"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Warranty</label>
                  <input
                    type="text"
                    value={formWarranty}
                    onChange={(e) => setFormWarranty(e.target.value)}
                    placeholder="3 Years"
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg text-center"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm"
                >
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STOCK ADJUSTMENT MODAL */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 p-5 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Adjust Stock: {adjustingProduct.name}
              </h3>
              <button type="button" onClick={() => setAdjustingProduct(null)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg flex justify-between items-center">
              <span>Current Physical Stock:</span>
              <span className="font-black text-slate-900 text-sm font-mono">
                {adjustingProduct.stockQuantity} {adjustingProduct.unit}
              </span>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700">Adjustment Type</label>
                <select
                  value={adjType}
                  onChange={(e: any) => setAdjType(e.target.value)}
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg font-semibold"
                >
                  <option value="MANUAL_STOCK_IN">Manual Stock In (+ Add Stock)</option>
                  <option value="MANUAL_STOCK_OUT">Manual Stock Out (- Reduce Stock / Damaged)</option>
                  <option value="ADJUSTMENT">General Inventory Correction</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Quantity Quantity *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjQty}
                  onChange={(e) => setAdjQty(e.target.value)}
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg font-bold font-mono text-base"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700">Reason / Reference *</label>
                <input
                  type="text"
                  required
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="e.g. Physical inventory count discrepancy / RMA replacement"
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MOVEMENT HISTORY AUDIT LOG MODAL */}
      {historyProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 p-6 space-y-4 text-xs my-8">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Stock Movement Audit Log: {historyProduct.name}
                </h3>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">SKU: {historyProduct.sku}</p>
              </div>
              <button type="button" onClick={() => setHistoryProduct(null)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3 text-center">Change</th>
                    <th className="py-2 px-3 text-center">Before &rarr; After</th>
                    <th className="py-2 px-3">Reason / Ref</th>
                    <th className="py-2 px-3 text-right">User</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-700 text-xs">
                  {loadingMovements ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        Loading audit trail...
                      </td>
                    </tr>
                  ) : movements.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        No movement history recorded yet.
                      </td>
                    </tr>
                  ) : (
                    movements.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono text-[11px]">
                          {formatDateKL(m.createdAt, 'dd/MM/yy HH:mm')}
                        </td>
                        <td className="py-2 px-3 font-semibold">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              m.type === 'SALE'
                                ? 'bg-rose-50 text-rose-700'
                                : m.type === 'PURCHASE' || m.type === 'MANUAL_STOCK_IN'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {m.type}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-bold font-mono">
                          <span className={m.quantity < 0 ? 'text-rose-600' : 'text-emerald-600'}>
                            {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-slate-500">
                          {m.beforeStock} &rarr; <span className="font-bold text-slate-900">{m.afterStock}</span>
                        </td>
                        <td className="py-2 px-3 text-[11px] text-slate-600">
                          {m.reason} {m.reference && <span className="font-mono text-slate-400">({m.reference})</span>}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-500">{m.user}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
