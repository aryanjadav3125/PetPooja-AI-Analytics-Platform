'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import {
  IndianRupee, ShoppingCart, TrendingUp, Percent,
  Star, Award, Zap, Package, Layers, AlertTriangle, ArrowRight,
} from 'lucide-react';
import { KPICard, ChartCard, PageHeader, Button, Skeleton } from '@/components/ui/shared';
import { supabase } from '@/lib/supabase';
import type { ItemSalesAnalysis, MenuClassification, AOVAnalysis, BusinessInsight, ItemDemandTrend } from '@/lib/types';

const fmt = (n: number) => n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : n >= 1000 ? `₹${(n/1000).toFixed(1)}K` : `₹${n.toFixed(0)}`;
const classColors: Record<string, string> = { STAR: '#facc15', PUZZLE: '#a78bfa', PLOWHORSE: '#fb923c', DOG: '#f87171' };
const sevColors: Record<string, string> = { info: 'border-info/30 bg-info/5', success: 'border-profit/30 bg-profit/5', warning: 'border-warning/30 bg-warning/5', critical: 'border-loss/30 bg-loss/5' };

export default function DashboardPage() {
  const [sales, setSales] = useState<ItemSalesAnalysis[]>([]);
  const [cls, setCls] = useState<MenuClassification[]>([]);
  const [aov, setAov] = useState<AOVAnalysis[]>([]);
  const [demand, setDemand] = useState<ItemDemandTrend[]>([]);
  const [insights, setInsights] = useState<BusinessInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: s }, { data: c }, { data: a }, { data: d }] = await Promise.all([
        supabase.from('item_sales_analysis').select('*').order('total_profit', { ascending: false }),
        supabase.from('menu_performance_classification').select('*'),
        supabase.from('aov_analysis').select('*'),
        supabase.from('item_demand_trends').select('*').order('order_time', { ascending: true }),
      ]);
      const salesData = (s ?? []) as ItemSalesAnalysis[];
      const clsData = (c ?? []) as MenuClassification[];
      setSales(salesData);
      setCls(clsData);
      setAov((a ?? []) as AOVAnalysis[]);
      setDemand((d ?? []) as ItemDemandTrend[]);

      // Generate insights client-side from fetched data
      const gen: BusinessInsight[] = [];
      const totalRev = salesData.reduce((sum, i) => sum + i.total_revenue, 0);
      const totalProfit = salesData.reduce((sum, i) => sum + i.total_profit, 0);

      // Top category
      const catRev: Record<string, number> = {};
      salesData.forEach(i => { catRev[i.category] = (catRev[i.category] || 0) + i.total_revenue; });
      const topCat = Object.entries(catRev).sort((a, b) => b[1] - a[1])[0];
      if (topCat) gen.push({ type: 'revenue', icon: '📊', severity: 'info', title: `${topCat[0]} drives ${((topCat[1]/totalRev)*100).toFixed(0)}% of revenue`, description: `Your top category generates ${fmt(topCat[1])}. Consider expanding this section.` });

      // Top profitable item
      if (salesData[0]) gen.push({ type: 'revenue', icon: '💰', severity: 'success', title: `${salesData[0].item_name} is your profit champion`, description: `₹${salesData[0].contribution_margin} margin per unit, ${salesData[0].total_sold} units sold, ${fmt(salesData[0].total_profit)} total profit.`, action: 'Keep promoting' });

      // Puzzles
      const puzzles = clsData.filter(c => c.menu_category === 'PUZZLE');
      if (puzzles.length > 0) {
        const tp = puzzles.sort((a, b) => b.contribution_margin - a.contribution_margin)[0];
        gen.push({ type: 'menu', icon: '🧩', severity: 'warning', title: `${puzzles.length} PUZZLE items need promotion`, description: `${tp.item_name} has ₹${tp.contribution_margin} margin but only ${tp.total_sold} sales. Easy revenue if promoted.`, impact: `Potential ${fmt(tp.contribution_margin * 50)}/mo`, action: 'Run targeted promotion' });
      }
      // Dogs
      const dogs = clsData.filter(c => c.menu_category === 'DOG');
      if (dogs.length > 0) gen.push({ type: 'menu', icon: '🐕', severity: 'critical', title: `${dogs.length} DOG items dragging your menu`, description: 'Low margin + low sales. Remove or reengineer to free kitchen resources.', action: 'Review these items' });

      // Stars
      const stars = clsData.filter(c => c.menu_category === 'STAR');
      if (stars.length > 0) gen.push({ type: 'menu', icon: '⭐', severity: 'success', title: `${stars.length} STAR items performing well`, description: `${stars.slice(0, 3).map(s => s.item_name).join(', ')} — high margin + high sales. Your menu winners.` });

      setInsights(gen);
      setLoading(false);
    })();
  }, []);

  // KPIs
  const totalRevenue = useMemo(() => sales.reduce((s, i) => s + i.total_revenue, 0), [sales]);
  const totalProfit = useMemo(() => sales.reduce((s, i) => s + i.total_profit, 0), [sales]);
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const totalOrders = useMemo(() => aov.reduce((s, a) => s + a.total_orders, 0), [aov]);
  const avgAOV = useMemo(() => aov.length > 0 ? aov.reduce((s, a) => s + a.average_order_value, 0) / aov.length : 0, [aov]);
  const topSeller = sales.sort((a, b) => b.total_sold - a.total_sold)[0];
  const topProfit = sales.sort((a, b) => b.total_profit - a.total_profit)[0];

  // Category revenue chart
  const catData = useMemo(() => {
    const catMap: Record<string, { revenue: number; profit: number }> = {};
    sales.forEach(i => {
      if (!catMap[i.category]) catMap[i.category] = { revenue: 0, profit: 0 };
      catMap[i.category].revenue += i.total_revenue;
      catMap[i.category].profit += i.total_profit;
    });
    return Object.entries(catMap).map(([category, v]) => ({ category, ...v })).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [sales]);

  // Classification pie
  const classDist = useMemo(() => {
    const m: Record<string, number> = {};
    cls.forEach(c => { m[c.menu_category] = (m[c.menu_category] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [cls]);

  // Demand trend (aggregated by date)
  const demandTrend = useMemo(() => {
    const dayMap: Record<string, number> = {};
    demand.forEach(d => {
      const dt = d.order_time?.slice(0, 10) ?? '';
      dayMap[dt] = (dayMap[dt] || 0) + d.daily_sales;
    });
    return Object.entries(dayMap).map(([date, sales]) => ({ date, sales })).sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
  }, [demand]);

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">{Array.from({length: 7}).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Business Command Center" subtitle="Real-time intelligence for smarter restaurant decisions" />

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <KPICard label="Total Revenue" value={fmt(totalRevenue)} icon={IndianRupee} color="brand" />
        <KPICard label="Total Profit" value={fmt(totalProfit)} icon={IndianRupee} color="profit" />
        <KPICard label="Avg Order Value" value={fmt(avgAOV)} icon={TrendingUp} color="info" />
        <KPICard label="Total Orders" value={totalOrders.toLocaleString()} icon={ShoppingCart} color="brand" />
        <KPICard label="Profit Margin" value={`${profitMargin.toFixed(1)}%`} icon={Percent} color={profitMargin > 40 ? 'profit' : 'warning'} />
        <KPICard label="Top Seller" value={topSeller?.item_name ?? '—'} icon={Star} color="brand" subtitle={`${topSeller?.total_sold ?? 0} sold`} />
        <KPICard label="Most Profitable" value={topProfit?.item_name ?? '—'} icon={Award} color="profit" subtitle={fmt(topProfit?.total_profit ?? 0)} />
      </div>

      {/* AI Insights Panel */}
      <div className="glass-card p-5 animate-fade-in">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={18} className="text-brand-400" />
          <h3 className="text-sm font-semibold">AI Business Insights</h3>
          <span className="text-xs text-[var(--color-text-dim)] ml-auto">{insights.length} insights generated</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {insights.map((insight, i) => (
            <div key={i} className={`rounded-xl border p-4 animate-fade-in ${sevColors[insight.severity]}`} style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="flex items-start gap-2 mb-2">
                <span className="text-lg">{insight.icon}</span>
                <h4 className="text-sm font-semibold leading-tight">{insight.title}</h4>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{insight.description}</p>
              {insight.impact && <p className="text-xs font-medium text-brand-400 mt-2">{insight.impact}</p>}
              {insight.action && (
                <div className="mt-2 flex items-center gap-1 text-xs font-medium text-brand-400">
                  <ArrowRight size={12} /> {insight.action}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Sales Trend" subtitle="Daily order volume (last 30 days)">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={demandTrend}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2e3348" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#1e2235', border: '1px solid #2e3348', borderRadius: 12 }} />
              <Area type="monotone" dataKey="sales" stroke="#2563eb" fill="url(#salesGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenue by Category" subtitle="Top 8 categories">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={catData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2e3348" />
              <XAxis dataKey="category" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => fmt(v)} />
              <Tooltip contentStyle={{ background: '#1e2235', border: '1px solid #2e3348', borderRadius: 12 }} />
              <Legend />
              <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} name="Revenue" />
              <Bar dataKey="profit" fill="#22c55e" radius={[4, 4, 0, 0]} name="Profit" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 2: Pie + Top items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Menu Health" subtitle="Item classification distribution">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={classDist} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                {classDist.map(e => <Cell key={e.name} fill={classColors[e.name] ?? '#6b7280'} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1e2235', border: '1px solid #2e3348', borderRadius: 12 }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {classDist.map(d => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: classColors[d.name] }} />
                <span className="text-[var(--color-text-muted)]">{d.name}: {d.value} items</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Top 10 Profitable Items" subtitle="By total profit" className="lg:col-span-2">
          <div className="space-y-2">
            {sales.slice(0, 10).map((item, i) => {
              const maxProfit = sales[0]?.total_profit || 1;
              const pct = (item.total_profit / maxProfit) * 100;
              return (
                <div key={item.item_id} className="flex items-center gap-3">
                  <span className="text-xs text-[var(--color-text-dim)] w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate">{item.item_name}</span>
                      <span className="text-sm font-bold text-profit">{fmt(item.total_profit)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-[var(--color-surface-3)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-profit" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between mt-0.5 text-xs text-[var(--color-text-dim)]">
                      <span>{item.category} • ₹{item.contribution_margin} margin</span>
                      <span>{item.total_sold} sold</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2"><Zap size={18} className="text-puzzle" /><h3 className="text-sm font-semibold">Promote Puzzles</h3></div>
          <p className="text-xs text-[var(--color-text-dim)]">{cls.filter(c => c.menu_category === 'PUZZLE').length} items with high margin + low sales — promote for instant revenue.</p>
          <Button variant="secondary" size="sm" onClick={() => window.location.href = '/menu'}>View Menu Intel →</Button>
        </div>
        <div className="glass-card p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2"><Layers size={18} className="text-brand-400" /><h3 className="text-sm font-semibold">Create Combos</h3></div>
          <p className="text-xs text-[var(--color-text-dim)]">Frequently paired items detected. Bundle them for AOV uplift.</p>
          <Button variant="secondary" size="sm" onClick={() => window.location.href = '/combos'}>View Combos →</Button>
        </div>
        <div className="glass-card p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2"><Package size={18} className="text-warning" /><h3 className="text-sm font-semibold">Inventory Alerts</h3></div>
          <p className="text-xs text-[var(--color-text-dim)]">Low-stock ingredients may cause menu outages.</p>
          <Button variant="secondary" size="sm" onClick={() => window.location.href = '/inventory'}>View Inventory →</Button>
        </div>
      </div>
    </div>
  );
}
