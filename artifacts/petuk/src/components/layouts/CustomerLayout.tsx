import { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { Flame, ShoppingBag, MapPin, User } from 'lucide-react';
import { Button } from '../ui/shared';
import { useCart } from '@/contexts/CartContext';

export default function CustomerLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { state } = useCart();
  const totalItems = state.items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-petuk h-16 flex items-center px-4 md:px-8 justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Flame className="w-8 h-8" />
          <span className="font-display font-extrabold text-2xl tracking-widest uppercase">PETUK</span>
        </Link>
        <nav className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" asChild>
            <Link href="/track"><MapPin className="w-5 h-5 md:mr-2" /><span className="hidden md:inline">Track</span></Link>
          </Button>
          <Button variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" asChild>
            <Link href="/profile"><User className="w-5 h-5 md:mr-2" /><span className="hidden md:inline">Profile</span></Link>
          </Button>
          {location !== '/' && location !== '/qr-order' && totalItems > 0 && (
             <Button variant="secondary" asChild className="rounded-full px-4">
               <Link href="/"><ShoppingBag className="w-4 h-4 mr-2" /> {totalItems}</Link>
             </Button>
          )}
        </nav>
      </header>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
