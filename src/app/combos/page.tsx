'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ScatterChart, Scatter, ZAxis, Cell,
} from 'recharts';
import { Layers, TrendingUp, DollarSign, Sparkles, Package } from 'lucide-react';
import { PageHeader, ChartCard, KPICard, Badge, Skeleton } from '@/components/ui/shared';
import { supabase } from '@/lib/supabase';
import type { ComboDetection, ItemSalesAnalysis, EnrichedCombo } from '@/lib/types';

const fmt = (n: number) => n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : n >= 1000 ? `₹${(n/1000).toFixed(1)}K` : `₹${n.toFixed(0)}`;

export default function CombosPage() {
  const [combos, setCombos] = useState<EnrichedCombo[]>([]);
  const [loading, setLoading] = useState(true);
  const [discountPct, setDiscountPct] = useState(10);
  const [sortBy, setSortBy] = useState<'frequency' | 'margin' | 'revenue'>('frequency');
  const [selectedCombo, setSelectedCombo] = useState<EnrichedCombo | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: rawCombos }, { data: salesItems }] = await Promise.all([
        supabase.from('combo_detection').select('*').order('frequency', { ascending: false }).limit(150),
        supabase.from('item_sales_analysis').select('*'),
      ]);
      const comboData = (rawCombos ?? []) as ComboDetection[];
      const items = (salesItems ?? []) as ItemSalesAnalysis[];
      const itemMap = new Map(items.map(i => [i.item_id, i]));
      const totalFreq = comboData.reduce((s, c) => s + c.frequency, 0) || 1;
      const avgAOV = items.length > 0 ? items.reduce((s, i) => s + i.total_revenue / Math.max(i.total_sold, 1), 0) / items.length : 300;

      const enriched: EnrichedCombo[] = comboData
        .map(c => {
          const a = itemMap.get(c.item_a);
          const b = itemMap.get(c.item_b);
          if (!a || !b) return null;
          const aPrice = a.total_sold > 0 ? Math.round(a.total_revenue / a.total_sold) : 0;
          const bPrice = b.total_sold > 0 ? Math.round(b.total_revenue / b.total_sold) : 0;
          const sumPrice = aPrice + bPrice;
          const combinedMargin = a.contribution_margin + b.contribution_margin;
          const disc = Math.max(Math.round(sumPrice * (discountPct / 100)), 10);
          const bundlePrice = sumPrice - disc;
          return {
            item_a: c.item_a, item_b: c.item_b,
            item_a_name: a.item_name, item_b_name: b.item_name,
            item_a_category: a.category, item_b_category: b.category,
            frequency: c.frequency,
            combined_margin: combinedMargin,
            combined_revenue: sumPrice * c.frequency,
            bundle_price: bundlePrice,
            discount: disc,
            aov_uplift_pct: +((bundlePrice / avgAOV - 1) * 100).toFixed(1),
          } as EnrichedCombo;
        })
        .filter(Boolean) as EnrichedCombo[];

      setCombos(enriched);
      setLoading(false);
    })();
  }, [discountPct]);

  const sorted = useMemo(() => {
    const s = [...combos];
    if (sortBy === 'margin') s.sort((a, b) => b.combined_margin - a.combined_margin);
    else if (sortBy === 'revenue') s.sort((a, b) => b.combined_revenue - a.combined_revenue);
    else s.sort((a, b) => b.frequency - a.frequency);
    return s;
  }, [combos, sortBy]);

  const totalCombos = combos.length;
  const avgMargin = combos.length > 0 ? Math.round(combos.reduce((s, c) => s + c.combined_margin, 0) / combos.length) : 0;
  const potentialRevenue = combos.reduce((s, c) => s + c.bundle_price * c.frequency, 0);
  const totalFrequency = combos.reduce((s, c) => s + c.frequency, 0);
  const topCombo = sorted[0];

  // Category crossover
  const catCross = useMemo(() => {
    const m: Record<string, number> = {};
    combos.forEach(c => {
      const key = c.item_a_category === c.item_b_category ? c.item_a_category : `${c.item_a_category} × ${c.item_b_category}`;
      m[key] = (m[key] || 0) + c.frequency;
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, freq]) => ({ name, freq }));
  }, [combos]);

  const topChart = sorted.slice(0, 12).map(c => ({
    name: `${c.item_a_name.slice(0, 10)}+${c.item_b_name.slice(0, 10)}`,
    frequency: c.frequency,
    margin: c.combined_margin,
  }));

  const scatterData = sorted.slice(0, 50).map(c => ({
    x: c.frequency, y: c.combined_margin, z: c.combined_revenue / 500,
    name: `${c.item_a_name} + ${c.item_b_name}`,
  }));

  if (loading) return (
    <div className="space-y-6"><Skeleton className="h-8 w-64" /><div className="grid grid-cols-4 gap-4">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-28" />)}</div><Skeleton className="h-80" /></div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Combo Profitability Engine" subtitle={`${totalCombos} combos detected • Discover, price, and promote profitable item bundles`} action={
        <div className="flex items-center gap-3">
          <label className="text-xs text-[var(--color-text-dim)]">Sort:</label>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="px-2 py-1 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs">
            <option value="frequency">Frequency</option><option value="margin">Margin</option><option value="revenue">Revenue</option>
          </select>
        </div>
      } />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Combos Detected" value={totalCombos.toString()} icon={Layers} color="brand" />
        <KPICard label="Avg Combined Margin" value={`₹${avgMargin}`} icon={TrendingUp} color="profit" />
        <KPICard label="Potential Bundle Revenue" value={fmt(potentialRevenue)} icon={DollarSign} color="brand" />
        <KPICard label="Total Combo Orders" value={totalFrequency.toLocaleString()} icon={Package} color="info" />
      </div>

      {/* Top Combo recommendation */}
      {topCombo && (
        <div className="glass-card p-5 border-l-4 border-brand-500 animate-fade-in">
          <div className="flex items-start gap-3">
            <Sparkles size={20} className="text-brand-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">🏆 Top Recommended Combo</h3>
              <p className="text-lg font-bold">{topCombo.item_a_name} + {topCombo.item_b_name}</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3">
                <div><span className="text-xs text-[var(--color-text-dim)]">Frequency</span><p className="font-bold">{topCombo.frequency}× together</p></div>
                <div><span className="text-xs text-[var(--color-text-dim)]">Combined Margin</span><p className="font-bold text-profit">₹{topCombo.combined_margin}</p></div>
                <div><span className="text-xs text-[var(--color-text-dim)]">Bundle Price</span><p className="font-bold text-brand-400">₹{topCombo.bundle_price}</p></div>
                <div><span className="text-xs text-[var(--color-text-dim)]">Save</span><p className="font-bold text-warning">₹{topCombo.discount}</p></div>
                <div><span className="text-xs text-[var(--color-text-dim)]">AOV Impact</span><p className="font-bold">{topCombo.aov_uplift_pct > 0 ? '+' : ''}{topCombo.aov_uplift_pct}%</p></div>
              </div>
              <div className="mt-3 p-3 rounded-lg bg-profit/5 border border-profit/20 text-xs">
                <span className="text-profit font-medium">💡 Action Plan:</span> Feature this combo on the menu board and train staff to suggest &quot;{topCombo.item_a_name} with {topCombo.item_b_name}&quot; during ordering. At ₹{topCombo.bundle_price}, customers save ₹{topCombo.discount} and you earn ₹{topCombo.combined_margin} margin per combo.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Discount Simulator */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Bundle Discount Simulator</h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--color-text-dim)]">Discount:</span>
            <input type="range" min={5} max={25} value={discountPct} onChange={e => setDiscountPct(+e.target.value)} className="w-32 accent-[#2563eb]" />
            <span className="text-sm font-bold text-brand-400">{discountPct}%</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="rounded-xl bg-[var(--color-surface-2)] p-3">
            <p className="text-xs text-[var(--color-text-dim)]">Avg Bundle Price</p>
            <p className="text-lg font-bold">{fmt(combos.length > 0 ? combos.reduce((s,c)=>s+c.bundle_price,0)/combos.length : 0)}</p>
          </div>
          <div className="rounded-xl bg-[var(--color-surface-2)] p-3">
            <p className="text-xs text-[var(--color-text-dim)]">Avg Customer Savings</p>
            <p className="text-lg font-bold text-warning">{fmt(combos.length > 0 ? combos.reduce((s,c)=>s+c.discount,0)/combos.length : 0)}</p>
          </div>
          <div className="rounded-xl bg-[var(--color-surface-2)] p-3">
            <p className="text-xs text-[var(--color-text-dim)]">Est. Monthly Revenue</p>
            <p className="text-lg font-bold text-profit">{fmt(potentialRevenue * 4)}</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Top 12 Combos" subtitle="Frequency vs margin">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2e3348" />
              <XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#1e2235', border: '1px solid #2e3348', borderRadius: 12 }} />
              <Legend />
              <Bar dataKey="frequency" fill="#2563eb" name="Times Ordered Together" radius={[4,4,0,0]} />
              <Bar dataKey="margin" fill="#22c55e" name="Combined Margin ₹" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Combo Profitability Map" subtitle="Frequency vs margin (bubble = revenue). Green = high potential">
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#2e3348" />
              <XAxis type="number" dataKey="x" name="Frequency" tick={{ fontSize: 10 }} label={{ value: 'Times Ordered Together →', position: 'bottom', fontSize: 10 }} />
              <YAxis type="number" dataKey="y" name="Margin" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `₹${v}`} />
              <ZAxis type="number" dataKey="z" range={[30, 300]} />
              <Tooltip contentStyle={{ background: '#1e2235', border: '1px solid #2e3348', borderRadius: 12 }}
                formatter={(v: number, name: string) => name === 'Margin' ? `₹${v}` : v} />
              <Scatter data={scatterData}>
                {scatterData.map((_, i) => <Cell key={i} fill={i < 5 ? '#22c55e' : i < 15 ? '#2563eb' : '#6b7280'} fillOpacity={0.7} />)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Category Crossover */}
      <ChartCard title="Category Pairing Analysis" subtitle="Which food categories pair best?">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={catCross} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#2e3348" />
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis dataKey="name" type="category" width={160} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ background: '#1e2235', border: '1px solid #2e3348', borderRadius: 12 }} />
            <Bar dataKey="freq" fill="#a78bfa" name="Frequency" radius={[0,4,4,0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Combo Table */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold mb-4">All Recommended Combos ({sorted.length})</h3>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[var(--color-surface)]">
              <tr className="border-b border-[var(--color-border)] text-xs text-[var(--color-text-dim)]">
                <th className="text-left py-2 pr-2">#</th>
                <th className="text-left py-2 pr-2">Item A</th>
                <th className="text-left py-2 pr-2">Item B</th>
                <th className="text-left py-2 pr-2">Categories</th>
                <th className="text-right py-2 pr-2">Freq</th>
                <th className="text-right py-2 pr-2">Margin</th>
                <th className="text-right py-2 pr-2">Bundle ₹</th>
                <th className="text-right py-2 pr-2">Revenue</th>
                <th className="text-center py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {sorted.slice(0, 40).map((c, i) => (
                <tr key={`${c.item_a}-${c.item_b}`}
                  onClick={() => setSelectedCombo(selectedCombo === c ? null : c)}
                  className={`border-b border-[var(--color-border)]/30 cursor-pointer transition-colors ${selectedCombo === c ? 'bg-brand-500/10' : 'hover:bg-[var(--color-surface-2)]'}`}>
                  <td className="py-2 pr-2 text-xs text-[var(--color-text-dim)]">{i+1}</td>
                  <td className="py-2 pr-2 font-medium">{c.item_a_name}</td>
                  <td className="py-2 pr-2 font-medium">{c.item_b_name}</td>
                  <td className="py-2 pr-2 text-xs"><Badge variant="default">{c.item_a_category}</Badge>{c.item_a_category !== c.item_b_category && <> <Badge variant="default">{c.item_b_category}</Badge></>}</td>
                  <td className="py-2 pr-2 text-right font-mono font-bold">{c.frequency}</td>
                  <td className="py-2 pr-2 text-right font-mono text-profit">₹{c.combined_margin}</td>
                  <td className="py-2 pr-2 text-right font-bold text-brand-400">₹{c.bundle_price}</td>
                  <td className="py-2 pr-2 text-right font-mono">{fmt(c.combined_revenue)}</td>
                  <td className="py-2 text-center"><Badge variant={c.combined_margin > avgMargin ? 'success' : 'default'}>{c.combined_margin > avgMargin ? '⭐ Promote' : 'Bundle'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected combo detail */}
      {selectedCombo && (
        <div className="glass-card p-5 border-l-4 border-brand-500 animate-fade-in">
          <h3 className="font-semibold text-sm mb-3">📋 Combo Strategy: {selectedCombo.item_a_name} + {selectedCombo.item_b_name}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 text-sm">
              <p><span className="text-[var(--color-text-dim)]">Ordered together:</span> <strong>{selectedCombo.frequency} times</strong></p>
              <p><span className="text-[var(--color-text-dim)]">Combined margin:</span> <strong className="text-profit">₹{selectedCombo.combined_margin}</strong></p>
              <p><span className="text-[var(--color-text-dim)]">Suggested bundle:</span> <strong className="text-brand-400">₹{selectedCombo.bundle_price}</strong> (save ₹{selectedCombo.discount})</p>
              <p><span className="text-[var(--color-text-dim)]">Total revenue potential:</span> <strong>{fmt(selectedCombo.combined_revenue)}</strong></p>
              <p><span className="text-[var(--color-text-dim)]">AOV impact:</span> <strong>{selectedCombo.aov_uplift_pct > 0 ? '+' : ''}{selectedCombo.aov_uplift_pct}%</strong></p>
            </div>
            <div className="rounded-xl bg-profit/5 border border-profit/20 p-4 text-xs space-y-2">
              <p className="font-semibold text-profit">💡 Promotion Strategy:</p>
              <p>1. <strong>Menu board:</strong> List as &quot;{selectedCombo.item_a_name} + {selectedCombo.item_b_name} Combo&quot; at ₹{selectedCombo.bundle_price}</p>
              <p>2. <strong>Staff script:</strong> &quot;Would you like to add {selectedCombo.item_b_name} with your {selectedCombo.item_a_name}? Together they are only ₹{selectedCombo.bundle_price}&quot;</p>
              <p>3. <strong>Online ordering:</strong> Auto-suggest this combo when either item is added to cart</p>
              <p>4. <strong>Voice AI:</strong> Copilot will auto-suggest this pairing during voice orders</p>
              <p className="text-profit font-medium mt-2">Expected monthly revenue: {fmt(selectedCombo.bundle_price * selectedCombo.frequency * 4)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
