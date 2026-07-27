import React, { useState, useRef } from 'react';
import { useListMenuItems, useCreateMenuItem, useUpdateMenuItem, useDeleteMenuItem, getListMenuItemsQueryKey } from '@workspace/api-client-react';
import { Card, CardContent, Badge, Button, Input, Label, Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, X, Upload, Image } from 'lucide-react';

const CATEGORIES = ['Starters', 'Chinese', 'Burgers', 'Rice', 'Pizza', 'Drinks', 'Desserts'];

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
  const [uploadProgress, setUploadProgress] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '', price: '', category: '', imagePath: '', isAvailable: true
  });

  const openModal = (item?: any) => {
    if (item) {
      setEditingId(item.id);
      setFormData({ name: item.name, price: String(item.price), category: item.category, imagePath: item.imagePath || '', isAvailable: item.isAvailable });
      setImagePreview(item.imagePath || '');
    } else {
      setEditingId(null);
      setFormData({ name: '', price: '', category: '', imagePath: '', isAvailable: true });
      setImagePreview('');
    }
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadProgress(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch('/api/menu/upload', { method: 'POST', body: fd, credentials: 'include' });
      if (!res.ok) throw new Error('Upload failed');
      const { url } = await res.json();
      setFormData(prev => ({ ...prev, imagePath: url }));
      setImagePreview(url);
    } catch (err) {
      alert('Image upload failed. Please try again.');
    } finally {
      setUploadProgress(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: formData.name,
      price: parseFloat(formData.price),
      category: formData.category,
      imagePath: formData.imagePath || undefined,
      isAvailable: formData.isAvailable
    };
    if (editingId) {
      updateItem.mutate({ id: editingId, data });
    } else {
      createItem.mutate({ data });
    }
  };

  const categories = Array.from(new Set([...CATEGORIES, ...(items?.map(i => i.category) || [])]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-extrabold tracking-tight uppercase">Menu Items</h1>
        <Button onClick={() => openModal()} className="bg-[#E53935] hover:bg-[#C62828]">
          <Plus className="w-4 h-4 mr-2"/> Add Item
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>}
              {items?.map(item => (
                <TableRow key={item.id}>
                  <TableCell>
                    {item.imagePath
                      ? <img src={item.imagePath} className="w-10 h-10 object-cover rounded-md bg-muted" alt={item.name} />
                      : <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center"><Image className="w-5 h-5 text-muted-foreground" /></div>
                    }
                  </TableCell>
                  <TableCell className="font-bold">{item.name}</TableCell>
                  <TableCell><span className="uppercase text-xs font-bold px-2 py-1 bg-muted rounded-md tracking-wider">{item.category}</span></TableCell>
                  <TableCell className="font-bold text-primary">৳{item.price}</TableCell>
                  <TableCell>
                    <Badge variant={item.isAvailable ? 'success' : 'outline'}>{item.isAvailable ? 'Available' : 'Sold Out'}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openModal(item)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => { if(confirm('Delete this item?')) deleteItem.mutate({ id: item.id }) }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && items?.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No menu items yet. Add your first item!</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Menu Item' : 'New Menu Item'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Item Name *</Label>
            <Input required placeholder="e.g. Chicken Burger" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Price (৳) *</Label>
              <Input type="number" required min="0" step="1" placeholder="0" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Input required list="cat-list" placeholder="Select or type" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
              <datalist id="cat-list">{categories.map(c => <option key={c} value={c} />)}</datalist>
            </div>
          </div>

          {/* Image upload */}
          <div className="space-y-2">
            <Label>Item Image</Label>
            <div className="flex gap-3 items-start">
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} className="w-20 h-20 rounded-xl object-cover border-2 border-border" alt="Preview" />
                  <button
                    type="button"
                    onClick={() => { setImagePreview(''); setFormData(f => ({ ...f, imagePath: '' })); }}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center"
                  ><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-xl bg-muted border-2 border-dashed border-border flex items-center justify-center">
                  <Image className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadProgress}
                >
                  {uploadProgress ? (
                    <><span className="animate-spin">⏳</span> Uploading...</>
                  ) : (
                    <><Upload className="w-4 h-4" /> Upload Photo</>
                  )}
                </Button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                <p className="text-xs text-muted-foreground">JPG, PNG, WebP — max 5 MB</p>
                <Input
                  type="url"
                  placeholder="Or paste image URL..."
                  value={formData.imagePath}
                  onChange={e => { setFormData({...formData, imagePath: e.target.value}); setImagePreview(e.target.value); }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 bg-muted/30 p-3 rounded-lg border border-border">
            <input type="checkbox" id="avail" className="w-5 h-5 accent-primary" checked={formData.isAvailable} onChange={e => setFormData({...formData, isAvailable: e.target.checked})} />
            <Label htmlFor="avail" className="cursor-pointer">Available for Order</Label>
          </div>

          <div className="pt-4 border-t mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-[#E53935] hover:bg-[#C62828]" disabled={createItem.isPending || updateItem.isPending || uploadProgress}>
              {createItem.isPending || updateItem.isPending ? 'Saving...' : 'Save Item'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
