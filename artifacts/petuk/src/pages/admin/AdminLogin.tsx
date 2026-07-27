import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAdminLogin } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle, Input, Button, Label } from '@/components/ui/shared';
import { Flame } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const loginMutation = useAdminLogin({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
        setLocation('/admin');
      },
      onError: () => {
        setError('Invalid credentials');
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username || !password) {
      setError('Please fill in both fields');
      return;
    }
    loginMutation.mutate({ data: { username, password } });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-primary/20 shadow-xl shadow-black/10">
        <CardHeader className="text-center space-y-4 pt-8">
          <div className="mx-auto bg-primary text-primary-foreground w-16 h-16 rounded-full flex items-center justify-center shadow-petuk">
            <Flame className="w-8 h-8" />
          </div>
          <CardTitle className="text-3xl">PETUK STAFF</CardTitle>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm">System Login</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-destructive/10 text-destructive p-3 rounded text-sm font-bold uppercase tracking-wide text-center">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter username"
                disabled={loginMutation.isPending}
                className="text-lg py-6"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                disabled={loginMutation.isPending}
                className="text-lg py-6"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full text-lg py-6 h-auto mt-4" 
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? 'Authenticating...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
