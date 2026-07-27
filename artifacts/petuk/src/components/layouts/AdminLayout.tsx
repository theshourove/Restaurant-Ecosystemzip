import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Flame, LayoutDashboard, ListOrdered, Monitor, ChefHat, Utensils, Users,
  Ticket, Bike, BarChart3, Settings, UserCog, LogOut, QrCode, Menu, X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '../ui/shared';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/orders', label: 'Orders', icon: ListOrdered },
    { href: '/admin/pos', label: 'POS', icon: Monitor },
    { href: '/admin/kitchen', label: 'Kitchen Display', icon: ChefHat },
    { href: '/admin/menu', label: 'Menu', icon: Utensils },
    { href: '/admin/tables', label: 'Table QR Codes', icon: QrCode },
    { href: '/admin/members', label: 'Members', icon: Users },
    { href: '/admin/coupons', label: 'Coupons', icon: Ticket },
    { href: '/admin/riders', label: 'Riders', icon: Bike },
    { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  ];

  if (user?.role === 'Admin') {
    navItems.push(
      { href: '/admin/users', label: 'Staff', icon: UserCog },
      { href: '/admin/settings', label: 'Settings', icon: Settings }
    );
  }

  const Sidebar = () => (
    <aside className={`
      fixed md:relative z-30 md:z-auto
      h-full w-64 bg-card border-r border-border flex flex-col shadow-petuk
      transition-transform duration-300 ease-in-out
      ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
    `}>
      {/* Header */}
      <div className="h-16 flex items-center px-4 border-b border-border gap-2 bg-primary text-primary-foreground shrink-0">
        <Flame className="w-6 h-6 shrink-0" />
        <span className="font-display font-bold text-xl tracking-wider flex-1">PETUK</span>
        {/* Close button — mobile only */}
        <button
          className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav links */}
      <div className="flex-1 overflow-y-auto py-3 flex flex-col gap-0.5 px-2">
        {navItems.map(item => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-3 rounded-md font-bold uppercase tracking-wide text-sm
                transition-colors min-h-[44px] touch-manipulation
                ${isActive
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-foreground hover:bg-muted active:bg-muted'}
              `}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* User / logout */}
      <div className="p-3 border-t border-border shrink-0">
        <div className="text-sm font-bold text-muted-foreground mb-3 uppercase tracking-wide px-2">
          {user?.displayName}
          <br />
          <span className="text-xs font-medium normal-case tracking-normal">{user?.role}</span>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 min-h-[44px]"
          onClick={logout}
        >
          <LogOut className="w-4 h-4 mr-2 shrink-0" /> Logout
        </Button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-muted/20 overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar />

      {/* Main content area */}
      <main className="flex-1 overflow-auto bg-white flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center h-14 px-3 bg-primary text-primary-foreground shrink-0 gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors touch-manipulation"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <Flame className="w-5 h-5 shrink-0" />
          <span className="font-display font-bold text-lg tracking-wider">PETUK Admin</span>
        </div>

        {/* Page content */}
        <div className="p-4 md:p-6 max-w-7xl mx-auto w-full flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
