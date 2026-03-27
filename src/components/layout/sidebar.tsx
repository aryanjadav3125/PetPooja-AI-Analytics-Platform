'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  UtensilsCrossed,
  TrendingUp,
  Layers,
  DollarSign,
  Package,
  MessageSquareText,
  Mic,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/menu', label: 'Menu Intel', icon: UtensilsCrossed },
  { href: '/sales', label: 'Sales', icon: TrendingUp },
  { href: '/combos', label: 'Combos', icon: Layers },
  { href: '/revenue', label: 'Revenue', icon: DollarSign },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/ai-chat', label: 'AI Chat', icon: MessageSquareText },
  { href: '/voice', label: 'Voice Order', icon: Mic },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen flex flex-col transition-all duration-300 ${
        collapsed ? 'w-[68px]' : 'w-[240px]'
      }`}
      style={{
        background: 'linear-gradient(180deg, #141728 0%, #0f1117 100%)',
        borderRight: '1px solid var(--color-border)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[var(--color-border)]">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm shrink-0"
          style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
        >
          PP
        </div>
        {!collapsed && (
          <span className="text-base font-semibold tracking-tight text-white whitespace-nowrap">
            PetPooja<span className="text-brand-400 ml-1">AI</span>
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                active
                  ? 'bg-brand-500/15 text-brand-400'
                  : 'text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              <Icon
                size={20}
                className={`shrink-0 transition-colors ${
                  active ? 'text-brand-400' : 'text-[var(--color-text-dim)] group-hover:text-white'
                }`}
              />
              {!collapsed && <span className="whitespace-nowrap">{label}</span>}
              {active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center py-3 border-t border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-white transition-colors"
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
    </aside>
  );
}
