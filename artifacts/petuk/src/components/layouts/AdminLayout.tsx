import { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { Flame, LayoutDashboard, ListOrdered, Monitor, ChefHat, Utensils, Users, Ticket, Bike, BarChart3, Settings, UserCog, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '../ui/shared';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/orders', label: 'Orders', icon: ListOrdered },
    { href: '/admin/pos', label: 'POS', icon: Monitor },
    { href: '/admin/kitchen', label: 'Kitchen Display', icon: ChefHat },
    { href: '/admin/menu', label: 'Menu', icon: Utensils },
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

  return (
    <div className="flex h-screen bg-muted/20">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col shadow-petuk z-10 relative">
        <div className="h-16 flex items-center px-6 border-b border-border gap-2 bg-primary text-primary-foreground">
          <Flame className="w-6 h-6" />
          <span className="font-display font-bold text-xl tracking-wider">PETUK</span>
        </div>
        <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1 px-3">
          {navItems.map(item => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-3 rounded-md font-bold uppercase tracking-wide text-sm transition-colors min-h-[44px] ${isActive ? 'bg-secondary text-secondary-foreground' : 'text-foreground hover:bg-muted'}`}>
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
        <div className="p-4 border-t border-border">
          <div className="text-sm font-bold text-muted-foreground mb-4 uppercase tracking-wide px-2">
            {user?.displayName} <br/> <span className="text-xs font-medium normal-case tracking-normal">{user?.role}</span>
          </div>
          <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-background">
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
