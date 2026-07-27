import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, Redirect } from 'wouter';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';

import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminOrders from './pages/admin/AdminOrders';
import AdminPOS from './pages/admin/AdminPOS';
import AdminKitchen from './pages/admin/AdminKitchen';
import AdminMenu from './pages/admin/AdminMenu';
import AdminMembers from './pages/admin/AdminMembers';
import AdminCoupons from './pages/admin/AdminCoupons';
import AdminRiders from './pages/admin/AdminRiders';
import AdminReports from './pages/admin/AdminReports';
import AdminUsers from './pages/admin/AdminUsers';
import AdminSettings from './pages/admin/AdminSettings';

import CustomerMenu from './pages/customer/CustomerMenu';
import QrOrder from './pages/customer/QrOrder';
import OrderTracking from './pages/customer/OrderTracking';
import MemberProfile from './pages/customer/MemberProfile';
import MemberRegister from './pages/customer/MemberRegister';

import AdminLayout from './components/layouts/AdminLayout';
import CustomerLayout from './components/layouts/CustomerLayout';

const queryClient = new QueryClient();

// A simple protected route wrapper
const ProtectedRoute = ({ component: Component }: { component: React.ComponentType }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="flex h-screen items-center justify-center font-display text-primary text-xl font-bold uppercase tracking-widest">Loading...</div>;
  if (!isAuthenticated) return <Redirect to="/admin/login" />;
  return <Component />;
};

function Router() {
  return (
    <Switch>
      {/* Admin Auth */}
      <Route path="/admin/login" component={AdminLogin} />

      {/* Admin App */}
      <Route path="/admin">
        <AdminLayout><ProtectedRoute component={AdminDashboard} /></AdminLayout>
      </Route>
      <Route path="/admin/orders">
        <AdminLayout><ProtectedRoute component={AdminOrders} /></AdminLayout>
      </Route>
      <Route path="/admin/pos">
        <ProtectedRoute component={AdminPOS} /> {/* POS gets full screen, no generic layout */}
      </Route>
      <Route path="/admin/kitchen">
        <ProtectedRoute component={AdminKitchen} /> {/* KDS usually full screen too */}
      </Route>
      <Route path="/admin/menu">
        <AdminLayout><ProtectedRoute component={AdminMenu} /></AdminLayout>
      </Route>
      <Route path="/admin/members">
        <AdminLayout><ProtectedRoute component={AdminMembers} /></AdminLayout>
      </Route>
      <Route path="/admin/coupons">
        <AdminLayout><ProtectedRoute component={AdminCoupons} /></AdminLayout>
      </Route>
      <Route path="/admin/riders">
        <AdminLayout><ProtectedRoute component={AdminRiders} /></AdminLayout>
      </Route>
      <Route path="/admin/reports">
        <AdminLayout><ProtectedRoute component={AdminReports} /></AdminLayout>
      </Route>
      <Route path="/admin/users">
        <AdminLayout><ProtectedRoute component={AdminUsers} /></AdminLayout>
      </Route>
      <Route path="/admin/settings">
        <AdminLayout><ProtectedRoute component={AdminSettings} /></AdminLayout>
      </Route>

      {/* Customer App — CustomerMenu has its own header */}
      <Route path="/" component={CustomerMenu} />
      <Route path="/qr-order">
        <CustomerLayout><QrOrder /></CustomerLayout>
      </Route>
      <Route path="/track">
        <CustomerLayout><OrderTracking /></CustomerLayout>
      </Route>
      <Route path="/profile">
        <CustomerLayout><MemberProfile /></CustomerLayout>
      </Route>
      <Route path="/register">
        <CustomerLayout><MemberRegister /></CustomerLayout>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <AuthProvider>
          <CartProvider>
            <TooltipProvider>
              <Router />
              <Toaster />
            </TooltipProvider>
          </CartProvider>
        </AuthProvider>
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
