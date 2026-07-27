import React, { createContext, useContext } from 'react';
import { useGetMe, adminLogout } from '@workspace/api-client-react';
import type { AdminUser } from '@workspace/api-client-react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';

interface AuthContextType {
  user: AdminUser | null;
  isLoading: boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const { data: user, isLoading, isError } = useGetMe({
    query: {
      queryKey: ['/api/auth/me'],
      retry: false,
    }
  });

  const logout = async () => {
    try {
      await adminLogout();
    } catch (e) {
      // ignore
    } finally {
      queryClient.clear();
      setLocation('/admin/login');
    }
  };

  return (
    <AuthContext.Provider value={{
      user: user || null,
      isLoading,
      isAuthenticated: !!user && !isError,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
