import React, { useState } from 'react';
import { useListMenuItems, useCreateMenuItem, useUpdateMenuItem, useDeleteMenuItem, getListMenuItemsQueryKey } from '@workspace/api-client-react';
import { Card, CardContent, Badge, Button, Input, Label, Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, X } from 'lucide-react';

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

export default function AdminMenu() {
  const queryClient = useQueryClient();
  const { data: items, isLoading } = useListMenuItems();
  const createItem = useCreateMenuItem({ onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListMenuItemsQueryKey() }); setIsModalOpen(false); }});
  const updateItem = useUpdateMenuItem({ onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListMenuItemsQueryKey() }); setIsModalOpen(false); }});
  const deleteItem = useDeleteMenuItem({ onSuccess: () => queryClient.invalidateQueries({ queryKey: getListMenuItemsQueryKey() }) });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    name: '', price: '', category: '', imagePath: '', isAvailable: true
  });

  const openModal = (item?: any) => {
    if (item) {
      setEditingId(item.id);
      setFormData({ name: item.name, price: String(item.price), category: item.category, imagePath: item.imagePath || '', isAvailable: item.isAvailable });
    } else {
      setEditingId(null);
      setFormData({ name: '', price: '', category: '', imagePath: '', isAvailable: true });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: formData.name,
      price: parseFloat(formData.price),
      category: formData.category,
      imagePath: formData.imagePath,
      isAvailable: formData.isAvailable
    };
    if (editingId) {
      updateItem.mutate({ id: editingId, data });
    } else {
      createItem.mutate({ data });
    }
  };

  const categories = Array.from(new Set(items?.map(i => i.category) || []));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-extrabold tracking-tight uppercase">Menu Items</h1>
        <Button onClick={() => openModal()}><Plus className="w-4 h-4 mr-2"/> Add Item</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items?.map(item => (
                <TableRow key={item.id}>
                  <TableCell>
                    {item.imagePath ? <img src={item.imagePath} className="w-10 h-10 object-cover rounded-md bg-muted" /> : <div className="w-10 h-10 bg-muted rounded-md" />}
                  </TableCell>
                  <TableCell className="font-bold">{item.name}</TableCell>
                  <TableCell><span className="uppercase text-xs font-bold px-2 py-1 bg-muted rounded-md tracking-wider">{item.category}</span></TableCell>
                  <TableCell className="font-bold text-primary">৳{item.price}</TableCell>
                  <TableCell>
                    <Badge variant={item.isAvailable ? 'success' : 'outline'}>{item.isAvailable ? 'Available' : 'Sold Out'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openModal(item)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => { if(confirm('Delete?')) deleteItem.mutate({ id: item.id }) }}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Item' : 'New Item'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Price (৳)</Label>
              <Input type="number" required min="0" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input required list="categories" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
              <datalist id="categories">{categories.map(c => <option key={c} value={c} />)}</datalist>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Image URL</Label>
            <Input type="url" value={formData.imagePath} onChange={e => setFormData({...formData, imagePath: e.target.value})} placeholder="https://..." />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input type="checkbox" id="avail" className="w-5 h-5 accent-primary" checked={formData.isAvailable} onChange={e => setFormData({...formData, isAvailable: e.target.checked})} />
            <Label htmlFor="avail">Available for Order</Label>
          </div>
          <div className="pt-4 border-t mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createItem.isPending || updateItem.isPending}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
