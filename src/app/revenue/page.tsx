'use client';
import { useEffect, useState } from 'react';
import { PageHeader, KPICard, Badge, Skeleton } from '@/components/ui/shared';
import { DollarSign, TrendingUp, Zap, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { UpsellCandidate, RevenueOpportunity } from '@/lib/types';

const fmt = (n: number) => n >= 1000 ? `₹${(n/1000).toFixed(1)}K` : `₹${n.toFixed(0)}`;

function getPromotionStrategy(item: UpsellCandidate): { title: string; steps: string[]; expectedImpact: string } {
  const margin = item.contribution_margin;
  const sold = item.total_sold;
  if (margin > 200 && sold < 5) {
    return {
      title: 'Premium Hidden Gem Strategy',
      steps: [
        `Feature "${item.item_name}" as "Chef\'s Special of the Week" on menu boards`,
        'Offer a ₹30 introductory discount for first-time orderers',
        `Create a combo: "${item.item_name} + popular drink" at a 10% bundle discount`,
        'Train staff to mention this item: "Have you tried our Chef\'s Special? It\'s our best-kept secret!"',
        'Add appetizing photo to Zomato/Swiggy listing with "NEW" tag',
      ],
      expectedImpact: `If sales increase to 30/month: additional revenue of ₹${(margin * 30).toLocaleString()}/month`,
    };
  }
  if (margin > 150) {
    return {
      title: 'Voice & Digital Upsell Strategy',
      steps: [
        `Add "${item.item_name}" as auto-suggested upsell in voice ordering copilot`,
        `When a customer orders ${item.category} items, suggest: "Would you like to add ${item.item_name}?"`,
        'Place as first item in category on online ordering menu',
        'Offer as add-on at checkout with "Frequently bought together" tag',
        'Create Instagram reel showing preparation to build desire',
      ],
      expectedImpact: `Each upsell earns ₹${margin} margin. 20 daily upsells = ₹${(margin * 20 * 30).toLocaleString()}/month`,
    };
  }
  return {
    title: 'Awareness & Bundling Strategy',
    steps: [
      `Include "${item.item_name}" in meal combos with bestsellers`,
      'Run a "Try Something New" promotion with 15% off',
      'Feature in WhatsApp broadcast to regular customers',
      'Add as complimentary taster with orders above ₹500',
    ],
    expectedImpact: `Moderate margin (₹${margin}), focus on volume. 50 upsells/month = ₹${(margin * 50).toLocaleString()}/month`,
  };
}

export default function RevenuePage() {
  const [upsell, setUpsell] = useState<UpsellCandidate[]>([]);
  const [revOps, setRevOps] = useState<RevenueOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<UpsellCandidate | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: u }, { data: r }] = await Promise.all([
        supabase.from('upsell_candidates').select('*'),
        supabase.from('revenue_opportunities').select('*'),
      ]);
      setUpsell((u ?? []) as UpsellCandidate[]);
      setRevOps((r ?? []) as RevenueOpportunity[]);
      setLoading(false);
    })();
  }, []);

  const topUpsell = [...upsell].sort((a, b) => b.contribution_margin - a.contribution_margin);
  const totalPotential = topUpsell.slice(0, 10).reduce((s, u) => s + u.contribution_margin * 30, 0);

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-80" /></div>;

  const strategy = selectedItem ? getPromotionStrategy(selectedItem) : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Revenue Optimization Engine" subtitle="Upsell targets + revenue opportunities — click any item for promotion strategy" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Upsell Opportunities" value={upsell.length.toString()} icon={Zap} color="brand" />
        <KPICard label="Revenue Opportunities" value={revOps.length.toString()} icon={TrendingUp} color="profit" />
        <KPICard label="Top Margin Item" value={topUpsell[0]?.item_name ?? '—'} icon={DollarSign} color="brand" subtitle={`₹${topUpsell[0]?.contribution_margin ?? 0} margin`} />
        <KPICard label="Monthly Potential" value={fmt(totalPotential)} icon={DollarSign} color="profit" subtitle="Top 10 items × 30/mo" />
      </div>

      <div className="glass-card p-4 border-l-4 border-profit animate-fade-in">
        <p className="text-sm"><span className="font-bold">🚀 Strategy:</span> {topUpsell.length > 0 ? `${topUpsell.slice(0,3).map(u=>u.item_name).join(', ')} have margins of ₹${topUpsell[0].contribution_margin}+. Click any item below for a complete promotion plan.` : 'No upsell candidates found.'}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Table */}
        <div className={`flex-1 glass-card p-5 ${selectedItem ? 'lg:w-3/5' : ''}`}>
          <h3 className="text-sm font-semibold mb-4">Upsell Candidates — High Margin, Low Sales (click for strategy)</h3>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--color-surface)]"><tr className="border-b border-[var(--color-border)] text-xs text-[var(--color-text-dim)]">
                <th className="text-left py-2 pr-3">#</th><th className="text-left py-2 pr-3">Item</th><th className="text-left py-2 pr-3">Category</th>
                <th className="text-right py-2 pr-3">Margin</th><th className="text-right py-2 pr-3">Sold</th><th className="text-right py-2 pr-3">Revenue</th><th className="text-center py-2">Action</th>
              </tr></thead>
              <tbody>{topUpsell.slice(0, 30).map((u, i) => (
                <tr key={u.item_id} onClick={() => setSelectedItem(selectedItem?.item_id === u.item_id ? null : u)}
                  className={`border-b border-[var(--color-border)]/30 cursor-pointer transition-colors ${selectedItem?.item_id === u.item_id ? 'bg-brand-500/10' : 'hover:bg-[var(--color-surface-2)]'}`}>
                  <td className="py-2 pr-3 text-xs text-[var(--color-text-dim)]">{i + 1}</td>
                  <td className="py-2 pr-3 font-medium">{u.item_name}</td>
                  <td className="py-2 pr-3"><Badge variant="default">{u.category}</Badge></td>
                  <td className="py-2 pr-3 text-right font-mono text-profit">₹{u.contribution_margin}</td>
                  <td className="py-2 pr-3 text-right font-mono">{u.total_sold}</td>
                  <td className="py-2 pr-3 text-right font-mono">{fmt(u.total_revenue)}</td>
                  <td className="py-2 text-center"><Badge variant="success">⚡ Promote</Badge></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>

        {/* Strategy Panel */}
        {selectedItem && strategy && (
          <div className="lg:w-2/5 glass-card p-5 border-l-4 border-brand-500 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">{selectedItem.item_name}</h3>
              <button onClick={() => setSelectedItem(null)} className="text-[var(--color-text-dim)] hover:text-white"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="rounded-xl bg-[var(--color-surface-2)] p-2 text-center"><span className="text-xs text-[var(--color-text-dim)]">Margin</span><p className="font-bold text-profit text-sm">₹{selectedItem.contribution_margin}</p></div>
              <div className="rounded-xl bg-[var(--color-surface-2)] p-2 text-center"><span className="text-xs text-[var(--color-text-dim)]">Sold</span><p className="font-bold text-sm">{selectedItem.total_sold}</p></div>
            </div>
            <div className="rounded-xl bg-brand-500/10 border border-brand-500/20 p-4">
              <h4 className="text-xs font-bold text-brand-400 mb-2">📋 {strategy.title}</h4>
              <div className="space-y-2">
                {strategy.steps.map((step, i) => (
                  <p key={i} className="text-xs text-[var(--color-text-muted)] flex items-start gap-2">
                    <span className="text-brand-400 font-bold shrink-0">{i + 1}.</span>
                    <span>{step}</span>
                  </p>
                ))}
              </div>
              <div className="mt-3 pt-2 border-t border-brand-500/20">
                <p className="text-xs text-profit font-medium">📈 {strategy.expectedImpact}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Revenue Opportunities */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold mb-4">AI Revenue Opportunities</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {revOps.slice(0, 12).map((r, i) => (
            <div key={i} className="rounded-xl bg-[var(--color-surface-2)] p-4 animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-semibold">{r.item_name}</h4>
                <Badge variant={r.recommendation.includes('Promote') ? 'success' : 'warning'}>{r.recommendation}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-[var(--color-text-dim)]">
                <div>Category: <span className="text-[var(--color-text)] font-medium">{r.category}</span></div>
                <div>Margin: <span className="text-profit font-medium">₹{r.contribution_margin}</span></div>
                <div>Sold: <span className="font-medium">{r.total_sold}</span></div>
                <div>Profit: <span className="text-profit font-medium">₹{r.total_profit}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
