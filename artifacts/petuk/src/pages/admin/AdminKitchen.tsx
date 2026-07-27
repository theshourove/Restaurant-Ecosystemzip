import React, { useEffect, useRef } from 'react';
import { useListOrders, useUpdateOrderStatus, getListOrdersQueryKey } from '@workspace/api-client-react';
import { Badge } from '@/components/ui/shared';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';
import type { OrderStatusUpdateStatus } from '@workspace/api-client-react';

// Simple beep sound using web audio api
const playBeep = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 800;
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch(e) {}
};

export default function AdminKitchen() {
  const queryClient = useQueryClient();
  const lastCount = useRef<number>(0);
  
  const { data } = useListOrders(
    { status: 'pending,cooking,ready', limit: 100 }, 
    { query: { queryKey: getListOrdersQueryKey({ status: 'pending,cooking,ready', limit: 100 }), refetchInterval: 8000 } }
  );

  const pendingOrders = data?.orders.filter(o => o.status === 'pending') || [];
  const cookingOrders = data?.orders.filter(o => o.status === 'cooking') || [];
  const readyOrders = data?.orders.filter(o => o.status === 'ready') || [];

  useEffect(() => {
    if (pendingOrders.length > lastCount.current) {
      playBeep();
    }
    lastCount.current = pendingOrders.length;
  }, [pendingOrders.length]);

  const updateStatus = useUpdateOrderStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
      }
    }
  });

  const advanceStatus = (id: number, current: string) => {
    let next: OrderStatusUpdateStatus;
    if (current === 'pending') next = 'cooking';
    else if (current === 'cooking') next = 'ready';
    else if (current === 'ready') next = 'served';
    else return;
    updateStatus.mutate({ id: String(id), data: { status: next } });
  };

  const OrderCard = ({ order, statusType }: { order: any, statusType: 'pending'|'cooking'|'ready' }) => {
    const isCooking = statusType === 'cooking';
    const isReady = statusType === 'ready';
    return (
      <div 
        onClick={() => advanceStatus(order.id, order.status)}
        className={`bg-card rounded-lg shadow-petuk border-l-[8px] cursor-pointer hover:opacity-90 transition-opacity p-4 flex flex-col h-full ${isReady ? 'border-success' : isCooking ? 'border-warning' : 'border-destructive'}`}
      >
        <div className="flex justify-between items-start mb-4 border-b border-border/50 pb-3">
          <div>
            <div className="font-mono font-bold text-2xl tracking-widest">{order.orderId}</div>
            <div className="text-sm font-bold uppercase text-muted-foreground mt-1 flex items-center gap-2">
              {order.orderType.replace('_', ' ')}
              {order.tableNumber && <Badge variant="outline">T-{order.tableNumber}</Badge>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold flex items-center justify-end gap-1 text-muted-foreground">
              <Clock className="w-4 h-4" />
              {format(new Date(order.createdAt), 'hh:mm a')}
            </div>
            <div className="mt-2">
              {isReady ? <Badge variant="success" className="text-sm py-1">Ready</Badge> : isCooking ? <Badge variant="warning" className="text-sm py-1">Cooking</Badge> : <Badge variant="destructive" className="text-sm py-1">New</Badge>}
            </div>
          </div>
        </div>
        
        <div className="flex-1 space-y-3">
          {order.items.map((item: any, i: number) => (
            <div key={i} className="flex gap-3 text-lg">
              <div className="font-black bg-muted text-foreground w-8 h-8 rounded flex items-center justify-center shrink-0">
                {item.qty}
              </div>
              <div className="font-bold leading-tight">{item.name}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-3 border-t border-border/50 text-center font-bold uppercase text-sm text-muted-foreground tracking-widest">
          {isReady ? 'Tap to Serve' : isCooking ? 'Tap when Ready' : 'Tap to Start'}
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden p-4 gap-4">
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-3xl font-display font-extrabold tracking-tight uppercase">Kitchen Display</h1>
        <Badge variant="outline" className="text-sm px-4 py-2 border-primary/50 text-primary">Live Sync (8s)</Badge>
      </div>

      <div className="flex-1 min-h-0 flex gap-3 overflow-x-auto">
        <div className="min-w-[260px] flex-1 max-w-[420px] shrink-0 flex flex-col bg-muted/30 rounded-xl p-3 border border-border">
          <h2 className="text-lg font-display font-bold uppercase text-destructive mb-3 tracking-wider">Pending ({pendingOrders.length})</h2>
          <div className="flex-1 overflow-y-auto min-h-0 pb-4 space-y-3">
            {pendingOrders.map(o => <OrderCard key={o.id} order={o} statusType="pending" />)}
            {pendingOrders.length === 0 && <div className="py-12 text-center font-bold text-muted-foreground uppercase text-lg opacity-50">No Pending Orders</div>}
          </div>
        </div>

        <div className="min-w-[260px] flex-1 max-w-[420px] shrink-0 flex flex-col bg-muted/30 rounded-xl p-3 border border-border">
          <h2 className="text-lg font-display font-bold uppercase text-warning mb-3 tracking-wider">Cooking ({cookingOrders.length})</h2>
          <div className="flex-1 overflow-y-auto min-h-0 pb-4 space-y-3">
            {cookingOrders.map(o => <OrderCard key={o.id} order={o} statusType="cooking" />)}
            {cookingOrders.length === 0 && <div className="py-12 text-center font-bold text-muted-foreground uppercase text-lg opacity-50">Empty Station</div>}
          </div>
        </div>

        <div className="min-w-[260px] flex-1 max-w-[420px] shrink-0 flex flex-col bg-muted/30 rounded-xl p-3 border border-border">
          <h2 className="text-lg font-display font-bold uppercase text-success mb-3 tracking-wider">Ready ({readyOrders.length})</h2>
          <div className="flex-1 overflow-y-auto min-h-0 pb-4 space-y-3">
            {readyOrders.map(o => <OrderCard key={o.id} order={o} statusType="ready" />)}
            {readyOrders.length === 0 && <div className="py-12 text-center font-bold text-muted-foreground uppercase text-lg opacity-50">No Ready Orders</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
