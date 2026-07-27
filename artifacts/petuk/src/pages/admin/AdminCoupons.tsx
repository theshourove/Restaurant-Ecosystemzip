import React, { useState } from 'react';
import { useListCoupons, useCreateCoupon, useUpdateCoupon, useDeleteCoupon, getListCouponsQueryKey } from '@workspace/api-client-react';
import { Card, CardContent, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Badge, Button, Input, Label } from '@/components/ui/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, X, Edit } from 'lucide-react';
import { format } from 'date-fns';
import type { CouponInputType } from '@workspace/api-client-react/src/generated/api.schemas';

const Modal = ({ isOpen, onClose, title, children }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-lg rounded-xl shadow-petuk border border-border overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
          <h2 className="font-display font-bold uppercase text-xl">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5"/></Button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default function AdminCoupons() {
  const queryClient = useQueryClient();
  const { data: coupons, isLoading } = useListCoupons();
  
  const createReq = useCreateCoupon({ onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListCouponsQueryKey() }); setIsModalOpen(false); }});
  const updateReq = useUpdateCoupon({ onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListCouponsQueryKey() }); }});
  const deleteReq = useDeleteCoupon({ onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCouponsQueryKey() }) });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ code: '', type: 'percent' as CouponInputType, value: 10, minOrder: 0, maxUses: 100, expiry: '' });

  const openModal = () => {
    setFormData({ code: '', type: 'percent', value: 10, minOrder: 0, maxUses: 100, expiry: '' });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createReq.mutate({ 
      data: {
        ...formData,
        expiry: formData.expiry || undefined
      } 
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-extrabold tracking-tight uppercase">Promo Codes</h1>
        <Button onClick={() => openModal()}><Plus className="w-4 h-4 mr-2"/> Create Code</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Rules</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>}
              {coupons?.map(c => {
                const isExpired = c.expiry && new Date(c.expiry) < new Date();
                const isExhausted = c.usedCount >= c.maxUses;
                const status = !c.isActive ? 'disabled' : (isExpired ? 'expired' : (isExhausted ? 'exhausted' : 'active'));

                return (
                  <TableRow key={c.id}>
                    <TableCell><Badge variant="outline" className="font-mono text-sm border-dashed bg-muted">{c.code}</Badge></TableCell>
                    <TableCell className="font-bold text-primary">
                      {c.type === 'percent' ? `${c.value}% OFF` : `৳${c.value} OFF`}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-bold text-muted-foreground uppercase">Min Order: ৳{c.minOrder}</div>
                      {c.expiry && <div className="text-xs font-bold text-muted-foreground uppercase">Expires: {format(new Date(c.expiry), 'MMM d, yyyy')}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="font-bold">{c.usedCount} / {c.maxUses}</div>
                      <div className="w-full bg-muted h-2 rounded-full overflow-hidden mt-1 max-w-[100px]">
                        <div className="bg-primary h-full" style={{ width: `${Math.min(100, (c.usedCount/c.maxUses)*100)}%` }} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status === 'active' ? 'success' : 'outline'}>{status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => updateReq.mutate({ id: c.id, data: { isActive: !c.isActive }})}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => { if(confirm('Delete?')) deleteReq.mutate({ id: c.id }) }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Promo Code">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Coupon Code</Label>
            <Input required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase().replace(/\s/g, '')})} className="uppercase font-mono tracking-widest text-lg h-12" placeholder="e.g. SUMMER20" />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
              <Label>Discount Type</Label>
              <select className="flex h-[44px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                <option value="percent">Percentage (%)</option>
                <option value="fixed">Fixed Amount (৳)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Discount Value</Label>
              <Input type="number" required min="1" value={formData.value} onChange={e => setFormData({...formData, value: parseFloat(e.target.value)})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Min Order Amount (৳)</Label>
              <Input type="number" required min="0" value={formData.minOrder} onChange={e => setFormData({...formData, minOrder: parseFloat(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <Label>Maximum Uses</Label>
              <Input type="number" required min="1" value={formData.maxUses} onChange={e => setFormData({...formData, maxUses: parseInt(e.target.value)})} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Expiry Date (Optional)</Label>
            <Input type="datetime-local" value={formData.expiry} onChange={e => setFormData({...formData, expiry: e.target.value})} />
          </div>
          
          <div className="pt-4 border-t mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createReq.isPending}>Create Code</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
