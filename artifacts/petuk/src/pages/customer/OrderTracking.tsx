import React, { useState, useEffect } from 'react';
import { useTrackOrder, getTrackOrderQueryKey } from '@workspace/api-client-react';
import { MapPin, Search, CheckCircle2, ChefHat, Package, Bike, XCircle, Clock, Loader2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { format } from 'date-fns';

const STEPS_TAKEOUT = ['pending', 'cooking', 'ready', 'completed'];
const STEPS_DELIVERY = ['pending', 'cooking', 'ready', 'delivered', 'completed'];

const STEP_META: Record<string, { icon: React.ReactNode; label: string; desc: string }> = {
  pending:   { icon: <Package className="w-5 h-5" />,      label: 'Order Received',   desc: 'Your order has been confirmed' },
  cooking:   { icon: <ChefHat className="w-5 h-5" />,      label: 'Being Prepared',   desc: 'Our chefs are cooking with fire 🔥' },
  ready:     { icon: <CheckCircle2 className="w-5 h-5" />, label: 'Ready!',            desc: 'Hot, packed and ready to go' },
  served:    { icon: <CheckCircle2 className="w-5 h-5" />, label: 'Served',            desc: 'Enjoy your meal!' },
  delivered: { icon: <Bike className="w-5 h-5" />,         label: 'Out for Delivery',  desc: 'On the way to you' },
  completed: { icon: <CheckCircle2 className="w-5 h-5" />, label: 'Completed',         desc: 'Thanks for choosing PETUK! 🙏' },
};

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  cooking: 'bg-orange-100 text-orange-700',
  ready: 'bg-green-100 text-green-700',
  served: 'bg-blue-100 text-blue-700',
  delivered: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function OrderTracking() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [location] = useLocation();

  // Auto-populate from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id') || params.get('order_id');
    if (id) { setSearch(id); setQuery(id); }
  }, []);

  const isPhone = /^\d{10,}$/.test(query);
  const { data: trackData, isLoading, isError, refetch } = useTrackOrder(
    isPhone ? { phone: query } : { order_id: query },
    { query: { queryKey: getTrackOrderQueryKey(isPhone ? { phone: query } : { order_id: query }), enabled: !!query, refetchInterval: 15000 } }
  );

  const orders = Array.isArray(trackData) ? trackData : [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) setQuery(search.trim());
  };

  return (
    <div className="min-h-screen bg-[#FFF8E7] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#E53935] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-black text-3xl uppercase tracking-tight text-gray-800">Track Your Order</h1>
          <p className="text-gray-500 font-semibold mt-2">Enter your Order ID or phone number</p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-8">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="e.g. PK-1234 or 01700..."
            className="flex-1 h-14 bg-white rounded-2xl px-5 font-bold text-gray-800 outline-none border-2 border-transparent focus:border-[#E53935] shadow-sm transition-all"
          />
          <button
            type="submit"
            disabled={!search.trim()}
            className="h-14 px-6 bg-[#E53935] text-white rounded-2xl font-black uppercase tracking-wide hover:bg-[#C62828] transition-colors disabled:opacity-40 flex items-center gap-2 shrink-0"
          >
            <Search className="w-5 h-5" /> Track
          </button>
        </form>

        {isLoading && (
          <div className="flex items-center justify-center gap-3 py-16 text-gray-400 font-bold">
            <Loader2 className="w-6 h-6 animate-spin" /> Locating your order...
          </div>
        )}

        {isError && query && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 text-center">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h3 className="font-black text-lg text-red-700">Order Not Found</h3>
            <p className="text-red-500 font-semibold text-sm mt-1">Check your Order ID or phone number and try again.</p>
          </div>
        )}

        {orders.length === 0 && !isLoading && !isError && query && (
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-8 text-center">
            <Package className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
            <h3 className="font-black text-lg text-yellow-700">No Orders Found</h3>
            <p className="text-yellow-600 font-semibold text-sm mt-1">No orders found for this ID or phone number.</p>
          </div>
        )}

        {/* Orders */}
        <div className="space-y-6">
          {orders.map((order: any) => {
            const steps = order.orderType === 'delivery' ? STEPS_DELIVERY : STEPS_TAKEOUT;
            const currentIdx = steps.indexOf(order.status);
            const isCancelled = order.status === 'cancelled';

            return (
              <div key={order.id} className="bg-white rounded-3xl overflow-hidden shadow-md border border-gray-100">
                {/* Order header */}
                <div className="bg-[#E53935] text-white p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white/70 text-xs font-black uppercase mb-1">Order ID</p>
                      <p className="font-black text-3xl tracking-widest font-mono">{order.orderId}</p>
                      {order.customerName && <p className="text-white/80 font-semibold text-sm mt-1">{order.customerName}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-white/70 text-xs font-black uppercase mb-1">Placed</p>
                      <p className="font-bold">{format(new Date(order.createdAt), 'hh:mm a')}</p>
                      <p className="text-white/60 text-xs">{format(new Date(order.createdAt), 'dd MMM yyyy')}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-white/20 text-white`}>
                      <Clock className="w-3.5 h-3.5" />
                      {order.status?.toUpperCase().replace('_', ' ')}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-white/20 text-white">
                      {order.orderType?.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  {isCancelled ? (
                    <div className="text-center py-8">
                      <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                      <h3 className="font-black text-xl text-red-600">Order Cancelled</h3>
                      <p className="text-gray-400 font-semibold text-sm mt-2">Contact us for assistance: {order.restaurantPhone}</p>
                    </div>
                  ) : (
                    /* Progress Steps */
                    <div className="mb-6">
                      <p className="text-xs font-black uppercase text-gray-400 mb-4">Order Progress</p>
                      <div className="space-y-3">
                        {steps.map((step, i) => {
                          const meta = STEP_META[step];
                          const isActive = i <= currentIdx;
                          const isCurrent = i === currentIdx;

                          return (
                            <div key={step} className={`flex items-center gap-4 transition-all ${!isActive ? 'opacity-30' : ''}`}>
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${isActive ? 'bg-[#E53935] text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>
                                {meta.icon}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className={`font-black text-sm ${isActive ? 'text-gray-800' : 'text-gray-400'}`}>{meta.label}</p>
                                  {isCurrent && (
                                    <span className="bg-[#FFD600] text-black text-xs font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 bg-black rounded-full animate-pulse" /> NOW
                                    </span>
                                  )}
                                </div>
                                {isCurrent && <p className="text-xs text-gray-500 font-semibold mt-0.5">{meta.desc}</p>}
                              </div>
                              {i < steps.length - 1 && (
                                <div className={`h-0.5 w-4 rounded-full ${isActive ? 'bg-[#E53935]' : 'bg-gray-100'}`} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Order Items */}
                  <div className="bg-[#FFF8E7] rounded-2xl p-4">
                    <p className="text-xs font-black uppercase text-gray-400 mb-3">Items Ordered</p>
                    <div className="space-y-2">
                      {order.items.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between text-sm font-semibold text-gray-700">
                          <span>{item.qty}× {item.name}</span>
                          <span>৳{(item.price * item.qty).toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-dashed border-gray-300 mt-3 pt-3 space-y-1">
                      {(order.memberDiscount ?? 0) > 0 && (
                        <div className="flex justify-between text-xs font-semibold text-green-600">
                          <span>Member Discount</span><span>−৳{order.memberDiscount?.toFixed(0)}</span>
                        </div>
                      )}
                      {(order.couponDiscount ?? 0) > 0 && (
                        <div className="flex justify-between text-xs font-semibold text-green-600">
                          <span>Coupon ({order.couponCode})</span><span>−৳{order.couponDiscount?.toFixed(0)}</span>
                        </div>
                      )}
                      {(order.taxAmount ?? 0) > 0 && (
                        <div className="flex justify-between text-xs font-semibold text-gray-500">
                          <span>Tax</span><span>৳{order.taxAmount?.toFixed(0)}</span>
                        </div>
                      )}
                      {(order.deliveryFee ?? 0) > 0 && (
                        <div className="flex justify-between text-xs font-semibold text-gray-500">
                          <span>Delivery Fee</span><span>৳{order.deliveryFee?.toFixed(0)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-black text-base pt-1">
                        <span>Total</span>
                        <span className="text-[#E53935]">৳{order.total.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Rider info */}
                  {order.riderName && order.orderType === 'delivery' && (
                    <div className="mt-3 bg-purple-50 border border-purple-100 rounded-xl p-3 flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <Bike className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-black text-sm text-purple-800">Your Rider</p>
                        <p className="text-purple-600 font-semibold text-xs">{order.riderName}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Auto-refresh note */}
        {orders.length > 0 && (
          <p className="text-center text-xs text-gray-400 font-semibold mt-4">
            <Clock className="w-3.5 h-3.5 inline mr-1" /> Auto-refreshes every 15 seconds
          </p>
        )}
      </div>
    </div>
  );
}
