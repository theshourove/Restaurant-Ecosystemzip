import React from 'react';
import { useListRiders, useUpdateRider, getListRidersQueryKey } from '@workspace/api-client-react';
import { Card, CardContent, Badge, Button } from '@/components/ui/shared';
import { Bike, Phone, TrendingUp, Wallet, Check } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function AdminRiders() {
  const queryClient = useQueryClient();
  const { data: riders } = useListRiders();
  const updateRider = useUpdateRider({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListRidersQueryKey() }) }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-extrabold tracking-tight uppercase">Fleet Management</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {riders?.map(rider => (
          <Card key={rider.id} className="relative overflow-hidden group">
            <div className={`absolute top-0 left-0 w-2 h-full ${rider.status === 'Available' ? 'bg-success' : rider.status === 'On Delivery' ? 'bg-primary' : 'bg-muted-foreground'}`} />
            <CardContent className="p-6 pl-8">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-display font-bold text-xl uppercase tracking-wide">{rider.name}</h3>
                  <div className="flex items-center text-muted-foreground text-sm mt-1 gap-1 font-bold">
                    <Phone className="w-4 h-4" /> {rider.phone || 'N/A'}
                  </div>
                </div>
                <Badge variant={rider.status === 'Available' ? 'success' : rider.status === 'On Delivery' ? 'default' : 'outline'}>
                  {rider.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 my-6 py-4 border-y border-border/50">
                <div>
                  <div className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3"/> Deliveries</div>
                  <div className="text-2xl font-bold">{rider.totalDeliveries}</div>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-1 flex items-center gap-1"><Wallet className="w-3 h-3"/> Earnings</div>
                  <div className="text-2xl font-bold text-primary">৳{rider.earnings}</div>
                </div>
              </div>

              <div className="flex gap-2">
                {rider.status === 'Off Duty' ? (
                  <Button className="flex-1" variant="outline" onClick={() => updateRider.mutate({ id: rider.id, data: { status: 'Available' } })}>
                    Start Shift
                  </Button>
                ) : (
                  <Button className="flex-1" variant="outline" onClick={() => updateRider.mutate({ id: rider.id, data: { status: 'Off Duty' } })}>
                    End Shift
                  </Button>
                )}
                {rider.status === 'On Delivery' && (
                  <Button className="flex-1 bg-success hover:bg-[#1b5e20] text-white" onClick={() => updateRider.mutate({ id: rider.id, data: { status: 'Available' } })}>
                    <Check className="w-4 h-4 mr-2" /> Complete Delivery
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
