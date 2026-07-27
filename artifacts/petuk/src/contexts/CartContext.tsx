import React, { createContext, useContext, useState, useMemo } from 'react';
import type { OrderItem, OrderInputOrderType, OrderInputPaymentMethod, Member, Coupon, Settings } from '@workspace/api-client-react';

interface CartState {
  items: OrderItem[];
  orderType: OrderInputOrderType;
  paymentMethod: OrderInputPaymentMethod;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  tableNumber?: number;
  memberPhone: string;
  memberInfo?: Member;
  couponCode: string;
  couponDiscount: number;
  couponType: 'fixed' | 'percent';
  manualDiscount: number;
  manualDiscountType: 'fixed' | 'percent';
  manualDiscountReason: string;
}

interface CartTotals {
  subtotal: number;
  memberDiscount: number;
  couponDiscountAmount: number;
  manualDiscountAmount: number;
  tax: number;
  deliveryFee: number;
  total: number;
}

interface CartContextType {
  state: CartState;
  updateState: (updates: Partial<CartState>) => void;
  addItem: (item: Omit<OrderItem, 'id'>) => void;
  removeItem: (index: number) => void;
  updateItemQty: (index: number, qty: number) => void;
  clearCart: () => void;
  calculateTotals: (settings?: Settings) => CartTotals;
}

const defaultState: CartState = {
  items: [],
  orderType: 'takeout',
  paymentMethod: 'cash',
  customerName: '',
  customerPhone: '',
  customerAddress: '',
  memberPhone: '',
  couponCode: '',
  couponDiscount: 0,
  couponType: 'fixed',
  manualDiscount: 0,
  manualDiscountType: 'fixed',
  manualDiscountReason: '',
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CartState>(defaultState);

  const updateState = (updates: Partial<CartState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const addItem = (item: Omit<OrderItem, 'id'>) => {
    setState(prev => {
      const existingIdx = prev.items.findIndex(i => i.name === item.name);
      if (existingIdx >= 0) {
        const newItems = [...prev.items];
        newItems[existingIdx].qty += item.qty;
        return { ...prev, items: newItems };
      }
      return {
        ...prev,
        items: [...prev.items, { ...item, id: Date.now() }]
      };
    });
  };

  const removeItem = (index: number) => {
    setState(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItemQty = (index: number, qty: number) => {
    if (qty <= 0) {
      removeItem(index);
      return;
    }
    setState(prev => {
      const newItems = [...prev.items];
      newItems[index].qty = qty;
      return { ...prev, items: newItems };
    });
  };

  const clearCart = () => setState(defaultState);

  const calculateTotals = (settings?: Settings): CartTotals => {
    const subtotal = state.items.reduce((sum, item) => sum + item.price * item.qty, 0);
    
    // Member Discount
    const memberPercent = state.memberInfo?.discountPercent || 0;
    const memberDiscount = subtotal * (memberPercent / 100);
    const afterMember = Math.max(0, subtotal - memberDiscount);

    // Coupon Discount
    const couponDiscountAmount = state.couponType === 'percent' 
      ? afterMember * (state.couponDiscount / 100) 
      : state.couponDiscount;
    const afterCoupon = Math.max(0, afterMember - couponDiscountAmount);

    // Manual Discount
    let manualDiscountAmount = state.manualDiscountType === 'percent'
      ? afterCoupon * (state.manualDiscount / 100)
      : state.manualDiscount;

    if (settings) {
      if (state.manualDiscountType === 'percent' && settings.maxCashierDiscountPercent > 0) {
        if (state.manualDiscount > settings.maxCashierDiscountPercent) {
          manualDiscountAmount = afterCoupon * (settings.maxCashierDiscountPercent / 100);
        }
      }
      if (settings.maxCashierDiscountAmount > 0 && manualDiscountAmount > settings.maxCashierDiscountAmount) {
        manualDiscountAmount = settings.maxCashierDiscountAmount;
      }
    }

    const afterAll = Math.max(0, afterCoupon - manualDiscountAmount);

    // Tax
    const tax = settings?.taxEnabled ? afterAll * (settings.taxRate / 100) : 0;

    // Delivery Fee
    const deliveryFee = (state.orderType === 'delivery' && settings?.deliveryFeeEnabled) ? settings.deliveryFee : 0;

    const total = afterAll + tax + deliveryFee;

    return {
      subtotal,
      memberDiscount,
      couponDiscountAmount,
      manualDiscountAmount,
      tax,
      deliveryFee,
      total
    };
  };

  return (
    <CartContext.Provider value={{ state, updateState, addItem, removeItem, updateItemQty, clearCart, calculateTotals }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
