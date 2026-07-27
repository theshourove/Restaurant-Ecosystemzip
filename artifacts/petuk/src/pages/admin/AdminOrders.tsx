import React, { useState } from 'react';
import { useListOrders, useUpdateOrderStatus, getListOrdersQueryKey } from '@workspace/api-client-react';
import { Card, CardContent, Badge, Button, Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/shared';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Check, X, ChefHat } from 'lucide-react';
import type { OrderStatusUpdateStatus } from '@workspace/api-client-react/src/generated/api.schemas';

export default function AdminOrders() {
  const [filter, setFilter] = useState<string>('all');
  const queryClient = useQueryClient();
  const { data: ordersData, isLoading } = useListOrders({
    status: filter !== 'all' ? filter : undefined,
    limit: 50
  }, { query: { refetchInterval: 15000 } });

  const updateStatus = useUpdateOrderStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
      }
    }
  });

  const handleUpdate = (id: number, status: OrderStatusUpdateStatus) => {
    updateStatus.mutate({ id, data: { status } });
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending': return <Badge variant="destructive">Pending</Badge>;
      case 'cooking': return <Badge variant="warning">Cooking</Badge>;
      case 'ready': return <Badge variant="success">Ready</Badge>;
      case 'served': return <Badge variant="secondary">Served</Badge>;
      case 'delivered': return <Badge variant="secondary">Delivered</Badge>;
      case 'completed': return <Badge variant="success">Completed</Badge>;
      case 'cancelled': return <Badge variant="outline">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getActions = (order: any) => {
    if (order.status === 'pending') {
      return (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => handleUpdate(order.id, 'cooking')}><ChefHat className="w-4 h-4 mr-1"/> Accept</Button>
          <Button size="sm" variant="destructive" onClick={() => handleUpdate(order.id, 'cancelled')}><X className="w-4 h-4"/></Button>
        </div>
      );
    }
    if (order.status === 'cooking') {
      return <Button size="sm" variant="warning" onClick={() => handleUpdate(order.id, 'ready')}><Check className="w-4 h-4 mr-1"/> Ready</Button>;
    }
    if (order.status === 'ready') {
      if (order.orderType === 'delivery') {
         return <Badge variant="outline">Waiting for rider</Badge>;
      }
      return <Button size="sm" variant="success" onClick={() => handleUpdate(order.id, order.orderType === 'dine_in' ? 'served' : 'completed')}><Check className="w-4 h-4 mr-1"/> Complete</Button>;
    }
    if (order.status === 'served') {
      return <Button size="sm" variant="success" onClick={() => handleUpdate(order.id, 'completed')}><Check className="w-4 h-4 mr-1"/> Complete</Button>;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-extrabold tracking-tight uppercase">Order Management</h1>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', 'pending', 'cooking', 'ready', 'served', 'completed', 'cancelled'].map(tab => (
          <Button 
            key={tab} 
            variant={filter === tab ? 'default' : 'outline'} 
            onClick={() => setFilter(tab)}
            className="capitalize"
          >
            {tab}
          </Button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl">
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>}
              {ordersData?.orders.map(order => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono font-bold">{order.orderId}</TableCell>
                  <TableCell>{format(new Date(order.createdAt), 'hh:mm a')}</TableCell>
                  <TableCell>
                    <span className="uppercase text-xs font-bold px-2 py-1 bg-muted rounded-md tracking-wider">
                      {order.orderType.replace('_', ' ')}
                    </span>
                    {order.tableNumber && <span className="ml-2 text-xs font-bold text-muted-foreground">T-{order.tableNumber}</span>}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs font-medium">
                    {order.items.map(i => `${i.qty}x ${i.name}`).join(', ')}
                  </TableCell>
                  <TableCell className="font-bold">৳{order.total}</TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="text-right flex justify-end">
                    {getActions(order)}
                  </TableCell>
                </TableRow>
              ))}
              {ordersData?.orders.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground font-bold uppercase">No orders found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
