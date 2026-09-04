import React, { useState, useEffect, useRef } from 'react';
import { usePOS } from '../../context/POSContext';
import { apiFetch } from '../../lib/api';
import { formatMYR } from '../../lib/finance';
import { Product, ProductCategory, PaymentMethod, Invoice, BusinessSetting, Customer } from '../../types';
import {
  Search,
  Barcode,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Percent,
  CreditCard,
  Banknote,
  QrCode,
  UserPlus,
  RotateCcw,
  CheckCircle2,
  X,
  Tag,
  Receipt,
  Layers,
  Sparkles,
} from 'lucide-react';
import { InvoicePrintModal } from '../modals/InvoicePrintModal';

interface POSViewProps {
  settings: BusinessSetting | null;
}

export const POSView: React.FC<POSViewProps> = ({ settings }) => {
  const {
    cart,
    customers,
    selectedCustomerId,
    setSelectedCustomerId,
    selectedCustomer,
    customerDeposits,
    selectedDepositId,
    setSelectedDepositId,
    overallDiscountType,
    setOverallDiscountType,
    overallDiscountValue,
    setOverallDiscountValue,
    addToCart,
    updateQuantity,
    updateItemDiscount,
    removeFromCart,
    clearCart,
    subtotalGross,
    totalItemDiscounts,
    overallDiscountAmount,
    finalTotal,
    checkout,
    loadCustomers,
    isProcessing,
  } = usePOS();

  // Search & Catalog State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Payment Checkout Modal
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [checkoutNotes, setCheckoutNotes] = useState<string>('');
  const [lastInvoice, setLastInvoice] = useState<Invoice | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Item Discount Modal State
  const [discountingItem, setDiscountingItem] = useState<{
    productId: string;
    productName: string;
    unitPrice: number;
    currentType: 'NONE' | 'PERCENT' | 'FIXED';
    currentValue: number;
  } | null>(null);
  const [itemDiscType, setItemDiscType] = useState<'NONE' | 'PERCENT' | 'FIXED'>('NONE');
  const [itemDiscVal, setItemDiscVal] = useState<number>(0);

  // Overall Discount Modal State
  const [showOverallDiscModal, setShowOverallDiscModal] = useState(false);
  const [tempOverallType, setTempOverallType] = useState<'NONE' | 'PERCENT' | 'FIXED'>('NONE');
  const [tempOverallVal, setTempOverallVal] = useState<number>(0);

  // Quick Customer Modal
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  // Load Products Catalog
  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const res = await apiFetch<{ products: Product[]; categories: { id: string; name: string }[] }>(
        '/api/products'
      );
      setProducts(res.products || []);
      setCategories(res.categories || []);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Global Keyboard listener for USB Barcode scanner and hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Hotkey F2: focus search
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      // Hotkey F8: trigger checkout if cart has items
      if (e.key === 'F8') {
        e.preventDefault();
        if (cart.length > 0) {
          setShowCheckoutModal(true);
        }
        return;
      }
      // Hotkey ESC: clear cart or close modal
      if (e.key === 'Escape') {
        if (showCheckoutModal) {
          setShowCheckoutModal(false);
        } else if (discountingItem) {
          setDiscountingItem(null);
        } else if (showOverallDiscModal) {
          setShowOverallDiscModal(false);
        }
      }

      // USB Barcode Scanner fast buffer detection
      // Barcode scanners typically send keystrokes within 20-50ms intervals followed by Enter
      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // Ignore standard input typing if focused on form fields other than scanner
      const activeEl = document.activeElement;
      const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      if (e.key === 'Enter') {
        if (barcodeBufferRef.current.length >= 4 && timeDiff < 100) {
          e.preventDefault();
          const scannedCode = barcodeBufferRef.current;
          barcodeBufferRef.current = '';
          handleScannedBarcode(scannedCode);
        } else {
          barcodeBufferRef.current = '';
        }
      } else if (e.key.length === 1) {
        if (timeDiff < 60 || barcodeBufferRef.current.length === 0) {
          barcodeBufferRef.current += e.key;
        } else {
          barcodeBufferRef.current = e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, showCheckoutModal, discountingItem, showOverallDiscModal, products]);

  const handleScannedBarcode = (code: string) => {
    const term = code.trim().toLowerCase();
    const product = products.find(
      (p) => (p.barcode && p.barcode.toLowerCase() === term) || p.sku.toLowerCase() === term
    );
    if (product) {
      addToCart(product);
      setSearchQuery('');
    }
  };

  // Filter Catalog Products
  const filteredProducts = products.filter((p) => {
    if (selectedCategory !== 'ALL' && p.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchBarcode = p.barcode && p.barcode.toLowerCase().includes(q);
      const matchSku = p.sku.toLowerCase().includes(q);
      const matchName = p.name.toLowerCase().includes(q);
      const matchBrand = p.brand && p.brand.toLowerCase().includes(q);
      return matchBarcode || matchSku || matchName || matchBrand;
    }
    return true;
  });

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      const cashVal = paymentMethod === 'CASH' ? parseFloat(cashReceived) || finalTotal : undefined;
      const res = await checkout(paymentMethod, cashVal, checkoutNotes);
      if (res.success && res.invoice) {
        setShowCheckoutModal(false);
        setCashReceived('');
        setCheckoutNotes('');
        setLastInvoice(res.invoice);
        setShowPrintModal(true);
        fetchProducts(); // Refresh stock
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Checkout failed.');
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    try {
      const res = await apiFetch<{ success: boolean; customer: Customer }>('/api/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: newCustName,
          phone: newCustPhone,
          email: newCustEmail,
          address: newCustAddress,
        }),
      });
      if (res.success && res.customer) {
        await loadCustomers();
        setSelectedCustomerId(res.customer.id);
        setShowNewCustomerModal(false);
        setNewCustName('');
        setNewCustPhone('');
        setNewCustEmail('');
        setNewCustAddress('');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create customer');
    }
  };

  const handleApplyItemDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!discountingItem) return;
    updateItemDiscount(discountingItem.productId, itemDiscType, Number(itemDiscVal) || 0);
    setDiscountingItem(null);
  };

  const handleApplyOverallDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    setOverallDiscountType(tempOverallType);
    setOverallDiscountValue(Number(tempOverallVal) || 0);
    setShowOverallDiscModal(false);
  };

  const cashValNum = parseFloat(cashReceived) || 0;
  const changeAmt = Math.max(0, cashValNum - finalTotal);

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col lg:flex-row gap-5 overflow-hidden">
      {/* LEFT COLUMN: Product Search, Category Pills & Grid Catalog */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {/* Top Search & Barcode Bar */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/70 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product by name, SKU, or scan barcode (F2)..."
              className="w-full pl-9 pr-8 py-2 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold shrink-0 border border-blue-100">
            <Barcode className="w-4 h-4" />
            <span className="hidden sm:inline">Scanner Active</span>
          </div>
        </div>

        {/* Category Horizontal Filter Pills */}
        <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none bg-white">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-[#0f172a] text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Products
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat.name
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Cards Catalog Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loadingProducts ? (
            <div className="h-full flex items-center justify-center text-xs text-gray-400 font-medium">
              Loading inventory catalog...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-xs text-gray-400 p-8 text-center">
              <ShoppingBag className="w-8 h-8 text-gray-300 mb-2" />
              <p className="font-bold text-gray-700">No products found</p>
              <p className="text-[11px] text-gray-400 mt-1">Try modifying your search or selected category filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((prod) => {
                const isOutOfStock = prod.category !== 'Services' && prod.stockQuantity <= 0;
                const isLowStock = prod.category !== 'Services' && prod.stockQuantity <= prod.minStock;

                return (
                  <div
                    key={prod.id}
                    onClick={() => {
                      if (!isOutOfStock) addToCart(prod);
                    }}
                    className={`relative p-3.5 rounded-2xl border flex flex-col justify-between transition-all select-none text-left ${
                      isOutOfStock
                        ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                        : 'bg-white border-gray-200 hover:border-blue-500 hover:shadow-md hover:-translate-y-0.5 cursor-pointer shadow-2xs'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-1">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-md">
                          {prod.category}
                        </span>
                        {prod.category !== 'Services' && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                              isOutOfStock
                                ? 'bg-rose-100 text-rose-700'
                                : isLowStock
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {prod.stockQuantity} {prod.unit}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-gray-900 mt-2.5 line-clamp-2 leading-snug">
                        {prod.name}
                      </h4>
                      <p className="text-[10px] text-gray-400 mt-0.5 truncate font-mono">
                        {prod.sku}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-baseline justify-between">
                      <span className="text-sm font-black text-gray-900 font-mono">
                        {formatMYR(prod.sellingPrice)}
                      </span>
                      {prod.warranty && (
                        <span className="text-[9px] text-gray-400 font-medium truncate max-w-[70px]">
                          {prod.warranty}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: POS Cart & Instant Checkout Engine */}
      <div className="w-full lg:w-[420px] bg-white rounded-2xl border border-gray-200 shadow-xs flex flex-col overflow-hidden">
        {/* Cart Top Header: Customer Selection */}
        <div className="p-3.5 border-b border-slate-200 bg-slate-50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Customer Assignment
            </span>
            <button
              type="button"
              onClick={() => setShowNewCustomerModal(true)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
            >
              <UserPlus className="w-3.5 h-3.5" /> + New Customer
            </button>
          </div>

          <div className="flex gap-2">
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone && c.phone !== '-' ? `(${c.phone})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Customer Open Deposit Banner if available */}
          {customerDeposits.length > 0 && (
            <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold text-emerald-900 text-[11px]">Active Customer Deposit Available</p>
                <p className="text-[10px] text-emerald-700">
                  {customerDeposits[0].depositNo}: {formatMYR(customerDeposits[0].remainingAmount)}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSelectedDepositId(
                    selectedDepositId ? '' : customerDeposits[0].id
                  )
                }
                className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                  selectedDepositId
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                }`}
              >
                {selectedDepositId ? 'Applied' : 'Apply Deposit'}
              </button>
            </div>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-slate-100">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
              <ShoppingBag className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-600">Cart is Empty</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                Click items in the catalog or scan barcodes to add hardware to invoice.
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product.id} className="pt-2 first:pt-0 text-xs">
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-2">
                    <p className="font-bold text-slate-900 leading-tight">{item.product.name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                      <span>{item.product.sku}</span>
                      <span>•</span>
                      <span className="font-mono">{formatMYR(item.unitPrice)}/ea</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFromCart(item.product.id)}
                    className="p-1 text-slate-300 hover:text-rose-600 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Quantity Controls & Line Discount & Subtotal */}
                <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-50">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center font-bold text-slate-900 font-mono">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center"
                    >
                      <Plus className="w-3 h-3" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDiscountingItem({
                          productId: item.product.id,
                          productName: item.product.name,
                          unitPrice: item.unitPrice,
                          currentType: item.discountType,
                          currentValue: item.discountValue,
                        });
                        setItemDiscType(item.discountType);
                        setItemDiscVal(item.discountValue);
                      }}
                      className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-0.5 ${
                        item.discountAmount > 0
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Tag className="w-2.5 h-2.5" />
                      {item.discountAmount > 0 ? `-${formatMYR(item.discountAmount)}` : 'Disc'}
                    </button>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-slate-900 font-mono">
                      {formatMYR(item.subtotal)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Bottom Summary & Checkout Button */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
          <div className="flex justify-between text-xs text-slate-600">
            <span>Gross Subtotal:</span>
            <span className="font-mono font-medium">{formatMYR(subtotalGross)}</span>
          </div>

          {totalItemDiscounts > 0 && (
            <div className="flex justify-between text-xs text-rose-600">
              <span>Item Discounts:</span>
              <span className="font-mono">-{formatMYR(totalItemDiscounts)}</span>
            </div>
          )}

          <div className="flex justify-between items-center text-xs text-slate-600">
            <button
              type="button"
              onClick={() => {
                setTempOverallType(overallDiscountType);
                setTempOverallVal(overallDiscountValue);
                setShowOverallDiscModal(true);
              }}
              className="text-indigo-600 font-semibold hover:underline flex items-center gap-1"
            >
              <Percent className="w-3 h-3" />
              {overallDiscountAmount > 0
                ? `Overall Discount (${overallDiscountType === 'PERCENT' ? `${overallDiscountValue}%` : `RM ${overallDiscountValue}`}):`
                : '+ Overall Discount'}
            </button>
            <span className="font-mono text-rose-600 font-medium">
              {overallDiscountAmount > 0 ? `-${formatMYR(overallDiscountAmount)}` : 'RM 0.00'}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
            <span className="text-sm font-black text-slate-900">Total Payable:</span>
            <span className="text-2xl font-black text-indigo-700 font-mono">
              {formatMYR(finalTotal)}
            </span>
          </div>

          <div className="pt-2 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={clearCart}
              disabled={cart.length === 0}
              className="py-2 px-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors disabled:opacity-40"
            >
              Clear (ESC)
            </button>
            <button
              type="button"
              onClick={() => {
                setPaymentMethod('CASH');
                setCashReceived(finalTotal.toString());
                setShowCheckoutModal(true);
              }}
              disabled={cart.length === 0}
              className="col-span-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              CHECKOUT (F8)
            </button>
          </div>
        </div>
      </div>

      {/* CHECKOUT PAYMENT MODAL */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Settlement & Payment</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="mx-5 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCheckoutSubmit} className="p-5 space-y-4">
              <div className="p-3.5 bg-slate-900 text-white rounded-xl text-center">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Amount Due</span>
                <h2 className="text-3xl font-black font-mono mt-0.5 text-white">
                  {formatMYR(finalTotal)}
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Customer: <span className="text-indigo-300 font-semibold">{selectedCustomer?.name}</span>
                </p>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Settlement Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('CASH');
                      setCashReceived(finalTotal.toString());
                    }}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === 'CASH'
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 font-bold'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Banknote className="w-5 h-5" />
                    <span className="text-xs">Cash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('QR')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === 'QR'
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 font-bold'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <QrCode className="w-5 h-5" />
                    <span className="text-xs">DuitNow QR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CARD')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === 'CARD'
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 font-bold'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span className="text-xs">Card</span>
                  </button>
                </div>
              </div>

              {/* Cash Input Controls */}
              {paymentMethod === 'CASH' && (
                <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Cash Tendered (MYR)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-base font-bold font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Quick Cash Bills */}
                  <div className="flex gap-1.5">
                    {[50, 100, 200, 500].map((bill) => (
                      <button
                        key={bill}
                        type="button"
                        onClick={() => setCashReceived(bill.toString())}
                        className="flex-1 py-1 bg-white border border-slate-200 hover:border-slate-400 rounded text-xs font-mono font-semibold text-slate-700"
                      >
                        RM{bill}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCashReceived(finalTotal.toString())}
                      className="flex-1 py-1 bg-indigo-100 hover:bg-indigo-200 rounded text-xs font-semibold text-indigo-800"
                    >
                      Exact
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-600">Change Returned:</span>
                    <span className="text-base font-black text-emerald-600 font-mono">
                      {formatMYR(changeAmt)}
                    </span>
                  </div>
                </div>
              )}

              {/* DuitNow QR Info */}
              {paymentMethod === 'QR' && (
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs text-slate-700 space-y-1">
                  <p className="font-bold text-indigo-900">DuitNow QR Instant Transfer</p>
                  <p>Bank: <span className="font-semibold text-slate-900">{settings?.qrBankName || 'Maybank'}</span></p>
                  <p>Account: <span className="font-semibold font-mono text-slate-900">{settings?.qrAccountNo || '5142 8900 1234'}</span></p>
                  <p>Holder: <span className="font-semibold text-slate-900">{settings?.qrAccountHolder || 'PEACE TECH SOLUTION'}</span></p>
                </div>
              )}

              {/* Optional Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Invoice Notes (Optional)
                </label>
                <input
                  type="text"
                  value={checkoutNotes}
                  onChange={(e) => setCheckoutNotes(e.target.value)}
                  placeholder="e.g. Serial numbers / special customer instructions"
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? 'Processing Transaction...' : 'COMPLETE SALE & PRINT INVOICE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD CUSTOMER MODAL */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-sm bg-white rounded-xl shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900">Add New Customer</h3>
              <button type="button" onClick={() => setShowNewCustomerModal(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Customer / Company Name *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Apex Engineering Sdn Bhd"
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Phone Number</label>
                <input
                  type="text"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="e.g. +60 12-345 6789"
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Email Address</label>
                <input
                  type="email"
                  value={newCustEmail}
                  onChange={(e) => setNewCustEmail(e.target.value)}
                  placeholder="e.g. accounts@apex.com"
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Billing Address</label>
                <textarea
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="Street, City, Postcode"
                  rows={2}
                  className="w-full mt-1 p-2 border border-slate-300 rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg"
              >
                Save & Select Customer
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ITEM DISCOUNT MODAL */}
      {discountingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-sm bg-white rounded-xl shadow-2xl border border-slate-200 p-5 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900">Apply Item Discount</h3>
              <button type="button" onClick={() => setDiscountingItem(null)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div>
              <p className="font-semibold text-slate-800">{discountingItem.productName}</p>
              <p className="text-slate-500 font-mono">Unit Price: {formatMYR(discountingItem.unitPrice)}</p>
            </div>
            <form onSubmit={handleApplyItemDiscount} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setItemDiscType('NONE')}
                  className={`py-1.5 rounded-lg border font-semibold ${
                    itemDiscType === 'NONE' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  None
                </button>
                <button
                  type="button"
                  onClick={() => setItemDiscType('PERCENT')}
                  className={`py-1.5 rounded-lg border font-semibold ${
                    itemDiscType === 'PERCENT' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Percentage (%)
                </button>
                <button
                  type="button"
                  onClick={() => setItemDiscType('FIXED')}
                  className={`py-1.5 rounded-lg border font-semibold ${
                    itemDiscType === 'FIXED' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Fixed (MYR)
                </button>
              </div>

              {itemDiscType !== 'NONE' && (
                <div>
                  <label className="font-semibold text-slate-700">
                    {itemDiscType === 'PERCENT' ? 'Discount Percentage (%)' : 'Discount Amount (MYR)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemDiscVal}
                    onChange={(e) => setItemDiscVal(parseFloat(e.target.value) || 0)}
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg"
              >
                Apply Discount
              </button>
            </form>
          </div>
        </div>
      )}

      {/* OVERALL DISCOUNT MODAL */}
      {showOverallDiscModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-sm bg-white rounded-xl shadow-2xl border border-slate-200 p-5 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900">Overall Invoice Discount</h3>
              <button type="button" onClick={() => setShowOverallDiscModal(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleApplyOverallDiscount} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTempOverallType('NONE')}
                  className={`py-1.5 rounded-lg border font-semibold ${
                    tempOverallType === 'NONE' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  None
                </button>
                <button
                  type="button"
                  onClick={() => setTempOverallType('PERCENT')}
                  className={`py-1.5 rounded-lg border font-semibold ${
                    tempOverallType === 'PERCENT' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Percentage (%)
                </button>
                <button
                  type="button"
                  onClick={() => setTempOverallType('FIXED')}
                  className={`py-1.5 rounded-lg border font-semibold ${
                    tempOverallType === 'FIXED' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Fixed (MYR)
                </button>
              </div>

              {tempOverallType !== 'NONE' && (
                <div>
                  <label className="font-semibold text-slate-700">
                    {tempOverallType === 'PERCENT' ? 'Discount Percentage (%)' : 'Discount Amount (MYR)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={tempOverallVal}
                    onChange={(e) => setTempOverallVal(parseFloat(e.target.value) || 0)}
                    className="w-full mt-1 p-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg"
              >
                Apply Overall Discount
              </button>
            </form>
          </div>
        </div>
      )}

      {/* POST-CHECKOUT PRINT MODAL */}
      {showPrintModal && lastInvoice && settings && (
        <InvoicePrintModal
          invoice={lastInvoice}
          settings={settings}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
};
