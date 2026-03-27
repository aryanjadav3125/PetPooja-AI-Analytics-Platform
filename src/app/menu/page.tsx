'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ZAxis, Cell,
} from 'recharts';
import { Search, X } from 'lucide-react';
import { PageHeader, ChartCard, Badge, Button, Skeleton } from '@/components/ui/shared';
import { supabase } from '@/lib/supabase';
import type { ItemSalesAnalysis, MenuClassification, ComboDetection } from '@/lib/types';

const classColors: Record<string, string> = { STAR: '#facc15', PUZZLE: '#a78bfa', PLOWHORSE: '#fb923c', DOG: '#f87171' };
const classEmoji: Record<string, string> = { STAR: '⭐', PUZZLE: '🧩', PLOWHORSE: '🐴', DOG: '🐕' };
const classActions: Record<string, string> = { STAR: 'Keep promoting — your winners', PUZZLE: 'High margin + low sales — promote aggressively!', PLOWHORSE: 'High sales + low margin — increase price', DOG: 'Low margin + low sales — consider removing' };
const classStrategies: Record<string, string[]> = {
  STAR: [
    'Feature prominently on menu boards and online ordering',
    'Ensure consistent quality — these are your reputation builders',
    'Create combos pairing STARs with lower-performing items to boost overall sales',
    'Use in marketing campaigns and social media posts',
  ],
  PUZZLE: [
    'Run "Chef\'s Special" or "Featured Item" promotions',
    'Add to combo deals with popular items to increase visibility',
    'Train staff to actively suggest these items during ordering',
    'Offer limited-time discounts to build customer habit',
    'Place at eye-level on menu or as first option in category',
  ],
  PLOWHORSE: [
    'Gradually increase price by ₹10-15 over 2-3 weeks',
    'Reduce portion size slightly to improve margins',
    'Renegotiate ingredient costs with suppliers',
    'Use as "anchor" items in combos with high-margin add-ons',
  ],
  DOG: [
    'Consider removing from menu to reduce kitchen complexity',
    'Reformulate recipe to reduce cost if item has brand appeal',
    'Replace with a new item in the same category',
    'If keeping, only offer during off-peak hours to reduce waste',
  ],
};

export default function MenuPage() {
  const [sales, setSales] = useState<ItemSalesAnalysis[]>([]);
  const [cls, setCls] = useState<MenuClassification[]>([]);
  const [combos, setCombos] = useState<ComboDetection[]>([]);
  const [search, setSearch] = useState('');
  const [clsFilter, setClsFilter] = useState<string>('');
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: s }, { data: c }, { data: co }] = await Promise.all([
        supabase.from('item_sales_analysis').select('*').order('total_profit', { ascending: false }),
        supabase.from('menu_performance_classification').select('*'),
        supabase.from('combo_detection').select('*').order('frequency', { ascending: false }).limit(200),
      ]);
      setSales((s ?? []) as ItemSalesAnalysis[]);
      setCls((c ?? []) as MenuClassification[]);
      setCombos((co ?? []) as ComboDetection[]);
      setLoading(false);
    })();
  }, []);

  const clsMap = useMemo(() => new Map(cls.map(c => [c.item_id, c])), [cls]);
  const salesMap = useMemo(() => new Map(sales.map(s => [s.item_id, s])), [sales]);

  const filtered = useMemo(() => {
    return sales.filter(item => {
      if (search && !item.item_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (clsFilter && clsMap.get(item.item_id)?.menu_category !== clsFilter) return false;
      return true;
    });
  }, [sales, search, clsFilter, clsMap]);

  // Category summary stats
  const catStats = useMemo(() => {
    const result: Record<string, { count: number; totalProfit: number; totalSold: number; avgMargin: number; topItem: string; topItemMargin: number }> = {};
    (['STAR', 'PUZZLE', 'PLOWHORSE', 'DOG'] as const).forEach(cat => {
      const items = cls.filter(c => c.menu_category === cat);
      const profits = items.map(i => {
        const s = salesMap.get(i.item_id);
        return s?.total_profit ?? 0;
      });
      const topIdx = items.reduce((best, item, idx) => item.contribution_margin > (items[best]?.contribution_margin ?? 0) ? idx : best, 0);
      result[cat] = {
        count: items.length,
        totalProfit: profits.reduce((s, p) => s + p, 0),
        totalSold: items.reduce((s, i) => s + i.total_sold, 0),
        avgMargin: items.length > 0 ? Math.round(items.reduce((s, i) => s + i.contribution_margin, 0) / items.length) : 0,
        topItem: items[topIdx]?.item_name ?? '—',
        topItemMargin: items[topIdx]?.contribution_margin ?? 0,
      };
    });
    return result;
  }, [cls, salesMap]);

  // Scatter data
  const scatterData = useMemo(() => {
    return cls
      .filter(c => !clsFilter || c.menu_category === clsFilter)
      .map(c => ({
        x: c.total_sold,
        y: c.contribution_margin,
        z: Math.max(c.total_sold * c.contribution_margin / 200, 20),
        name: c.item_name,
        category: c.menu_category,
        id: c.item_id,
      }));
  }, [cls, clsFilter]);

  const selectedItem = selected ? sales.find(s => s.item_id === selected) : null;
  const selectedCls = selected ? clsMap.get(selected) : null;
  const selectedCombos = selected ? combos.filter(c => c.item_a === selected || c.item_b === selected).slice(0, 5) : [];

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-80" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Menu Intelligence Engine" subtitle="Menu engineering — classify, optimize, and promote the right items" />

      {/* Category Cards — clickable with expanded insight */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['STAR', 'PUZZLE', 'PLOWHORSE', 'DOG'] as const).map(cat => {
          const stats = catStats[cat];
          const isActive = clsFilter === cat;
          return (
            <div key={cat} onClick={() => setClsFilter(isActive ? '' : cat)}
              className={`glass-card p-4 cursor-pointer transition-all duration-300 ${isActive ? 'ring-2 ring-offset-1 ring-offset-[var(--color-surface)]' : 'hover:scale-[1.02]'}`}
              style={isActive ? { borderColor: classColors[cat], boxShadow: `0 0 20px ${classColors[cat]}30` } : {}}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3.5 h-3.5 rounded-full" style={{ background: classColors[cat] }} />
                <span className="text-xs font-bold">{classEmoji[cat]} {cat}</span>
                <span className="ml-auto text-xl font-bold">{stats.count}</span>
              </div>
              <p className="text-[10px] text-[var(--color-text-dim)] leading-tight mb-2">{classActions[cat]}</p>
              {isActive && (
                <div className="mt-2 pt-2 border-t border-[var(--color-border)] animate-fade-in text-xs space-y-1">
                  <p>Total profit: <strong className="text-profit">₹{stats.totalProfit.toLocaleString()}</strong></p>
                  <p>Total sold: <strong>{stats.totalSold.toLocaleString()}</strong> items</p>
                  <p>Avg margin: <strong>₹{stats.avgMargin}</strong>/item</p>
                  <p>Top item: <strong>{stats.topItem}</strong> (₹{stats.topItemMargin})</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Category strategy when selected */}
      {clsFilter && (
        <div className="glass-card p-4 border-l-4 animate-fade-in" style={{ borderColor: classColors[clsFilter] }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{classEmoji[clsFilter]}</span>
            <h3 className="text-sm font-bold">{clsFilter} Item Strategy</h3>
            <span className="text-xs text-[var(--color-text-dim)] ml-auto">{catStats[clsFilter]?.count ?? 0} items</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(classStrategies[clsFilter] ?? []).map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-[var(--color-text-muted)]">
                <span className="text-brand-400 font-bold mt-0.5">{i + 1}.</span>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quadrant Chart */}
      <ChartCard title="Menu Engineering Quadrant" subtitle={clsFilter ? `Showing ${clsFilter} items (${scatterData.length})` : 'All items — click a category above to filter'}>
        <ResponsiveContainer width="100%" height={360}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#2e3348" />
            <XAxis type="number" dataKey="x" name="Total Sold" tick={{ fontSize: 10 }} label={{ value: 'Sales Volume →', position: 'bottom', fontSize: 11 }} />
            <YAxis type="number" dataKey="y" name="Margin" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `₹${v}`} label={{ value: '← Margin ₹', angle: -90, position: 'insideLeft', fontSize: 11 }} />
            <ZAxis type="number" dataKey="z" range={[20, 200]} />
            <Tooltip contentStyle={{ background: '#1e2235', border: '1px solid #2e3348', borderRadius: 12 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-[#1e2235] border border-[#2e3348] rounded-xl p-3">
                    <p className="font-bold text-sm">{d.name}</p>
                    <p className="text-xs">Sold: <strong>{d.x}</strong> • Margin: <strong>₹{d.y}</strong></p>
                    <p className="text-xs mt-1" style={{ color: classColors[d.category] }}>{classEmoji[d.category]} {d.category}</p>
                  </div>
                );
              }} />
            <Scatter data={scatterData} onClick={(d: { id?: string }) => { if (d.id) setSelected(d.id); }}>
              {scatterData.map((d, i) => (
                <Cell key={i} fill={classColors[d.category] ?? '#6b7280'} fillOpacity={selected === d.id ? 1 : 0.7} stroke={selected === d.id ? '#fff' : 'none'} strokeWidth={2} cursor="pointer" />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Table */}
        <div className={`flex-1 glass-card p-5 ${selected ? 'lg:w-3/5' : ''}`}>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)]" />
              <input type="text" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm focus:outline-none focus:border-brand-500" />
            </div>
            {(clsFilter || search) && <Button variant="ghost" size="sm" onClick={() => { setClsFilter(''); setSearch(''); }}><X size={14} /> Clear</Button>}
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--color-surface)]">
                <tr className="border-b border-[var(--color-border)] text-xs text-[var(--color-text-dim)]">
                  <th className="text-left py-2 pr-3">Item</th><th className="text-left py-2 pr-3">Category</th><th className="text-center py-2 pr-3">Class</th>
                  <th className="text-right py-2 pr-3">Sold</th><th className="text-right py-2 pr-3">Margin</th><th className="text-right py-2 pr-3">Profit</th><th className="text-right py-2">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 50).map(item => {
                  const c = clsMap.get(item.item_id);
                  return (
                    <tr key={item.item_id} onClick={() => setSelected(item.item_id)}
                      className={`border-b border-[var(--color-border)]/30 cursor-pointer transition-colors ${selected === item.item_id ? 'bg-brand-500/10' : 'hover:bg-[var(--color-surface-2)]'}`}>
                      <td className="py-2 pr-3 font-medium">{item.item_name}</td>
                      <td className="py-2 pr-3 text-xs">{item.category}</td>
                      <td className="py-2 pr-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{ background: `${classColors[c?.menu_category ?? '']}20`, color: classColors[c?.menu_category ?? ''] }}>
                          {classEmoji[c?.menu_category ?? '']} {c?.menu_category ?? '?'}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-right font-mono">{item.total_sold}</td>
                      <td className="py-2 pr-3 text-right font-mono">₹{item.contribution_margin}</td>
                      <td className="py-2 pr-3 text-right font-mono text-profit">₹{item.total_profit.toLocaleString()}</td>
                      <td className="py-2 text-right font-mono">₹{item.total_revenue.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Panel */}
        {selectedItem && (
          <div className="lg:w-2/5 glass-card p-5 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{selectedItem.item_name}</h3>
              <button onClick={() => setSelected(null)} className="text-[var(--color-text-dim)] hover:text-white"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">{classEmoji[selectedCls?.menu_category ?? '']}</span>
                <span className="text-sm font-medium px-2 py-0.5 rounded-full" style={{ background: `${classColors[selectedCls?.menu_category ?? '']}20`, color: classColors[selectedCls?.menu_category ?? ''] }}>{selectedCls?.menu_category ?? '?'}</span>
                <span className="text-xs text-[var(--color-text-dim)]">{classActions[selectedCls?.menu_category ?? '']}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[var(--color-surface-2)] p-3"><span className="text-xs text-[var(--color-text-dim)]">Revenue</span><p className="font-bold">₹{selectedItem.total_revenue.toLocaleString()}</p></div>
                <div className="rounded-xl bg-[var(--color-surface-2)] p-3"><span className="text-xs text-[var(--color-text-dim)]">Profit</span><p className="font-bold text-profit">₹{selectedItem.total_profit.toLocaleString()}</p></div>
                <div className="rounded-xl bg-[var(--color-surface-2)] p-3"><span className="text-xs text-[var(--color-text-dim)]">Margin/Unit</span><p className="font-bold">₹{selectedItem.contribution_margin}</p></div>
                <div className="rounded-xl bg-[var(--color-surface-2)] p-3"><span className="text-xs text-[var(--color-text-dim)]">Units Sold</span><p className="font-bold">{selectedItem.total_sold}</p></div>
              </div>
              {/* Combos */}
              {selectedCombos.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-[var(--color-text-dim)] mb-2">Frequently Paired With</h4>
                  {selectedCombos.map((c, i) => {
                    const partnerId = c.item_a === selected ? c.item_b : c.item_a;
                    const partner = salesMap.get(partnerId);
                    return (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-[var(--color-border)]/30 text-sm">
                        <span>{partner?.item_name ?? partnerId}</span><Badge variant="default">{c.frequency}×</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Strategy */}
              <div className="rounded-xl bg-brand-500/10 border border-brand-500/20 p-3">
                <p className="text-xs font-medium text-brand-400 mb-2">💡 Recommended Actions:</p>
                <div className="space-y-1">
                  {(classStrategies[selectedCls?.menu_category ?? ''] ?? ['No specific strategy']).map((s, i) => (
                    <p key={i} className="text-xs text-[var(--color-text-muted)] flex items-start gap-1">
                      <span className="text-brand-400">•</span> {s}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
