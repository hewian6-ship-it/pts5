import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem, Customer, PaymentMethod, Invoice, Deposit } from '../types';
import { calculateItemDiscount, calculateOverallDiscount, roundMoney } from '../lib/finance';
import { apiFetch } from '../lib/api';

interface POSContextType {
  cart: CartItem[];
  customers: Customer[];
  selectedCustomerId: string;
  setSelectedCustomerId: (id: string) => void;
  selectedCustomer: Customer | undefined;
  customerDeposits: Deposit[];
  selectedDepositId: string;
  setSelectedDepositId: (id: string) => void;
  overallDiscountType: 'NONE' | 'PERCENT' | 'FIXED';
  setOverallDiscountType: (type: 'NONE' | 'PERCENT' | 'FIXED') => void;
  overallDiscountValue: number;
  setOverallDiscountValue: (val: number) => void;
  addToCart: (product: Product, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateItemDiscount: (
    productId: string,
    discountType: 'NONE' | 'PERCENT' | 'FIXED',
    discountValue: number
  ) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  scanBarcode: (barcodeOrSku: string) => Promise<{ found: boolean; product?: Product }>;
  subtotalGross: number;
  totalItemDiscounts: number;
  overallDiscountAmount: number;
  finalTotal: number;
  checkout: (
    paymentMethod: PaymentMethod,
    cashReceived?: number,
    notes?: string
  ) => Promise<{ success: boolean; invoice: Invoice }>;
  loadCustomers: () => Promise<void>;
  isProcessing: boolean;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

export const POSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('cust_walkin');
  const [customerDeposits, setCustomerDeposits] = useState<Deposit[]>([]);
  const [selectedDepositId, setSelectedDepositId] = useState<string>('');
  const [overallDiscountType, setOverallDiscountType] = useState<'NONE' | 'PERCENT' | 'FIXED'>('NONE');
  const [overallDiscountValue, setOverallDiscountValue] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadCustomers = async () => {
    try {
      const res = await apiFetch<{ customers: Customer[] }>('/api/customers');
      setCustomers(res.customers || []);
      if (res.customers && res.customers.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(res.customers[0].id);
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // Fetch open deposits when customer changes
  useEffect(() => {
    if (!selectedCustomerId) return;
    apiFetch<{ deposits: Deposit[] }>('/api/deposits')
      .then((res) => {
        const open = (res.deposits || []).filter(
          (d) => d.customerId === selectedCustomerId && (d.status === 'OPEN' || d.status === 'PARTIAL')
        );
        setCustomerDeposits(open);
        setSelectedDepositId('');
      })
      .catch(() => setCustomerDeposits([]));
  }, [selectedCustomerId]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const addToCart = (product: Product, quantity = 1) => {
    setCart((prev) => {
      const index = prev.findIndex((item) => item.product.id === product.id);
      if (index > -1) {
        const existing = prev[index];
        const newQty = existing.quantity + quantity;
        const { discountAmount, subtotal } = calculateItemDiscount(
          existing.unitPrice,
          newQty,
          existing.discountType,
          existing.discountValue
        );

        const updated = [...prev];
        updated[index] = {
          ...existing,
          quantity: newQty,
          discountAmount,
          subtotal,
        };
        return updated;
      } else {
        const { discountAmount, subtotal } = calculateItemDiscount(
          product.sellingPrice,
          quantity,
          'NONE',
          0
        );

        return [
          ...prev,
          {
            product,
            quantity,
            unitPrice: product.sellingPrice,
            costPrice: product.costPrice,
            discountType: 'NONE',
            discountValue: 0,
            discountAmount,
            subtotal,
          },
        ];
      }
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const { discountAmount, subtotal } = calculateItemDiscount(
            item.unitPrice,
            quantity,
            item.discountType,
            item.discountValue
          );
          return {
            ...item,
            quantity,
            discountAmount,
            subtotal,
          };
        }
        return item;
      })
    );
  };

  const updateItemDiscount = (
    productId: string,
    discountType: 'NONE' | 'PERCENT' | 'FIXED',
    discountValue: number
  ) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const { discountAmount, subtotal } = calculateItemDiscount(
            item.unitPrice,
            item.quantity,
            discountType,
            discountValue
          );
          return {
            ...item,
            discountType,
            discountValue,
            discountAmount,
            subtotal,
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setOverallDiscountType('NONE');
    setOverallDiscountValue(0);
    setSelectedDepositId('');
  };

  const scanBarcode = async (barcodeOrSku: string): Promise<{ found: boolean; product?: Product }> => {
    try {
      const res = await apiFetch<{ matchType: string; product?: Product; products?: Product[] }>(
        `/api/pos/search?q=${encodeURIComponent(barcodeOrSku.trim())}`
      );

      if (res.product) {
        addToCart(res.product);
        return { found: true, product: res.product };
      } else if (res.products && res.products.length === 1) {
        addToCart(res.products[0]);
        return { found: true, product: res.products[0] };
      }
      return { found: false };
    } catch {
      return { found: false };
    }
  };

  // Calculations
  const subtotalGross = roundMoney(
    cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0)
  );
  const totalItemDiscounts = roundMoney(
    cart.reduce((acc, item) => acc + item.discountAmount, 0)
  );
  const itemsNetSubtotal = roundMoney(subtotalGross - totalItemDiscounts);
  const overallDiscountAmount = calculateOverallDiscount(
    itemsNetSubtotal,
    overallDiscountType,
    overallDiscountValue
  );
  const finalTotal = roundMoney(Math.max(0, itemsNetSubtotal - overallDiscountAmount));

  const checkout = async (
    paymentMethod: PaymentMethod,
    cashReceived?: number,
    notes?: string
  ): Promise<{ success: boolean; invoice: Invoice }> => {
    if (cart.length === 0) {
      throw new Error('Cart is empty.');
    }

    setIsProcessing(true);
    try {
      const payload = {
        customerId: selectedCustomerId || 'cust_walkin',
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          discountType: item.discountType,
          discountValue: item.discountValue,
        })),
        overallDiscountType,
        overallDiscountValue,
        paymentMethod,
        cashReceived,
        appliedDepositId: selectedDepositId || undefined,
        notes,
      };

      const res = await apiFetch<{ success: boolean; invoice: Invoice }>('/api/pos/checkout', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        clearCart();
        loadCustomers();
      }

      return res;
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <POSContext.Provider
      value={{
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
        scanBarcode,
        subtotalGross,
        totalItemDiscounts,
        overallDiscountAmount,
        finalTotal,
        checkout,
        loadCustomers,
        isProcessing,
      }}
    >
      {children}
    </POSContext.Provider>
  );
};

export const usePOS = () => {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
};
