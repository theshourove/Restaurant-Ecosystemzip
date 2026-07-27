import React, { useState, useEffect } from 'react';
import { useLookupMember, useCreateMember } from '@workspace/api-client-react';
import { Crown, Star, Plus, ChevronRight, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function MemberProfile() {
  const [phone, setPhone] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const { toast } = useToast();

  // Auto-populate from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('phone');
    if (p) { setPhone(p); setActiveSearch(p); }
  }, []);

  const { data, isLoading } = useLookupMember(
    { phone: activeSearch },
    { query: { enabled: !!activeSearch } }
  );

  const createMember = useCreateMember({
    mutation: {
      onSuccess: () => {
        toast({ title: '🎉 Welcome to PETUK Loyalty!', description: 'Your account has been created.' });
        setShowRegister(false);
        setActiveSearch(regPhone);
      },
      onError: () => {
        toast({ title: 'Registration failed', description: 'This phone may already be registered.', variant: 'destructive' });
      }
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.trim()) setActiveSearch(phone.trim());
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regPhone.trim()) return;
    createMember.mutate({ data: { name: regName.trim(), phone: regPhone.trim() } });
  };

  const nextTierPoints: Record<string, number> = {
    Regular: 500, Silver: 2000, Gold: 5000
  };

  const tierColors: Record<string, string> = {
    Regular: '#64748b', Silver: '#94a3b8', Gold: '#d97706', Platinum: '#7c3aed'
  };

  const tierBg: Record<string, string> = {
    Regular: 'from-slate-500 to-slate-600',
    Silver: 'from-slate-400 to-slate-500',
    Gold: 'from-yellow-500 to-amber-600',
    Platinum: 'from-purple-600 to-purple-700',
  };

  return (
    <div className="min-h-screen bg-[#FFF8E7] py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#FFD600] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Crown className="w-8 h-8 text-black" />
          </div>
          <h1 className="font-black text-3xl uppercase tracking-tight text-gray-800">PETUK Loyalty</h1>
          <p className="text-gray-500 font-semibold mt-2">Earn points. Unlock rewards. Save more.</p>
        </div>

        {/* Tiers info */}
        {!data?.found && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { tier: 'Regular', pts: '0–499', perk: '0% off' },
              { tier: 'Silver', pts: '500–1,999', perk: '5% off' },
              { tier: 'Gold', pts: '2,000–4,999', perk: '10% off' },
              { tier: 'Platinum', pts: '5,000+', perk: '15% off' },
            ].map(({ tier, pts, perk }) => (
              <div key={tier} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="w-8 h-8 rounded-xl mb-2" style={{ backgroundColor: tierColors[tier] ?? '#64748b' }} />
                <p className="font-black text-sm">{tier}</p>
                <p className="text-xs text-gray-400 font-semibold">{pts} pts</p>
                <p className="text-xs font-black text-green-600 mt-1">{perk}</p>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        {!data?.found && !showRegister && (
          <div className="bg-white rounded-3xl p-6 shadow-sm space-y-4">
            <h2 className="font-black text-lg">Check Your Points</h2>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="flex-1 relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Your phone number"
                  className="w-full bg-gray-100 rounded-xl pl-10 pr-4 py-3 font-bold outline-none focus:ring-2 focus:ring-[#E53935]"
                />
              </div>
              <button
                type="submit"
                disabled={!phone.trim() || isLoading}
                className="bg-[#E53935] text-white px-5 py-3 rounded-xl font-black hover:bg-[#C62828] transition-colors disabled:opacity-40"
              >
                {isLoading ? '...' : 'Check'}
              </button>
            </form>

            {data && !data.found && activeSearch && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
                <p className="font-bold text-yellow-700 text-sm">Number not registered.</p>
                <p className="text-yellow-600 text-xs mt-1">Join for free and start earning points!</p>
              </div>
            )}

            <div className="border-t border-gray-100 pt-4">
              <button
                onClick={() => { setShowRegister(true); setRegPhone(phone); }}
                className="w-full border-2 border-[#E53935] text-[#E53935] rounded-xl py-3 font-black hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Join PETUK Loyalty (Free)
              </button>
            </div>
          </div>
        )}

        {/* Register Form */}
        {showRegister && (
          <div className="bg-white rounded-3xl p-6 shadow-sm space-y-4">
            <h2 className="font-black text-lg">🎉 Join PETUK Loyalty</h2>
            <form onSubmit={handleRegister} className="space-y-3">
              <input
                type="text"
                value={regName}
                onChange={e => setRegName(e.target.value)}
                placeholder="Your full name *"
                required
                className="w-full bg-gray-100 rounded-xl px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-[#E53935]"
              />
              <input
                type="tel"
                value={regPhone}
                onChange={e => setRegPhone(e.target.value)}
                placeholder="Phone number *"
                required
                className="w-full bg-gray-100 rounded-xl px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-[#E53935]"
              />
              <button
                type="submit"
                disabled={createMember.isPending}
                className="w-full bg-[#E53935] text-white rounded-xl py-3 font-black hover:bg-[#C62828] transition-colors disabled:opacity-40"
              >
                {createMember.isPending ? 'Creating...' : 'Create Account'}
              </button>
              <button type="button" onClick={() => setShowRegister(false)} className="w-full text-gray-400 py-2 font-bold text-sm">
                Back
              </button>
            </form>
          </div>
        )}

        {/* Member Card */}
        {data?.found && data.member && (
          <div className="space-y-4">
            {/* Card */}
            <div className={`bg-gradient-to-br ${tierBg[data.member.tier] ?? 'from-slate-500 to-slate-600'} rounded-3xl p-6 text-white shadow-lg`}>
              <div className="flex items-start justify-between mb-8">
                <div>
                  <p className="text-white/60 text-xs font-black uppercase">PETUK Loyalty</p>
                  <p className="font-black text-2xl mt-1">{data.member.name}</p>
                  <p className="text-white/70 font-semibold text-sm">{data.member.phone}</p>
                </div>
                <div className="bg-white/20 rounded-xl px-3 py-2 text-center">
                  <p className="font-black text-xl">{data.member.tier}</p>
                  <p className="text-xs text-white/70">{data.member.discountPercent ?? 0}% OFF</p>
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-white/60 text-xs font-black uppercase mb-1">Points Balance</p>
                  <p className="font-black text-5xl">{data.member.points}</p>
                </div>
                <Star className="w-12 h-12 text-white/20" />
              </div>
            </div>

            {/* Progress to next tier */}
            {nextTierPoints[data.member.tier] && (
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between text-xs font-black uppercase text-gray-400 mb-2">
                  <span>{data.member.points} pts</span>
                  <span>{nextTierPoints[data.member.tier]} pts to next tier</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#E53935] rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(100, (data.member.points / nextTierPoints[data.member.tier]!) * 100)}%` }}
                  />
                </div>
                <p className="text-xs font-bold text-gray-400 mt-2 text-center">
                  {nextTierPoints[data.member.tier]! - data.member.points} more points to unlock the next tier
                </p>
              </div>
            )}

            {/* Perks */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <p className="font-black text-xs uppercase text-gray-400 mb-3">Your Perks</p>
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-black text-sm text-green-800">{data.member.discountPercent ?? 0}% Off Every Order</p>
                  <p className="text-xs text-green-600 font-semibold">Applied automatically at checkout</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 font-semibold mt-3">
                Member since {new Date(data.member.joined).toLocaleDateString('en-BD', { year: 'numeric', month: 'long' })}
              </p>
            </div>

            <button
              onClick={() => { setActiveSearch(''); setPhone(''); }}
              className="w-full border-2 border-gray-200 rounded-xl py-3 font-bold text-gray-500 hover:bg-gray-50 transition-colors text-sm"
            >
              Check Another Number
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
