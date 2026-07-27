import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  useListMenuItems, useGetSettings, useCreateOrder,
  useLookupMember, useListRiders, useAssignRider, useValidateCoupon
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import {
  Flame, Plus, Minus, Trash2, Search, User, Printer,
  X, Check, Utensils, ShoppingBag, Bike, Ticket, Tag,
  ChevronLeft, DollarSign, Loader2, RefreshCw, Home
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────
interface ReceiptData {
  orderId: string;
  total: number;
  items: Array<{ name: string; price: number; qty: number }>;
  subtotal: number;
  memberDiscount: number;
  couponDiscount: number;
  manualDiscount: number;
  tax: number;
  deliveryFee: number;
  paymentMethod: string;
  orderType: string;
  tendered: number;
  change: number;
  customerName?: string;
  tableNumber?: number;
  timestamp: string;
  restaurantName: string;
  restaurantAddress: string;
  restaurantPhone: string;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  Starters: '🍗', Chinese: '🍜', Burgers: '🍔', Rice: '🍚',
  Pizza: '🍕', Drinks: '🥤', Desserts: '🍰',
};

// ── Modal component ────────────────────────────────────────────────────────
function Modal({ isOpen, onClose, title, children, wide = false }: {
  isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className={`bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden ${wide ? 'w-full max-w-2xl' : 'w-full max-w-md'} max-h-[90vh]`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50">
          <h2 className="font-black text-lg uppercase tracking-wide">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

// ── Receipt Print CSS (injected once) ─────────────────────────────────────
const RECEIPT_STYLE = `
@media print {
  body > *:not(#petuk-receipt) { display: none !important; }
  #petuk-receipt { display: block !important; }
  @page { margin: 4mm; size: 80mm auto; }
}
#petuk-receipt { display: none; font-family: 'Courier New', monospace; font-size: 11px; width: 72mm; }
#petuk-receipt .divider { border-top: 1px dashed #000; margin: 4px 0; }
#petuk-receipt .center { text-align: center; }
#petuk-receipt .bold { font-weight: bold; }
#petuk-receipt .row { display: flex; justify-content: space-between; }
#petuk-receipt .big { font-size: 14px; font-weight: bold; text-align: center; }
#petuk-receipt .sm { font-size: 10px; }
`;

// ── Main POS Component ─────────────────────────────────────────────────────
export default function AdminPOS() {
  const { state, addItem, removeItem, updateItemQty, updateState, clearCart, calculateTotals } = useCart();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const [isPayModal, setIsPayModal] = useState(false);
  const [isRiderModal, setIsRiderModal] = useState(false);
  const [isReceiptModal, setIsReceiptModal] = useState(false);
  const [isDiscountModal, setIsDiscountModal] = useState(false);
  const [isMemberModal, setIsMemberModal] = useState(false);
  const [isCouponModal, setIsCouponModal] = useState(false);

  const [tendered, setTendered] = useState('');
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [memberPhone, setMemberPhone] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [manualDiscountInput, setManualDiscountInput] = useState('');
  const [manualDiscountReason, setManualDiscountReason] = useState('');

  const { data: menuItems = [] } = useListMenuItems();
  const { data: settings } = useGetSettings();
  const { data: riders = [] } = useListRiders();

  const totals = calculateTotals(settings);
  const totalItems = state.items.reduce((s, i) => s + i.qty, 0);
  const change = Math.max(0, parseFloat(tendered || '0') - totals.total);

  const categories = Array.from(new Set(menuItems.map(i => i.category)));
  const filtered = menuItems.filter(i => {
    if (!i.isAvailable) return false;
    if (category && i.category !== category) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // — Member lookup —
  const { refetch: doMemberLookup, isFetching: memberLoading } = useLookupMember(
    { phone: memberPhone },
    { query: { enabled: false } }
  );

  // — Coupon —
  const validateCoupon = useValidateCoupon({
    mutation: {
      onSuccess: (data) => {
        if (data.valid) {
          updateState({ couponCode: couponInput.toUpperCase(), couponDiscount: data.discount, couponType: 'fixed' });
          toast({ title: `✅ Coupon applied: −৳${data.discount}` });
          setIsCouponModal(false);
        } else {
          toast({ title: '❌ ' + data.message, variant: 'destructive' });
        }
      }
    }
  });

  // — Assign rider —
  const assignRider = useAssignRider({
    mutation: {
      onSuccess: () => {
        toast({ title: '✅ Rider assigned!' });
        setIsRiderModal(false);
        setPendingOrderId(null);
        queryClient.invalidateQueries({ queryKey: ['/api/riders'] });
      }
    }
  });

  // — Create order —
  const createOrder = useCreateOrder({
    mutation: {
      onSuccess: (res) => {
        const t = calculateTotals(settings);
        setReceiptData({
          orderId: res.orderId,
          total: res.total,
          items: state.items.map(i => ({ name: i.name, price: i.price, qty: i.qty })),
          subtotal: t.subtotal,
          memberDiscount: t.memberDiscount,
          couponDiscount: t.couponDiscountAmount,
          manualDiscount: t.manualDiscountAmount,
          tax: t.tax,
          deliveryFee: t.deliveryFee,
          paymentMethod: state.paymentMethod,
          orderType: state.orderType,
          tendered: parseFloat(tendered || '0'),
          change,
          customerName: state.customerName || undefined,
          tableNumber: state.tableNumber,
          timestamp: new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' }),
          restaurantName: settings?.restaurantName ?? 'PETUK',
          restaurantAddress: settings?.address ?? 'Dhaka',
          restaurantPhone: settings?.phone ?? '',
        });
        clearCart();
        setCouponInput('');
        setManualDiscountInput('');
        setManualDiscountReason('');
        setMemberPhone('');
        setTendered('');
        setIsPayModal(false);
        setIsReceiptModal(true);
        queryClient.invalidateQueries({ queryKey: ['/api/orders'] });

        if (state.orderType === 'delivery') {
          setPendingOrderId(res.orderId);
        }
      },
      onError: () => {
        toast({ title: 'Order failed', description: 'Please try again.', variant: 'destructive' });
      }
    }
  });

  // — Keyboard shortcuts —
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F2' || (e.key === '/' && document.activeElement?.tagName !== 'INPUT')) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'F9') { e.preventDefault(); if (totalItems > 0) setIsPayModal(true); }
      if (e.key === 'F8') { e.preventDefault(); setIsMemberModal(true); }
      if (e.key === 'F7') { e.preventDefault(); setIsCouponModal(true); }
      if (e.key === 'F6') { e.preventDefault(); setIsDiscountModal(true); }
      if (e.key === 'Escape' && search) setSearch('');
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [totalItems, search]);

  // — Member lookup handler —
  const handleMemberLookup = async () => {
    if (!memberPhone.trim()) return;
    const res = await doMemberLookup();
    if (res.data?.found && res.data.member) {
      updateState({ memberPhone: res.data.member.phone, memberInfo: res.data.member });
      toast({ title: `👋 ${res.data.member.name}`, description: `${res.data.member.tier} · ${res.data.member.discountPercent ?? 0}% discount` });
      setIsMemberModal(false);
    } else {
      toast({ title: 'Member not found', variant: 'destructive' });
    }
  };

  // — Apply manual discount —
  const handleManualDiscount = () => {
    const v = parseFloat(manualDiscountInput);
    if (isNaN(v) || v < 0) return;
    updateState({ manualDiscount: v, manualDiscountType: 'fixed', manualDiscountReason });
    setIsDiscountModal(false);
  };

  // — Process payment —
  const handlePayment = () => {
    if (state.orderType === 'delivery' && !state.customerAddress.trim()) {
      toast({ title: 'Address required for delivery', variant: 'destructive' });
      return;
    }
    createOrder.mutate({
      data: {
        items: state.items.map(i => ({ id: i.id ?? 0, name: i.name, price: i.price, qty: i.qty, category: i.category })),
        orderType: state.orderType as any,
        paymentMethod: state.paymentMethod as any,
        customerName: state.customerName || undefined,
        customerPhone: state.customerPhone || undefined,
        customerAddress: state.customerAddress || undefined,
        tableNumber: state.tableNumber,
        memberPhone: state.memberPhone || undefined,
        couponCode: state.couponCode || undefined,
        manualDiscount: totals.manualDiscountAmount || undefined,
        manualDiscountReason: state.manualDiscountReason || undefined,
        source: 'pos',
        riderName: undefined,
      }
    });
  };

  // — Print receipt —
  const handlePrint = () => {
    if (!receiptData) return;
    window.print();
  };

  // — After receipt closed, show rider modal if needed —
  const handleReceiptClose = () => {
    setIsReceiptModal(false);
    if (pendingOrderId) {
      setTimeout(() => setIsRiderModal(true), 200);
    }
  };

  const availableRiders = riders.filter(r => r.status === 'Available');

  return (
    <>
      {/* Inject receipt print styles */}
      <style dangerouslySetInnerHTML={{ __html: RECEIPT_STYLE }} />

      {/* ── Hidden Receipt DOM (for printing) ── */}
      {receiptData && (
        <div id="petuk-receipt">
          <div className="center bold" style={{ fontSize: 16 }}>{receiptData.restaurantName}</div>
          <div className="center sm">{receiptData.restaurantAddress}</div>
          <div className="center sm">Tel: {receiptData.restaurantPhone}</div>
          <div className="divider" />
          <div className="center bold">ORDER #{receiptData.orderId}</div>
          <div className="center sm">{receiptData.timestamp}</div>
          <div className="sm">Type: {receiptData.orderType?.replace('_', ' ').toUpperCase()}</div>
          {receiptData.customerName && <div className="sm">Customer: {receiptData.customerName}</div>}
          {receiptData.tableNumber && <div className="sm">Table: #{receiptData.tableNumber}</div>}
          <div className="divider" />
          {receiptData.items.map((item, i) => (
            <div key={i} className="row sm">
              <span>{item.qty}x {item.name}</span>
              <span>৳{(item.price * item.qty).toFixed(2)}</span>
            </div>
          ))}
          <div className="divider" />
          <div className="row sm"><span>Subtotal</span><span>৳{receiptData.subtotal.toFixed(2)}</span></div>
          {receiptData.memberDiscount > 0 && <div className="row sm"><span>Member Discount</span><span>-৳{receiptData.memberDiscount.toFixed(2)}</span></div>}
          {receiptData.couponDiscount > 0 && <div className="row sm"><span>Coupon</span><span>-৳{receiptData.couponDiscount.toFixed(2)}</span></div>}
          {receiptData.manualDiscount > 0 && <div className="row sm"><span>Discount</span><span>-৳{receiptData.manualDiscount.toFixed(2)}</span></div>}
          {receiptData.tax > 0 && <div className="row sm"><span>Tax</span><span>৳{receiptData.tax.toFixed(2)}</span></div>}
          {receiptData.deliveryFee > 0 && <div className="row sm"><span>Delivery</span><span>৳{receiptData.deliveryFee.toFixed(2)}</span></div>}
          <div className="divider" />
          <div className="row bold"><span>TOTAL</span><span>৳{receiptData.total.toFixed(2)}</span></div>
          <div className="row sm"><span>Payment</span><span>{receiptData.paymentMethod?.toUpperCase()}</span></div>
          {receiptData.tendered > 0 && <div className="row sm"><span>Tendered</span><span>৳{receiptData.tendered.toFixed(2)}</span></div>}
          {receiptData.change > 0 && <div className="row sm"><span>Change</span><span>৳{receiptData.change.toFixed(2)}</span></div>}
          <div className="divider" />
          <div className="center sm">Thank you for visiting PETUK!</div>
          <div className="center sm">🔥 Fire & Flame — Dhaka</div>
          <div className="divider" />
        </div>
      )}

      {/* ── POS Layout ── */}
      {/* bg-[#FFD600] = PETUK fire yellow. Right panel stays white for contrast. */}
      <div className="h-screen bg-[#FFD600] flex overflow-hidden font-sans">

        {/* ── LEFT: Menu Panel ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Topbar */}
          <div className="h-14 bg-[#E53935] flex items-center px-4 gap-3 shrink-0">
            <Flame className="w-6 h-6 text-white" />
            <span className="font-black text-white uppercase tracking-widest text-lg">PETUK POS</span>
            <div className="flex-1 mx-4 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search item... (F2)"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-10 bg-white rounded-lg pl-9 pr-4 font-semibold text-sm outline-none"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button onClick={() => setLocation('/admin')} className="text-white/70 hover:text-white text-xs font-bold flex items-center gap-1 shrink-0">
              <Home className="w-4 h-4" /> Exit
            </button>
          </div>

          {/* Category tabs — bigger touch targets for Posiflex */}
          <div className="bg-[#FFD600] border-b border-[#FFAB00] flex gap-1.5 px-3 py-2 overflow-x-auto shrink-0 hide-scrollbar">
            <button
              onClick={() => setCategory('')}
              className={`shrink-0 px-5 py-2 rounded-full text-sm font-black uppercase transition-all min-h-[40px] ${category === '' ? 'bg-[#E53935] text-white shadow' : 'bg-white text-[#1A1A1A] hover:bg-[#FFE082]'}`}
            >
              All
            </button>
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`shrink-0 px-5 py-2 rounded-full text-sm font-black uppercase transition-all min-h-[40px] ${category === c ? 'bg-[#E53935] text-white shadow' : 'bg-white text-[#1A1A1A] hover:bg-[#FFE082]'}`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Shortcut hints */}
          <div className="bg-[#FFAB00]/30 border-b border-[#FFAB00]/40 px-3 py-1 flex gap-4 overflow-x-auto hide-scrollbar shrink-0">
            {[['F2', 'Search'], ['F7', 'Coupon'], ['F8', 'Member'], ['F6', 'Discount'], ['F9', 'Pay']].map(([k, v]) => (
              <span key={k} className="text-xs text-[#5D4037] font-bold whitespace-nowrap">
                <kbd className="bg-white text-[#E53935] px-1.5 py-0.5 rounded text-xs font-black border border-[#FFAB00]">{k}</kbd> {v}
              </span>
            ))}
          </div>

          {/* Menu Grid — max 3 cols for Posiflex readability */}
          <div className="flex-1 overflow-y-auto p-3">
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-[#5D4037]/50">
                <Utensils className="w-12 h-12 mb-2" />
                <p className="font-bold text-sm">No items found</p>
              </div>
            )}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {filtered.map(item => {
                const inCart = state.items.find(i => i.name === item.name);
                return (
                  <div
                    key={item.id}
                    onClick={() => addItem({ name: item.name, price: item.price, qty: 1, category: item.category })}
                    className={`bg-white rounded-xl p-3 cursor-pointer border-2 transition-all active:scale-95 select-none relative shadow-sm ${inCart ? 'border-[#E53935] shadow-md' : 'border-transparent hover:border-[#FFAB00] hover:shadow-md'}`}
                  >
                    {inCart && (
                      <div className="absolute top-2 right-2 bg-[#E53935] text-white text-sm font-black w-7 h-7 rounded-full flex items-center justify-center shadow">
                        {inCart.qty}
                      </div>
                    )}
                    <div className="aspect-square bg-[#FFF8E1] rounded-lg mb-2 flex items-center justify-center text-4xl overflow-hidden">
                      {item.imagePath
                        ? <img src={item.imagePath} className="w-full h-full object-cover" alt={item.name} />
                        : <span>{CATEGORY_EMOJIS[item.category] || '🍴'}</span>
                      }
                    </div>
                    <p className="font-black text-xs uppercase leading-tight line-clamp-2 mb-1 text-[#1A1A1A]">{item.name}</p>
                    <p className="font-black text-base text-[#E53935]">৳{item.price}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Order Panel ── */}
        <div className="w-[360px] xl:w-[400px] bg-white flex flex-col shrink-0 shadow-2xl border-l-4 border-[#E53935]">
          {/* Order type */}
          <div className="bg-[#1A1A1A] p-3">
            <div className="grid grid-cols-3 gap-1 bg-black/20 rounded-xl p-1">
              {(['dine_in', 'takeout', 'delivery'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => updateState({ orderType: type })}
                  className={`py-2.5 rounded-lg text-xs font-black uppercase transition-all min-h-[44px] ${state.orderType === type ? 'bg-[#E53935] text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  {type === 'dine_in' ? 'Dine In' : type === 'takeout' ? 'Takeout' : 'Delivery'}
                </button>
              ))}
            </div>

            {/* Contextual fields */}
            <div className="mt-2 space-y-1.5">
              {state.orderType === 'dine_in' && (
                <input
                  type="number"
                  placeholder="Table #"
                  value={state.tableNumber ?? ''}
                  onChange={e => updateState({ tableNumber: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full bg-white/10 text-white rounded-lg px-3 py-2.5 text-sm font-bold outline-none placeholder-gray-400 border border-white/20 focus:border-[#FFD600] min-h-[44px]"
                />
              )}
              {state.orderType !== 'dine_in' && (
                <>
                  <input
                    placeholder="Customer Name"
                    value={state.customerName}
                    onChange={e => updateState({ customerName: e.target.value })}
                    className="w-full bg-white/10 text-white rounded-lg px-3 py-2.5 text-sm font-bold outline-none placeholder-gray-400 border border-white/20 focus:border-[#FFD600] min-h-[44px]"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={state.customerPhone}
                    onChange={e => updateState({ customerPhone: e.target.value })}
                    className="w-full bg-white/10 text-white rounded-lg px-3 py-2.5 text-sm font-bold outline-none placeholder-gray-400 border border-white/20 focus:border-[#FFD600] min-h-[44px]"
                  />
                </>
              )}
              {state.orderType === 'delivery' && (
                <input
                  placeholder="Delivery Address *"
                  value={state.customerAddress}
                  onChange={e => updateState({ customerAddress: e.target.value })}
                  className="w-full bg-white/10 text-white rounded-lg px-3 py-2.5 text-sm font-bold outline-none placeholder-gray-400 border border-white/20 focus:border-[#FFD600] min-h-[44px]"
                />
              )}
            </div>

            {/* Quick action buttons */}
            <div className="flex gap-1.5 mt-2">
              <button
                onClick={() => setIsMemberModal(true)}
                className={`flex-1 py-2 rounded-lg text-xs font-black uppercase flex items-center justify-center gap-1 transition-all min-h-[44px] ${state.memberInfo ? 'bg-[#FFD600] text-[#1A1A1A]' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
              >
                <User className="w-3.5 h-3.5" />
                {state.memberInfo ? state.memberInfo.name.split(' ')[0] : 'Member'}
              </button>
              <button
                onClick={() => setIsCouponModal(true)}
                className={`flex-1 py-2 rounded-lg text-xs font-black uppercase flex items-center justify-center gap-1 transition-all min-h-[44px] ${state.couponCode ? 'bg-green-400 text-green-900' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
              >
                <Ticket className="w-3.5 h-3.5" />
                {state.couponCode || 'Coupon'}
              </button>
              <button
                onClick={() => setIsDiscountModal(true)}
                className={`flex-1 py-2 rounded-lg text-xs font-black uppercase flex items-center justify-center gap-1 transition-all min-h-[44px] ${state.manualDiscount > 0 ? 'bg-orange-400 text-orange-900' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
              >
                <Tag className="w-3.5 h-3.5" />
                {state.manualDiscount > 0 ? `-৳${totals.manualDiscountAmount.toFixed(0)}` : 'Disc'}
              </button>
            </div>
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto">
            {totalItems === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-[#5D4037]/40">
                <ShoppingBag className="w-10 h-10 mb-2" />
                <p className="font-bold text-sm">Cart is empty</p>
                <p className="text-xs">Tap items on the left to add</p>
              </div>
            ) : (
              <div className="divide-y divide-[#FFE082]/50">
                {state.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 hover:bg-[#FFF8E1] transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-xs uppercase truncate text-[#1A1A1A]">{item.name}</p>
                      <p className="text-[#E53935] font-black text-sm">৳{(item.price * item.qty).toFixed(0)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => updateItemQty(i, item.qty - 1)} className="w-8 h-8 bg-[#FFE082] rounded-full flex items-center justify-center hover:bg-[#FFAB00] transition-colors text-[#1A1A1A]">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-black text-base w-6 text-center text-[#1A1A1A]">{item.qty}</span>
                      <button onClick={() => updateItemQty(i, item.qty + 1)} className="w-8 h-8 bg-[#FFE082] rounded-full flex items-center justify-center hover:bg-[#FFAB00] transition-colors text-[#1A1A1A]">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => removeItem(i)} className="w-8 h-8 text-gray-300 hover:text-[#E53935] hover:bg-red-50 rounded-full flex items-center justify-center ml-0.5 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="border-t-2 border-[#FFE082] bg-[#FFF8E1] p-3 space-y-1.5">
            <div className="flex justify-between text-sm font-semibold text-[#5D4037]">
              <span>Subtotal</span><span>৳{totals.subtotal.toFixed(2)}</span>
            </div>
            {totals.memberDiscount > 0 && (
              <div className="flex justify-between text-sm font-semibold text-green-700">
                <span>Member Disc.</span><span>−৳{totals.memberDiscount.toFixed(2)}</span>
              </div>
            )}
            {totals.couponDiscountAmount > 0 && (
              <div className="flex justify-between text-sm font-semibold text-green-700">
                <span>Coupon ({state.couponCode})</span><span>−৳{totals.couponDiscountAmount.toFixed(2)}</span>
              </div>
            )}
            {totals.manualDiscountAmount > 0 && (
              <div className="flex justify-between text-sm font-semibold text-orange-700">
                <span>Discount</span><span>−৳{totals.manualDiscountAmount.toFixed(2)}</span>
              </div>
            )}
            {totals.tax > 0 && (
              <div className="flex justify-between text-sm font-semibold text-[#5D4037]">
                <span>Tax ({settings?.taxRate ?? 0}%)</span><span>৳{totals.tax.toFixed(2)}</span>
              </div>
            )}
            {totals.deliveryFee > 0 && (
              <div className="flex justify-between text-sm font-semibold text-[#5D4037]">
                <span>Delivery</span><span>৳{totals.deliveryFee.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t-2 border-[#FFAB00]">
              <span className="font-black text-lg uppercase tracking-wider text-[#1A1A1A]">TOTAL</span>
              <span className="font-black text-3xl text-[#E53935]">৳{totals.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="p-3 space-y-2 bg-white border-t-2 border-[#FFE082]">
            <button
              onClick={() => setIsPayModal(true)}
              disabled={totalItems === 0}
              className="w-full bg-[#E53935] text-white h-16 rounded-2xl font-black text-xl uppercase tracking-widest hover:bg-[#C62828] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg"
            >
              <DollarSign className="w-7 h-7" /> PAY NOW (F9)
            </button>
            <button
              onClick={() => { clearCart(); setMemberPhone(''); setCouponInput(''); setManualDiscountInput(''); }}
              disabled={totalItems === 0}
              className="w-full border-2 border-[#FFE082] text-[#5D4037] h-11 rounded-xl font-black text-sm uppercase hover:border-[#E53935] hover:text-[#E53935] transition-colors disabled:opacity-40"
            >
              Clear Cart
            </button>
          </div>
        </div>
      </div>

      {/* ── Payment Modal ── */}
      <Modal isOpen={isPayModal} onClose={() => setIsPayModal(false)} title="💰 Process Payment">
        <div className="space-y-4">
          {/* Payment method */}
          <div>
            <p className="text-xs font-black uppercase text-gray-400 mb-2">Payment Method</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                { v: 'cash', label: '💵 Cash' },
                { v: 'card', label: '💳 Card' },
                { v: 'bkash', label: '📱 bKash' },
                { v: 'cash_on_delivery', label: '🛵 Cash on Del.' },
                { v: 'cash_on_desk', label: '🖥️ Cash on Desk' },
              ] as const).map(({ v, label }) => (
                <button
                  key={v}
                  onClick={() => updateState({ paymentMethod: v })}
                  className={`py-3 rounded-xl font-black text-sm transition-all border-2 ${state.paymentMethod === v ? 'border-[#E53935] bg-red-50 text-[#E53935]' : 'border-gray-100 text-gray-600 hover:border-gray-300'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Cash tendering (only for cash) */}
          {(state.paymentMethod === 'cash' || state.paymentMethod === 'cash_on_desk') && (
            <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-black uppercase text-gray-400">Cash Tendered</p>
              <input
                type="number"
                value={tendered}
                onChange={e => setTendered(e.target.value)}
                placeholder="Amount received"
                className="w-full h-12 bg-white border-2 border-gray-200 rounded-xl px-4 font-black text-xl text-center outline-none focus:border-[#E53935]"
                autoFocus
              />
              {/* Quick amounts */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  Math.ceil(totals.total / 10) * 10,
                  Math.ceil(totals.total / 50) * 50,
                  Math.ceil(totals.total / 100) * 100,
                  Math.ceil(totals.total / 500) * 500,
                ].filter((v, i, arr) => arr.indexOf(v) === i && v >= totals.total).slice(0, 4).map(amt => (
                  <button
                    key={amt}
                    onClick={() => setTendered(String(amt))}
                    className={`py-2 rounded-xl font-black text-sm transition-all ${tendered === String(amt) ? 'bg-[#E53935] text-white' : 'bg-white border-2 border-gray-100 hover:border-[#E53935] text-gray-700'}`}
                  >
                    ৳{amt}
                  </button>
                ))}
              </div>
              {parseFloat(tendered || '0') >= totals.total && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex justify-between items-center">
                  <span className="font-black text-sm text-green-700">Change</span>
                  <span className="font-black text-2xl text-green-700">৳{change.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* Order summary */}
          <div className="bg-[#FFF8E7] rounded-xl p-4">
            <div className="flex justify-between items-center">
              <span className="font-black uppercase text-gray-600">Total Due</span>
              <span className="font-black text-3xl text-[#E53935]">৳{totals.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{totalItems} items</span>
              <span>{state.orderType?.replace('_', ' ').toUpperCase()} · {state.paymentMethod?.toUpperCase()}</span>
            </div>
          </div>

          <button
            onClick={handlePayment}
            disabled={createOrder.isPending || (state.orderType === 'delivery' && !state.customerAddress)}
            className="w-full bg-[#E53935] text-white h-14 rounded-2xl font-black text-lg uppercase tracking-wide hover:bg-[#C62828] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {createOrder.isPending ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
            ) : (
              <><Check className="w-5 h-5" /> Confirm &amp; Print</>
            )}
          </button>
        </div>
      </Modal>

      {/* ── Receipt Modal ── */}
      <Modal isOpen={isReceiptModal} onClose={handleReceiptClose} title="🧾 Order Complete" wide>
        {receiptData && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <p className="font-black text-2xl text-gray-800">Order Placed!</p>
              <p className="font-mono font-black text-3xl text-[#E53935] mt-1">{receiptData.orderId}</p>
            </div>

            {/* Receipt preview */}
            <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-5 font-mono text-sm max-w-xs mx-auto">
              <p className="font-black text-center text-base">{receiptData.restaurantName}</p>
              <p className="text-center text-xs text-gray-400">{receiptData.restaurantAddress}</p>
              <div className="border-t border-dashed border-gray-300 my-2" />
              <p className="font-bold text-center">#{receiptData.orderId}</p>
              <p className="text-center text-xs text-gray-400">{receiptData.timestamp}</p>
              <div className="border-t border-dashed border-gray-300 my-2" />
              {receiptData.items.map((item, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span>{item.qty}x {item.name}</span>
                  <span>৳{(item.price * item.qty).toFixed(0)}</span>
                </div>
              ))}
              <div className="border-t border-dashed border-gray-300 my-2" />
              {receiptData.memberDiscount > 0 && <div className="flex justify-between text-xs text-green-600"><span>Member Disc.</span><span>-৳{receiptData.memberDiscount.toFixed(0)}</span></div>}
              {receiptData.couponDiscount > 0 && <div className="flex justify-between text-xs text-green-600"><span>Coupon</span><span>-৳{receiptData.couponDiscount.toFixed(0)}</span></div>}
              {receiptData.manualDiscount > 0 && <div className="flex justify-between text-xs text-orange-600"><span>Discount</span><span>-৳{receiptData.manualDiscount.toFixed(0)}</span></div>}
              {receiptData.tax > 0 && <div className="flex justify-between text-xs text-gray-500"><span>Tax</span><span>৳{receiptData.tax.toFixed(0)}</span></div>}
              {receiptData.deliveryFee > 0 && <div className="flex justify-between text-xs text-gray-500"><span>Delivery</span><span>৳{receiptData.deliveryFee.toFixed(0)}</span></div>}
              <div className="border-t border-dashed border-gray-300 my-2" />
              <div className="flex justify-between font-black text-base"><span>TOTAL</span><span>৳{receiptData.total.toFixed(0)}</span></div>
              {receiptData.tendered > 0 && <div className="flex justify-between text-xs"><span>Tendered</span><span>৳{receiptData.tendered.toFixed(0)}</span></div>}
              {receiptData.change > 0 && <div className="flex justify-between text-xs font-bold"><span>Change</span><span>৳{receiptData.change.toFixed(0)}</span></div>}
              <div className="border-t border-dashed border-gray-300 my-2" />
              <p className="text-center text-xs text-gray-400">Thank you! 🔥 Fire &amp; Flame</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handlePrint}
                className="flex-1 bg-gray-800 text-white h-12 rounded-xl font-black uppercase tracking-wide hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" /> Print Receipt
              </button>
              <button
                onClick={handleReceiptClose}
                className="flex-1 bg-[#E53935] text-white h-12 rounded-xl font-black uppercase tracking-wide hover:bg-[#C62828] transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> New Order
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Rider Assignment Modal ── */}
      <Modal isOpen={isRiderModal} onClose={() => setIsRiderModal(false)} title="🛵 Assign Rider">
        <div className="space-y-4">
          <p className="text-sm font-bold text-gray-500">Assign a rider for delivery order <span className="text-[#E53935] font-black">{pendingOrderId}</span></p>
          {availableRiders.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-xl">
              <Bike className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="font-black text-gray-400">No available riders</p>
              <p className="text-xs text-gray-400 mt-1">All riders are currently on delivery</p>
            </div>
          ) : (
            <div className="space-y-2">
              {availableRiders.map(rider => (
                <button
                  key={rider.id}
                  onClick={() => pendingOrderId && assignRider.mutate({ id: rider.id, data: { orderId: pendingOrderId } })}
                  disabled={assignRider.isPending}
                  className="w-full flex items-center justify-between p-4 bg-white border-2 border-gray-100 rounded-xl hover:border-[#E53935] transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Bike className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-black text-sm">{rider.name}</p>
                      {rider.phone && <p className="text-xs text-gray-400">{rider.phone}</p>}
                    </div>
                  </div>
                  <span className="bg-green-100 text-green-700 text-xs font-black px-3 py-1 rounded-full">Available</span>
                </button>
              ))}
            </div>
          )}
          <button onClick={() => { setIsRiderModal(false); setPendingOrderId(null); }} className="w-full text-gray-400 py-2 font-bold text-sm hover:text-gray-600">
            Skip for now
          </button>
        </div>
      </Modal>

      {/* ── Member Lookup Modal ── */}
      <Modal isOpen={isMemberModal} onClose={() => setIsMemberModal(false)} title="👤 Member Lookup (F8)">
        <div className="space-y-4">
          {state.memberInfo && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-black text-sm">{state.memberInfo.name}</p>
                <p className="text-xs text-yellow-700">{state.memberInfo.tier} · {state.memberInfo.discountPercent ?? 0}% discount</p>
              </div>
              <button onClick={() => { updateState({ memberPhone: '', memberInfo: undefined }); }} className="text-xs font-bold text-red-500 hover:text-red-700">Remove</button>
            </div>
          )}
          <div className="space-y-2">
            <p className="text-xs font-black uppercase text-gray-400">Member Phone Number</p>
            <div className="flex gap-2">
              <input
                type="tel"
                value={memberPhone}
                onChange={e => setMemberPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleMemberLookup()}
                placeholder="01700000000"
                className="flex-1 bg-gray-100 rounded-xl px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-[#E53935]"
                autoFocus
              />
              <button
                onClick={handleMemberLookup}
                disabled={memberLoading || !memberPhone.trim()}
                className="bg-[#E53935] text-white px-5 rounded-xl font-black hover:bg-[#C62828] transition-colors disabled:opacity-40"
              >
                {memberLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Find'}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Coupon Modal ── */}
      <Modal isOpen={isCouponModal} onClose={() => setIsCouponModal(false)} title="🎟️ Apply Coupon (F7)">
        <div className="space-y-4">
          {state.couponCode && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-black text-sm text-green-800">{state.couponCode}</p>
                <p className="text-xs text-green-600">Discount applied: −৳{totals.couponDiscountAmount.toFixed(2)}</p>
              </div>
              <button onClick={() => { updateState({ couponCode: '', couponDiscount: 0 }); setCouponInput(''); }} className="text-xs font-bold text-red-500">Remove</button>
            </div>
          )}
          <div className="space-y-2">
            <p className="text-xs font-black uppercase text-gray-400">Coupon Code</p>
            <div className="flex gap-2">
              <input
                value={couponInput}
                onChange={e => setCouponInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && validateCoupon.mutate({ data: { code: couponInput, subtotal: totals.subtotal } })}
                placeholder="e.g. WELCOME10"
                className="flex-1 bg-gray-100 rounded-xl px-4 py-3 font-black uppercase outline-none focus:ring-2 focus:ring-[#E53935] tracking-widest"
                autoFocus
              />
              <button
                onClick={() => validateCoupon.mutate({ data: { code: couponInput, subtotal: totals.subtotal } })}
                disabled={validateCoupon.isPending || !couponInput.trim()}
                className="bg-[#FFD600] text-black px-5 rounded-xl font-black hover:bg-[#FFC300] transition-colors disabled:opacity-40"
              >
                {validateCoupon.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Manual Discount Modal ── */}
      <Modal isOpen={isDiscountModal} onClose={() => setIsDiscountModal(false)} title="🏷️ Manual Discount (F6)">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-black uppercase text-gray-400">Discount Amount (৳)</p>
            <input
              type="number"
              value={manualDiscountInput}
              onChange={e => setManualDiscountInput(e.target.value)}
              placeholder="e.g. 50"
              className="w-full bg-gray-100 rounded-xl px-4 py-3 font-bold text-xl outline-none focus:ring-2 focus:ring-[#E53935]"
              autoFocus
            />
            <p className="text-xs text-gray-400 font-semibold">
              Max allowed: ৳{(totals.subtotal * ((settings?.maxCashierDiscountPercent ?? 5) / 100)).toFixed(0)} 
              ({settings?.maxCashierDiscountPercent ?? 5}% of subtotal)
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-black uppercase text-gray-400">Reason</p>
            <input
              value={manualDiscountReason}
              onChange={e => setManualDiscountReason(e.target.value)}
              placeholder="e.g. Loyalty reward, manager special"
              className="w-full bg-gray-100 rounded-xl px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-[#E53935]"
            />
          </div>
          <button
            onClick={handleManualDiscount}
            disabled={!manualDiscountInput}
            className="w-full bg-[#E53935] text-white h-12 rounded-xl font-black text-base uppercase hover:bg-[#C62828] transition-colors disabled:opacity-40"
          >
            Apply Discount
          </button>
          {state.manualDiscount > 0 && (
            <button onClick={() => { updateState({ manualDiscount: 0, manualDiscountReason: '' }); setManualDiscountInput(''); setIsDiscountModal(false); }} className="w-full text-red-400 font-bold text-sm hover:text-red-600 py-2">
              Remove Existing Discount
            </button>
          )}
        </div>
      </Modal>
    </>
  );
}
