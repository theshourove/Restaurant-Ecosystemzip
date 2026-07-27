import React, { useState } from 'react';
import { useCreateMember } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, Input, Button, Label } from '@/components/ui/shared';
import { Flame, Crown } from 'lucide-react';
import { useLocation } from 'wouter';

export default function MemberRegister() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [error, setError] = useState('');

  const register = useCreateMember({
    mutation: {
      onSuccess: () => {
        setLocation('/profile?phone=' + formData.phone);
      },
      onError: (e: any) => {
        setError(e?.message || 'Registration failed');
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return setError("Fill all fields");
    register.mutate({ data: formData });
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-primary/20">
        <div className="h-32 bg-primary relative overflow-hidden flex items-center justify-center">
          <Flame className="w-48 h-48 absolute opacity-10 text-black" />
          <Crown className="w-16 h-16 text-primary-foreground relative z-10" />
        </div>
        <CardHeader className="text-center pt-8">
          <CardTitle className="text-3xl">Join The Club</CardTitle>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm mt-2">Earn points. Get free food.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <div className="bg-destructive/10 text-destructive p-3 rounded font-bold text-center text-sm">{error}</div>}
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input 
                placeholder="John Doe" 
                value={formData.name} 
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="h-14 text-lg bg-muted/30"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input 
                placeholder="017..." 
                type="tel"
                value={formData.phone} 
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="h-14 text-lg bg-muted/30"
              />
            </div>
            <Button type="submit" className="w-full h-16 text-xl shadow-petuk" disabled={register.isPending}>
              {register.isPending ? 'Registering...' : 'Get My Card'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
