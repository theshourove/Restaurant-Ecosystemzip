import React, { useState, useRef, useEffect } from 'react';
import { useListMenuItems, useGetSettings, useCreateOrder, useLookupMember, useValidateCoupon, getLookupMemberQueryKey } from '@workspace/api-client-react';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import {
  ShoppingBag, Plus, Minus, X, Flame, Utensils, Search,
  Tag, User, CheckCircle2, MapPin, Phone, Bike, ChefHat,
  Package, Clock, ChevronRight, Star, Loader2, Ticket
} from 'lucide-react';

const CATEGORY_EMOJIS: Record<string, string> = {
  Starters: '🍗', Chinese: '🍜', Burgers: '🍔', Rice: '🍚',
  Pizza: '🍕', Drinks: '🥤', Desserts: '🍰',
};

export default function CustomerMenu() {
  const { data: menuItems = [] } = useListMenuItems({ available: true });
  const { data: settings } = useGetSettings();
  const { state, addItem, updateItemQty, updateState, clearCart, calculateTotals } = useCart();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [step, setStep] = useState<'cart' | 'checkout'>('cart');
  const [couponInput, setCouponInput] = useState('');
  const [memberInput, setMemberInput] = useState('');
  const [successOrder, setSuccessOrder] = useState<{ orderId: string; total: number } | null>(null);
  const categoryBarRef = useRef<HTMLDivElement>(null);

  const categories = Array.from(new Set(menuItems.map(i => i.category)));
  const filtered = menuItems.filter(i =>
    (category ? i.category === category : true) &&
    (search ? i.name.toLowerCase().includes(search.toLowerCase()) : true)
  );

  const totals = calculateTotals(settings);
  const totalItems = state.items.reduce((s, i) => s + i.qty, 0);

  // — Member lookup —
  const { refetch: doLookupMember, isFetching: lookingUp } = useLookupMember(
    { phone: memberInput },
    { query: { queryKey: getLookupMemberQueryKey({ phone: memberInput }), enabled: false } }
  );

  // — Coupon validation —
  const validateCoupon = useValidateCoupon({
    mutation: {
      onSuccess: (data) => {
        if (data.valid) {
          updateState({ couponCode: couponInput, couponDiscount: data.discount, couponType: 'fixed' });
          toast({ title: '✅ Coupon applied!', description: data.message });
        } else {
          toast({ title: '❌ Invalid coupon', description: data.message, variant: 'destructive' });
        }
      }
    }
  });

  // — Create order —
  const createOrder = useCreateOrder({
    mutation: {
      onSuccess: (res) => {
        setSuccessOrder({ orderId: res.orderId, total: res.total });
        clearCart();
        setCouponInput('');
        setMemberInput('');
      },
      onError: () => {
        toast({ title: 'Order failed', description: 'Please try again.', variant: 'destructive' });
      }
    }
  });

  const handleMemberLookup = async () => {
    if (!memberInput.trim()) return;
    const res = await doLookupMember();
    if (res.data?.found && res.data.member) {
      updateState({ memberPhone: res.data.member.phone, memberInfo: res.data.member });
      toast({ title: `👋 Welcome, ${res.data.member.name}!`, description: `${res.data.member.tier} member — ${res.data.member.discountPercent ?? 0}% discount applied` });
    } else {
      toast({ title: 'Member not found', description: 'Check phone number or register.', variant: 'destructive' });
    }
  };

  const handleApplyCoupon = () => {
    if (!couponInput.trim()) return;
    validateCoupon.mutate({ data: { code: couponInput.toUpperCase(), subtotal: totals.subtotal } });
  };

  const handleRemoveCoupon = () => {
    updateState({ couponCode: '', couponDiscount: 0 });
    setCouponInput('');
  };

  const handlePlaceOrder = () => {
    if (!state.customerName.trim() || !state.customerPhone.trim()) {
      toast({ title: 'Missing info', description: 'Please enter your name and phone.', variant: 'destructive' });
      return;
    }
    if (state.orderType === 'delivery' && !state.customerAddress.trim()) {
      toast({ title: 'Address required', description: 'Please enter a delivery address.', variant: 'destructive' });
      return;
    }
    createOrder.mutate({
      data: {
        items: state.items.map(i => ({ id: i.id ?? 0, name: i.name, price: i.price, qty: i.qty, category: i.category })),
        orderType: state.orderType as any,
        paymentMethod: state.paymentMethod as any,
        customerName: state.customerName,
        customerPhone: state.customerPhone,
        customerAddress: state.customerAddress || undefined,
        memberPhone: state.memberPhone || undefined,
        couponCode: state.couponCode || undefined,
        source: 'website',
      }
    });
  };

  const scrollCategory = (cat: string) => {
    setCategory(cat);
    const el = categoryBarRef.current?.querySelector(`[data-cat="${cat}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };

  // Close cart on success after delay
  useEffect(() => {
    if (successOrder) setCartOpen(false);
  }, [successOrder]);

  return (
    <div className="min-h-screen bg-[#FFF8E7]">
      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-30 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Flame className="w-7 h-7 text-[#E53935]" />
            <span className="font-black text-2xl uppercase tracking-widest text-[#E53935]">PETUK</span>
          </div>

          <div className="flex-1 max-w-md hidden md:flex items-center gap-2 bg-gray-100 rounded-xl px-4 py-2">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              className="flex-1 bg-transparent text-sm outline-none"
              placeholder="Search menu..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && <button onClick={() => setSearch('')}><X className="w-4 h-4 text-gray-400" /></button>}
          </div>

          <button
            onClick={() => { setCartOpen(true); setStep('cart'); }}
            className="relative flex items-center gap-2 bg-[#E53935] text-white px-4 py-2 rounded-xl font-bold hover:bg-[#C62828] transition-colors"
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="hidden sm:inline">Cart</span>
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 bg-[#FFD600] text-black text-xs font-black w-5 h-5 rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <div className="relative bg-[#E53935] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-5 flex items-center justify-center pointer-events-none select-none">
          <Flame className="w-[600px] h-[600px]" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-10 md:py-16 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1 text-sm font-bold mb-4">
              <Clock className="w-4 h-4" /> 25–40 min delivery
            </div>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight leading-none mb-3">
              FIRE & FLAME 🔥
            </h1>
            <p className="text-white/80 font-semibold text-lg mb-6">Dhaka's boldest fast food — delivery, takeout & dine-in</p>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start text-sm font-semibold">
              <span className="bg-white/20 rounded-full px-4 py-2">⭐ 4.8 Rating</span>
              <span className="bg-white/20 rounded-full px-4 py-2">🛵 Free delivery over ৳500</span>
              <span className="bg-white/20 rounded-full px-4 py-2">📦 No min. order</span>
            </div>
          </div>
          <div className="text-8xl md:text-[140px] select-none">🍗</div>
        </div>
      </div>

      {/* ── Mobile Search ── */}
      <div className="md:hidden px-4 py-3 bg-white border-b">
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-4 py-2">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            className="flex-1 bg-transparent text-sm outline-none"
            placeholder="Search menu..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch('')}><X className="w-4 h-4 text-gray-400" /></button>}
        </div>
      </div>

      {/* ── Category Bar ── */}
      <div className="sticky top-16 z-20 bg-white shadow-sm border-b" ref={categoryBarRef}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-3 hide-scrollbar">
            <button
              data-cat=""
              onClick={() => setCategory('')}
              className={`shrink-0 flex items-center gap-2 px-5 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap ${category === '' ? 'bg-[#E53935] text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              🍽️ All Items
            </button>
            {categories.map(c => (
              <button
                key={c}
                data-cat={c}
                onClick={() => scrollCategory(c)}
                className={`shrink-0 flex items-center gap-2 px-5 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap ${category === c ? 'bg-[#E53935] text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {CATEGORY_EMOJIS[c] || '🍴'} {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-8">
          {/* Menu Grid */}
          <div className="flex-1">
            {category ? (
              <h2 className="font-black text-2xl uppercase tracking-wide mb-5 text-gray-800">
                {CATEGORY_EMOJIS[category]} {category}
              </h2>
            ) : (
              search ? (
                <h2 className="font-black text-2xl uppercase tracking-wide mb-5 text-gray-800">
                  Search: "{search}"
                </h2>
              ) : null
            )}

            {filtered.length === 0 && (
              <div className="text-center py-20 text-gray-400">
                <Utensils className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="font-bold text-xl">No items found</p>
              </div>
            )}

            {/* Group by category when no filter */}
            {!category && !search ? (
              categories.map(cat => {
                const catItems = filtered.filter(i => i.category === cat);
                if (!catItems.length) return null;
                return (
                  <div key={cat} className="mb-10">
                    <h2 className="font-black text-xl uppercase tracking-wide mb-4 text-gray-800 flex items-center gap-2">
                      <span className="text-2xl">{CATEGORY_EMOJIS[cat] || '🍴'}</span> {cat}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {catItems.map(item => <MenuItemCard key={item.id} item={item} state={state} addItem={addItem} updateItemQty={updateItemQty} />)}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(item => <MenuItemCard key={item.id} item={item} state={state} addItem={addItem} updateItemQty={updateItemQty} />)}
              </div>
            )}
          </div>

          {/* Desktop Cart Sidebar */}
          <div className="hidden lg:block w-96 shrink-0">
            <div className="sticky top-36">
              <CartPanel
                state={state} totals={totals} settings={settings}
                step={step} setStep={setStep}
                couponInput={couponInput} setCouponInput={setCouponInput}
                memberInput={memberInput} setMemberInput={setMemberInput}
                lookingUp={lookingUp}
                onMemberLookup={handleMemberLookup}
                onApplyCoupon={handleApplyCoupon}
                onRemoveCoupon={handleRemoveCoupon}
                validatingCoupon={validateCoupon.isPending}
                updateItemQty={updateItemQty}
                updateState={updateState}
                clearCart={clearCart}
                onPlaceOrder={handlePlaceOrder}
                isPlacing={createOrder.isPending}
                successOrder={successOrder}
                onViewTracking={() => setLocation(`/track?id=${successOrder?.orderId}`)}
                onNewOrder={() => { setSuccessOrder(null); setStep('cart'); }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: Floating Cart Button */}
      {totalItems > 0 && !cartOpen && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 px-4 pt-4 pb-safe z-40">
          <button
            onClick={() => { setCartOpen(true); setStep('cart'); }}
            className="w-full bg-[#E53935] text-white rounded-2xl h-16 flex items-center justify-between px-6 shadow-2xl font-bold text-lg touch-manipulation active:bg-[#C62828] transition-colors"
          >
            <span className="bg-white/20 text-white text-sm font-black px-3 py-1 rounded-full">{totalItems}</span>
            <span>View Cart</span>
            <span>৳{totals.subtotal.toFixed(0)}</span>
          </button>
        </div>
      )}

      {/* Mobile Cart Drawer */}
      {cartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setCartOpen(false)} />
          <div className="relative bg-[#FFF8E7] rounded-t-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 bg-white rounded-t-3xl border-b">
              <h2 className="font-black text-xl uppercase tracking-wide">
                {step === 'cart' ? '🛒 Your Cart' : '📋 Checkout'}
              </h2>
              <button onClick={() => setCartOpen(false)} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <CartPanel
                state={state} totals={totals} settings={settings}
                step={step} setStep={setStep}
                couponInput={couponInput} setCouponInput={setCouponInput}
                memberInput={memberInput} setMemberInput={setMemberInput}
                lookingUp={lookingUp}
                onMemberLookup={handleMemberLookup}
                onApplyCoupon={handleApplyCoupon}
                onRemoveCoupon={handleRemoveCoupon}
                validatingCoupon={validateCoupon.isPending}
                updateItemQty={updateItemQty}
                updateState={updateState}
                clearCart={clearCart}
                onPlaceOrder={handlePlaceOrder}
                isPlacing={createOrder.isPending}
                successOrder={successOrder}
                onViewTracking={() => { setCartOpen(false); setLocation(`/track`); }}
                onNewOrder={() => { setSuccessOrder(null); setStep('cart'); setCartOpen(false); }}
                isMobile
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Menu Item Card ──
function MenuItemCard({ item, state, addItem, updateItemQty }: any) {
  const inCart = state.items.find((i: any) => i.name === item.name);
  const idx = state.items.indexOf(inCart);

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100 flex flex-col group">
      <div className="relative aspect-[4/3] bg-[#FFF8E7] overflow-hidden">
        {item.imagePath ? (
          <img src={item.imagePath} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl select-none">
            {CATEGORY_EMOJIS[item.category] || '🍴'}
          </div>
        )}
        {!item.isAvailable && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-black text-sm uppercase bg-black/60 px-3 py-1 rounded-full">Unavailable</span>
          </div>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-black text-base uppercase tracking-wide leading-snug mb-1 text-gray-800">{item.name}</h3>
        <div className="flex items-center justify-between mt-auto pt-3">
          <span className="font-black text-xl text-[#E53935]">৳{item.price}</span>
          {inCart ? (
            <div className="flex items-center gap-2 bg-[#E53935]/10 rounded-full px-1 py-1">
              <button
                onClick={() => updateItemQty(idx, inCart.qty - 1)}
                className="w-11 h-11 bg-[#E53935] text-white rounded-full flex items-center justify-center font-bold active:bg-[#C62828] transition-colors touch-manipulation"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-black text-[#E53935] w-6 text-center text-base">{inCart.qty}</span>
              <button
                onClick={() => updateItemQty(idx, inCart.qty + 1)}
                className="w-11 h-11 bg-[#E53935] text-white rounded-full flex items-center justify-center font-bold active:bg-[#C62828] transition-colors touch-manipulation"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => item.isAvailable && addItem({ name: item.name, price: item.price, qty: 1, category: item.category })}
              disabled={!item.isAvailable}
              className="w-11 h-11 bg-[#E53935] text-white rounded-full flex items-center justify-center font-bold active:bg-[#C62828] transition-colors disabled:opacity-40 touch-manipulation"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Cart Panel (used in both desktop sidebar and mobile drawer) ──
function CartPanel({
  state, totals, settings, step, setStep,
  couponInput, setCouponInput, memberInput, setMemberInput,
  lookingUp, onMemberLookup, onApplyCoupon, onRemoveCoupon, validatingCoupon,
  updateItemQty, updateState, clearCart, onPlaceOrder, isPlacing,
  successOrder, onViewTracking, onNewOrder, isMobile = false
}: any) {
  const totalItems = state.items.reduce((s: number, i: any) => s + i.qty, 0);

  if (successOrder) {
    return (
      <div className="p-8 flex flex-col items-center text-center gap-4">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-2">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h3 className="font-black text-2xl text-gray-800">Order Placed! 🎉</h3>
        <p className="text-gray-500 font-semibold">Your order has been received and will be prepared shortly.</p>
        <div className="bg-[#FFF8E7] border-2 border-[#FFD600] rounded-2xl px-8 py-4 w-full">
          <p className="text-sm font-bold text-gray-500 mb-1">ORDER ID</p>
          <p className="font-black text-3xl tracking-widest text-[#E53935]">{successOrder.orderId}</p>
          <p className="text-sm font-bold text-gray-500 mt-1">Total: ৳{successOrder.total.toFixed(2)}</p>
        </div>
        <p className="text-xs text-gray-400 font-semibold">Save this ID to track your order</p>
        <button onClick={onViewTracking} className="w-full bg-[#E53935] text-white rounded-2xl py-4 font-black text-lg hover:bg-[#C62828] transition-colors">
          Track My Order
        </button>
        <button onClick={onNewOrder} className="w-full border-2 border-gray-200 rounded-2xl py-3 font-bold text-gray-600 hover:bg-gray-50 transition-colors">
          Order More
        </button>
      </div>
    );
  }

  if (totalItems === 0) {
    return (
      <div className="p-8 flex flex-col items-center text-center gap-4">
        <ShoppingBag className="w-20 h-20 text-gray-200" />
        <p className="font-black text-xl text-gray-400 uppercase">Cart is empty</p>
        <p className="text-gray-400 text-sm">Add some items from the menu to get started!</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Items */}
      <div className="space-y-2">
        {state.items.map((item: any, i: number) => (
          <div key={i} className="bg-white rounded-xl p-3 flex items-center gap-3 shadow-sm">
            <div className="text-2xl w-10 text-center">{CATEGORY_EMOJIS[item.category] || '🍴'}</div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm uppercase truncate">{item.name}</p>
              <p className="text-[#E53935] font-bold text-sm">৳{(item.price * item.qty).toFixed(0)}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => updateItemQty(i, item.qty - 1)} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center active:bg-red-100 transition-colors touch-manipulation">
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="font-black text-sm w-6 text-center">{item.qty}</span>
              <button onClick={() => updateItemQty(i, item.qty + 1)} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center active:bg-green-100 transition-colors touch-manipulation">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Order Type */}
      <div className="bg-white rounded-xl p-3 shadow-sm">
        <p className="text-xs font-black uppercase text-gray-400 mb-2">Order Type</p>
        <div className="grid grid-cols-3 gap-1 bg-gray-100 rounded-xl p-1">
          {(['takeout', 'delivery', 'dine_in'] as const).map(type => (
            <button
              key={type}
              onClick={() => updateState({ orderType: type })}
              className={`py-2 rounded-lg text-xs font-black uppercase transition-all ${state.orderType === type ? 'bg-[#E53935] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {type === 'dine_in' ? '🪑 Dine In' : type === 'takeout' ? '📦 Takeout' : '🛵 Delivery'}
            </button>
          ))}
        </div>
      </div>

      {/* Member Section */}
      {state.memberInfo ? (
        <div className="bg-gradient-to-r from-[#FFD600] to-[#FF8F00] rounded-xl p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-black text-sm">{state.memberInfo.name}</p>
              <p className="text-xs font-bold opacity-80">{state.memberInfo.tier} · {state.memberInfo.discountPercent ?? 0}% off</p>
            </div>
            <button onClick={() => { updateState({ memberPhone: '', memberInfo: undefined }); setMemberInput(''); }} className="text-xs font-bold bg-black/10 px-2 py-1 rounded-full">Remove</button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-3 shadow-sm">
          <p className="text-xs font-black uppercase text-gray-400 mb-2">🎖️ Member Discount (optional)</p>
          <div className="flex gap-2">
            <input
              type="tel"
              placeholder="Phone number"
              value={memberInput}
              onChange={e => setMemberInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onMemberLookup()}
              className="flex-1 bg-gray-100 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-[#E53935]"
            />
            <button onClick={onMemberLookup} disabled={lookingUp || !memberInput} className="bg-[#E53935] text-white px-3 py-2 rounded-xl font-bold text-sm disabled:opacity-40 hover:bg-[#C62828] transition-colors">
              {lookingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
            </button>
          </div>
        </div>
      )}

      {/* Coupon */}
      <div className="bg-white rounded-xl p-3 shadow-sm">
        <p className="text-xs font-black uppercase text-gray-400 mb-2">🎟️ Coupon Code</p>
        {state.couponCode ? (
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2">
            <div className="flex items-center gap-2">
              <Ticket className="w-4 h-4 text-green-600" />
              <span className="font-black text-sm text-green-700">{state.couponCode}</span>
              <span className="text-xs font-bold text-green-600">−৳{totals.couponDiscountAmount.toFixed(0)}</span>
            </div>
            <button onClick={onRemoveCoupon} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              placeholder="Enter coupon code"
              value={couponInput}
              onChange={e => setCouponInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && onApplyCoupon()}
              className="flex-1 bg-gray-100 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-[#E53935] uppercase"
            />
            <button onClick={onApplyCoupon} disabled={validatingCoupon || !couponInput} className="bg-[#FFD600] text-black px-3 py-2 rounded-xl font-black text-sm disabled:opacity-40 hover:bg-[#FFC300] transition-colors">
              {validatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
            </button>
          </div>
        )}
      </div>

      {/* Customer Details */}
      <div className="bg-white rounded-xl p-3 shadow-sm space-y-2">
        <p className="text-xs font-black uppercase text-gray-400">Your Details</p>
        <input
          placeholder="Your name *"
          value={state.customerName}
          onChange={e => updateState({ customerName: e.target.value })}
          className="w-full bg-gray-100 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-[#E53935]"
        />
        <input
          type="tel"
          placeholder="Phone number *"
          value={state.customerPhone}
          onChange={e => updateState({ customerPhone: e.target.value })}
          className="w-full bg-gray-100 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-[#E53935]"
        />
        {state.orderType === 'delivery' && (
          <textarea
            placeholder="Delivery address *"
            value={state.customerAddress}
            onChange={e => updateState({ customerAddress: e.target.value })}
            rows={2}
            className="w-full bg-gray-100 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-[#E53935] resize-none"
          />
        )}
        {state.orderType === 'dine_in' && (
          <input
            type="number"
            placeholder="Table number"
            value={state.tableNumber ?? ''}
            onChange={e => updateState({ tableNumber: e.target.value ? Number(e.target.value) : undefined })}
            className="w-full bg-gray-100 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-[#E53935]"
          />
        )}
      </div>

      {/* Payment Method */}
      <div className="bg-white rounded-xl p-3 shadow-sm">
        <p className="text-xs font-black uppercase text-gray-400 mb-2">Payment Method</p>
        <div className="grid grid-cols-2 gap-2">
          {([
            { v: 'cash', label: '💵 Cash', sub: 'Pay on pickup' },
            { v: 'bkash', label: '📱 bKash', sub: 'Mobile payment' },
            { v: 'card', label: '💳 Card', sub: 'Pay on pickup' },
            { v: 'cash_on_delivery', label: '🛵 Cash on Del.', sub: 'Pay on arrival' },
          ] as const).map(({ v, label, sub }) => (
            <button
              key={v}
              onClick={() => updateState({ paymentMethod: v })}
              className={`text-left p-3 rounded-xl border-2 transition-all ${state.paymentMethod === v ? 'border-[#E53935] bg-red-50' : 'border-gray-100 hover:border-gray-200'}`}
            >
              <p className="font-black text-xs">{label}</p>
              <p className="text-xs text-gray-400 font-semibold">{sub}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Price Breakdown */}
      <div className="bg-white rounded-xl p-4 shadow-sm space-y-2">
        <div className="flex justify-between text-sm font-semibold text-gray-600">
          <span>Subtotal</span><span>৳{totals.subtotal.toFixed(0)}</span>
        </div>
        {totals.memberDiscount > 0 && (
          <div className="flex justify-between text-sm font-semibold text-green-600">
            <span>Member Discount</span><span>−৳{totals.memberDiscount.toFixed(0)}</span>
          </div>
        )}
        {totals.couponDiscountAmount > 0 && (
          <div className="flex justify-between text-sm font-semibold text-green-600">
            <span>Coupon ({state.couponCode})</span><span>−৳{totals.couponDiscountAmount.toFixed(0)}</span>
          </div>
        )}
        {totals.tax > 0 && (
          <div className="flex justify-between text-sm font-semibold text-gray-500">
            <span>Tax ({settings?.taxRate ?? 0}%)</span><span>৳{totals.tax.toFixed(0)}</span>
          </div>
        )}
        {totals.deliveryFee > 0 && (
          <div className="flex justify-between text-sm font-semibold text-gray-500">
            <span>Delivery Fee</span><span>৳{totals.deliveryFee.toFixed(0)}</span>
          </div>
        )}
        <div className="border-t border-dashed border-gray-200 pt-2 flex justify-between items-center">
          <span className="font-black text-base uppercase">Total</span>
          <span className="font-black text-2xl text-[#E53935]">৳{totals.total.toFixed(0)}</span>
        </div>
      </div>

      {/* Place Order */}
      <button
        onClick={onPlaceOrder}
        disabled={isPlacing || totalItems === 0 || !state.customerName || !state.customerPhone || (state.orderType === 'delivery' && !state.customerAddress)}
        className="w-full bg-[#E53935] text-white rounded-2xl py-4 font-black text-lg uppercase tracking-wide shadow-lg hover:bg-[#C62828] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isPlacing ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Placing Order...</>
        ) : (
          <>Place Order · ৳{totals.total.toFixed(0)}</>
        )}
      </button>

      <button onClick={clearCart} className="w-full text-gray-400 py-2 font-bold text-sm hover:text-red-500 transition-colors">
        Clear Cart
      </button>
    </div>
  );
}
