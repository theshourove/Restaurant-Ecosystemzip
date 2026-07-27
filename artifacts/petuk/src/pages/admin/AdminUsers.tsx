import React, { useState } from 'react';
import { useListAdminUsers, useCreateAdminUser, useUpdateAdminUser, useDeleteAdminUser, getListAdminUsersQueryKey } from '@workspace/api-client-react';
import { Card, CardContent, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Badge, Button, Input, Label } from '@/components/ui/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, CreditCard as Edit, Trash2, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

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

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const { data: users, isLoading } = useListAdminUsers();
  const { user: currentUser } = useAuth();
  
  const createReq = useCreateAdminUser({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() }); setIsModalOpen(false); }}});
  const updateReq = useUpdateAdminUser({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() }); setIsModalOpen(false); }}});
  const deleteReq = useDeleteAdminUser({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() }) } });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ username: '', displayName: '', password: '', role: 'Cashier', station: 'Main', isActive: true });

  const openModal = (u?: any) => {
    if (u) {
      setEditingId(u.id);
      setFormData({ username: u.username, displayName: u.displayName, password: '', role: u.role, station: u.station, isActive: u.isActive });
    } else {
      setEditingId(null);
      setFormData({ username: '', displayName: '', password: '', role: 'Cashier', station: 'Main', isActive: true });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = { ...formData };
    if (!data.password) delete data.password;
    if (editingId) {
      updateReq.mutate({ id: editingId, data });
    } else {
      createReq.mutate({ data });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-extrabold tracking-tight uppercase">Staff Access</h1>
        <Button onClick={() => openModal()}><Plus className="w-4 h-4 mr-2"/> Add User</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Station</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>}
              {users?.map(u => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-bold">{u.displayName}</div>
                    <div className="text-xs text-muted-foreground font-mono">{u.username}</div>
                  </TableCell>
                  <TableCell><Badge variant="secondary">{u.role}</Badge></TableCell>
                  <TableCell>{u.station}</TableCell>
                  <TableCell><Badge variant={u.isActive ? 'success' : 'outline'}>{u.isActive ? 'Active' : 'Disabled'}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openModal(u)}><Edit className="w-4 h-4" /></Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:bg-destructive/10" 
                      disabled={u.id === currentUser?.id}
                      onClick={() => { if(confirm('Delete user?')) deleteReq.mutate({ id: u.id }) }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit User' : 'New User'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Display Name</Label>
            <Input required value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Username (Login)</Label>
            <Input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Password {editingId && <span className="text-muted-foreground text-xs normal-case">(leave blank to keep current)</span>}</Label>
            <Input type="password" required={!editingId} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <select className="flex h-[44px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="Cashier">Cashier</option>
                <option value="Kitchen">Kitchen</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Station</Label>
              <Input value={formData.station} onChange={e => setFormData({...formData, station: e.target.value})} />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input type="checkbox" id="active" className="w-5 h-5 accent-primary" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} />
            <Label htmlFor="active">Active Account</Label>
          </div>
          <div className="pt-4 border-t mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createReq.isPending || updateReq.isPending}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
