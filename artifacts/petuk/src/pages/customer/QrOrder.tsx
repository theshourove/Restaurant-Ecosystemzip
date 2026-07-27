import React, { useState } from 'react';
import { useListMenuItems, useCreateOrder } from '@workspace/api-client-react';
import { Card, CardContent, Button, Input } from '@/components/ui/shared';
import { useCart } from '@/contexts/CartContext';
import { Plus, Minus, Flame, CheckCircle2 } from 'lucide-react';

export default function QrOrder() {
  const searchParams = new URLSearchParams(window.location.search);
  const tableNumber = searchParams.get('table') ? parseInt(searchParams.get('table')!) : undefined;

  const { data: menuItems } = useListMenuItems({ available: true });
  const { state, addItem, updateItemQty, calculateTotals, updateState, clearCart } = useCart();
  const [isCheckout, setIsCheckout] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');

  const totals = calculateTotals();
  const totalItems = state.items.reduce((sum, i) => sum + i.qty, 0);

  const createOrder = useCreateOrder({
    mutation: {
      onSuccess: (res) => {
        setOrderId(res.orderId);
        setIsSuccess(true);
        clearCart();
      }
    }
  });

  const handleCheckout = () => {
    if (!state.customerName || !state.customerPhone) {
      alert("Please enter name and phone number");
      return;
    }
    createOrder.mutate({
      data: {
        items: state.items.map(i => ({ name: i.name, price: i.price, qty: i.qty, category: i.category })),
        orderType: 'dine_in',
        tableNumber: tableNumber,
        customerName: state.customerName,
        customerPhone: state.customerPhone,
        paymentMethod: 'cash_on_desk',
        source: 'qr'
      }
    });
  };

  if (isSuccess) {
    return (
      <div className="bg-background min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <CheckCircle2 className="w-24 h-24 text-success mb-6" />
        <h1 className="text-4xl font-display font-extrabold uppercase tracking-widest mb-2">Order Sent!</h1>
        <p className="text-muted-foreground font-bold mb-8 uppercase tracking-widest text-sm">The kitchen is firing up.</p>
        <div className="bg-muted border border-border p-6 rounded-xl inline-block max-w-sm w-full">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Your Order ID</div>
          <div className="font-mono font-bold text-3xl tracking-widest">{orderId}</div>
          {tableNumber && (
            <div className="mt-4 pt-4 border-t border-border/50 text-sm font-bold uppercase tracking-widest">Table {tableNumber}</div>
          )}
        </div>
        <Button className="mt-8 px-8 rounded-full" onClick={() => { setIsSuccess(false); setIsCheckout(false); }}>
          Order More
        </Button>
      </div>
    );
  }

  if (isCheckout) {
    return (
      <div className="bg-background min-h-[calc(100vh-64px)] p-4 max-w-md mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-display font-extrabold uppercase tracking-wide">Checkout</h1>
          <Button variant="ghost" size="sm" onClick={() => setIsCheckout(false)}>Back</Button>
        </div>

        <Card className="mb-6 border-primary/20">
          <CardContent className="p-4 bg-primary text-primary-foreground flex justify-between items-center rounded-lg">
             <div className="font-bold uppercase tracking-widest">Dine In</div>
             {tableNumber ? <div className="font-display font-bold text-xl">Table {tableNumber}</div> : <div className="text-sm font-bold uppercase">No Table Selected</div>}
          </CardContent>
        </Card>

        <div className="space-y-4 mb-8">
           {state.items.map((item, i) => (
             <div key={i} className="flex justify-between items-center bg-card p-3 rounded-lg border border-border">
               <div>
                 <div className="font-bold text-sm">{item.name}</div>
                 <div className="text-muted-foreground text-xs font-bold uppercase">{item.qty}x</div>
               </div>
               <div className="font-bold text-primary">৳{item.price * item.qty}</div>
             </div>
           ))}
        </div>

        <div className="space-y-4 bg-card p-6 rounded-xl border border-border shadow-petuk mb-8">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Your Name</label>
            <Input value={state.customerName} onChange={e => updateState({ customerName: e.target.value })} className="h-12 bg-muted/50" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Phone Number</label>
            <Input type="tel" value={state.customerPhone} onChange={e => updateState({ customerPhone: e.target.value })} className="h-12 bg-muted/50" />
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t border-border z-40 max-w-md mx-auto">
          <Button className="w-full h-16 text-xl shadow-petuk" onClick={handleCheckout} disabled={createOrder.isPending || !state.customerName || !state.customerPhone}>
            {createOrder.isPending ? 'Sending...' : `Place Order (৳${totals.total})`}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-[calc(100vh-64px)] pb-24 relative">
      <div className="bg-muted p-4 text-center border-b border-border flex flex-col items-center justify-center relative overflow-hidden h-32">
        <Flame className="w-32 h-32 absolute opacity-5 text-black" />
        <h1 className="relative z-10 text-2xl font-display font-extrabold uppercase tracking-widest">Table Ordering</h1>
        {tableNumber && <div className="relative z-10 mt-1 inline-block bg-primary text-white font-bold uppercase tracking-widest px-3 py-1 rounded text-sm">Table {tableNumber}</div>}
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto mt-4">
        {menuItems?.map(item => {
          const inCart = state.items.find(i => i.name === item.name);
          return (
            <Card key={item.id} className="flex flex-row overflow-hidden border-border group active:scale-[0.98] transition-transform">
               {item.imagePath && (
                 <div className="w-24 h-24 shrink-0 bg-muted">
                   <img src={item.imagePath} className="w-full h-full object-cover" />
                 </div>
               )}
               <CardContent className="p-3 flex-1 flex flex-col justify-between">
                 <div className="font-bold text-sm uppercase tracking-wide leading-tight">{item.name}</div>
                 <div className="flex justify-between items-end mt-2">
                   <div className="font-bold text-lg text-primary">৳{item.price}</div>
                   {inCart ? (
                      <div className="flex items-center gap-3 bg-secondary/20 rounded-full px-2 py-1 border border-secondary/50">
                        <button className="w-6 h-6 flex items-center justify-center text-foreground" onClick={() => updateItemQty(state.items.indexOf(inCart), inCart.qty - 1)}>
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold text-sm">{inCart.qty}</span>
                        <button className="w-6 h-6 flex items-center justify-center text-foreground" onClick={() => updateItemQty(state.items.indexOf(inCart), inCart.qty + 1)}>
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => addItem({ name: item.name, price: item.price, qty: 1, category: item.category })} className="rounded-full px-4 text-xs h-8">
                        ADD
                      </Button>
                    )}
                 </div>
               </CardContent>
            </Card>
          )
        })}
      </div>

      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur-md border-t border-border z-40 max-w-lg mx-auto shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
          <Button className="w-full h-14 text-lg" onClick={() => setIsCheckout(true)}>
            View Order ({totalItems}) - ৳{totals.subtotal.toFixed(2)}
          </Button>
        </div>
      )}
    </div>
  );
}
