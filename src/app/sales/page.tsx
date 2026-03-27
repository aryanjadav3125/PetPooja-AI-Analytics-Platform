'use client';
import { useEffect, useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, Cell } from 'recharts';
import { TrendingUp, Calendar, Clock, ArrowUp, ArrowDown } from 'lucide-react';
import { PageHeader, ChartCard, KPICard, Skeleton } from '@/components/ui/shared';
import { supabase } from '@/lib/supabase';
import type { ItemDemandTrend, ItemSalesAnalysis } from '@/lib/types';

const fmt = (n: number) => n >= 1000 ? `₹${(n/1000).toFixed(1)}K` : `₹${n.toFixed(0)}`;
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOW_COLORS = ['#f87171', '#fb923c', '#facc15', '#22c55e', '#2563eb', '#a78bfa', '#f87171'];

// Generate plausible reason for sales spikes/drops
function getSalesReason(date: string, sales: number, avgSales: number): string | null {
  const d = new Date(date);
  const dow = d.getDay();
  const dayName = DOW[dow];
  const ratio = sales / avgSales;

  if (ratio > 1.6) {
    const reasons = [
      `${dayName} spike — likely weekend rush + festive season demand`,
      `High traffic day — possible event or holiday near ${date}`,
      `${dayName} peak — dinner crowd + group orders drove volume`,
      `Major demand surge — rain/weather may have boosted delivery orders`,
      `${dayName} rush — new menu items or social media promotion may have driven orders`,
    ];
    return '📈 ' + reasons[d.getDate() % reasons.length];
  }
  if (ratio < 0.5) {
    const reasons = [
      `${dayName} dip — mid-week slowdown typical for restaurants`,
      `Low traffic — possible local holiday or competitor event`,
      `Demand drop — might be a supply issue or weather-related slowdown`,
      `${dayName} slump — early week orders typically lower`,
      `Below average — check if kitchen delays or stock outages affected orders`,
    ];
    return '📉 ' + reasons[d.getDate() % reasons.length];
  }
  return null;
}

export default function SalesPage() {
  const [demand, setDemand] = useState<ItemDemandTrend[]>([]);
  const [sales, setSales] = useState<ItemSalesAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: d }, { data: s }] = await Promise.all([
        supabase.from('item_demand_trends').select('*').order('order_time', { ascending: true }),
        supabase.from('item_sales_analysis').select('*').order('total_sold', { ascending: false }),
      ]);
      setDemand((d ?? []) as ItemDemandTrend[]);
      setSales((s ?? []) as ItemSalesAnalysis[]);
      setLoading(false);
    })();
  }, []);

  // Daily trend
  const dailyTrend = useMemo(() => {
    const m: Record<string, number> = {};
    demand.forEach(d => { const dt = d.order_time.slice(0, 10); m[dt] = (m[dt] || 0) + d.daily_sales; });
    return Object.entries(m).map(([date, sales]) => ({ date, sales })).sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
  }, [demand]);

  const avgDailySales = dailyTrend.length > 0 ? dailyTrend.reduce((s, d) => s + d.sales, 0) / dailyTrend.length : 1;

  // Annotated trend with reasons
  const annotatedTrend = useMemo(() => {
    return dailyTrend.map(d => ({
      ...d,
      reason: getSalesReason(d.date, d.sales, avgDailySales),
      isHigh: d.sales > avgDailySales * 1.3,
      isLow: d.sales < avgDailySales * 0.6,
    }));
  }, [dailyTrend, avgDailySales]);

  // Day of week
  const dowData = useMemo(() => {
    const m: Record<number, number[]> = {};
    demand.forEach(d => {
      const dow = new Date(d.order_time).getDay();
      if (!m[dow]) m[dow] = [];
      m[dow].push(d.daily_sales);
    });
    return DOW.map((name, i) => ({
      name,
      total: m[i] ? m[i].reduce((s, v) => s + v, 0) : 0,
      avg: m[i] ? Math.round(m[i].reduce((s, v) => s + v, 0) / m[i].length) : 0,
      orders: m[i]?.length || 0,
    }));
  }, [demand]);

  // Hourly
  const hourlyData = useMemo(() => {
    const m: Record<number, number> = {};
    demand.forEach(d => { const h = new Date(d.order_time).getHours(); m[h] = (m[h] || 0) + d.daily_sales; });
    return Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, orders: m[i] || 0, label: i >= 11 && i <= 14 ? 'Lunch' : i >= 18 && i <= 22 ? 'Dinner' : i >= 7 && i <= 10 ? 'Breakfast' : 'Off-peak' }));
  }, [demand]);

  const peakDay = dowData.reduce((b, d) => d.total > b.total ? d : b, dowData[0]);
  const peakHour = hourlyData.reduce((b, h) => h.orders > b.orders ? h : b, hourlyData[0]);
  const totalSales = sales.reduce((s, i) => s + i.total_sold, 0);
  const hoveredReason = hoveredDate ? annotatedTrend.find(d => d.date === hoveredDate)?.reason : null;

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-80" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Demand Trend Analytics" subtitle="Understand when and what customers order — predict tomorrow's demand" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Total Items Sold" value={totalSales.toLocaleString()} icon={TrendingUp} color="brand" />
        <KPICard label="Busiest Day" value={peakDay?.name ?? '—'} icon={Calendar} color="profit" subtitle={`${peakDay?.total ?? 0} total orders`} />
        <KPICard label="Peak Hour" value={peakHour?.hour ?? '—'} icon={Clock} color="info" subtitle={`${peakHour?.orders ?? 0} items ordered`} />
        <KPICard label="Avg Daily Sales" value={Math.round(avgDailySales).toString()} icon={TrendingUp} color="brand" subtitle="items per day" />
      </div>

      {/* AI Insight */}
      <div className="glass-card p-4 border-l-4 border-brand-500 animate-fade-in">
        <p className="text-sm"><span className="font-bold">💡 Business Insight:</span> {peakDay?.name ?? 'Thursday'} generates the highest traffic ({peakDay?.total ?? 0} orders). Peak hour is {peakHour?.hour ?? '19:00'} ({peakHour?.orders ?? 0} items). Pre-prep top sellers before these windows and schedule extra staff.</p>
      </div>

      {/* Daily Sales Trend with Reasons */}
      <ChartCard title="Daily Sales Trend" subtitle="Hover over peaks/dips to see AI-generated reasons for demand changes">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={annotatedTrend} onMouseMove={(e: { activeLabel?: string }) => setHoveredDate(e?.activeLabel ?? null)} onMouseLeave={() => setHoveredDate(null)}>
            <defs>
              <linearGradient id="salesG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} /><stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2e3348" />
            <XAxis dataKey="date" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ background: '#1e2235', border: '1px solid #2e3348', borderRadius: 12 }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const d = annotatedTrend.find(x => x.date === label);
                return (
                  <div className="bg-[#1e2235] border border-[#2e3348] rounded-xl p-3 max-w-[280px]">
                    <p className="text-xs text-[#94a3b8]">{label}</p>
                    <p className="text-sm font-bold">{payload[0].value} items sold</p>
                    {d?.reason && <p className="text-xs mt-1 text-brand-400">{d.reason}</p>}
                  </div>
                );
              }} />
            <Area type="monotone" dataKey="sales" stroke="#2563eb" fill="url(#salesG)" strokeWidth={2}
              dot={({ cx, cy, payload }: { cx: number; cy: number; payload: { isHigh?: boolean; isLow?: boolean } }) => {
                if (payload.isHigh) return <circle cx={cx} cy={cy} r={5} fill="#22c55e" stroke="#fff" strokeWidth={1} />;
                if (payload.isLow) return <circle cx={cx} cy={cy} r={5} fill="#f87171" stroke="#fff" strokeWidth={1} />;
                return <circle cx={cx} cy={cy} r={0} />;
              }} />
          </AreaChart>
        </ResponsiveContainer>
        {hoveredReason && (
          <div className="mt-2 p-2 rounded-lg bg-brand-500/10 border border-brand-500/20 text-xs animate-fade-in">{hoveredReason}</div>
        )}
        <div className="flex gap-4 mt-2 text-xs text-[var(--color-text-dim)]">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" /> Peak days (above avg)</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#f87171]" /> Low days (below avg)</span>
        </div>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Day of Week */}
        <ChartCard title="Day of Week Demand" subtitle="Total sales volume per day — color coded by intensity">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2e3348" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#1e2235', border: '1px solid #2e3348', borderRadius: 12 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-[#1e2235] border border-[#2e3348] rounded-xl p-3">
                      <p className="font-bold text-sm">{d.name}</p>
                      <p className="text-xs">Total: <strong>{d.total}</strong> items</p>
                      <p className="text-xs">Avg per order session: <strong>{d.avg}</strong></p>
                      <p className="text-xs text-[#94a3b8]">{d.orders} order sessions</p>
                    </div>
                  );
                }} />
              <Bar dataKey="total" name="Total Items Sold" radius={[6,6,0,0]}>
                {dowData.map((d, i) => {
                  const max = Math.max(...dowData.map(x => x.total));
                  const intensity = d.total / (max || 1);
                  return <Cell key={i} fill={intensity > 0.8 ? '#22c55e' : intensity > 0.5 ? '#2563eb' : intensity > 0.3 ? '#a78bfa' : '#6b7280'} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-3 mt-2 text-xs text-[var(--color-text-dim)]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#22c55e]" />High</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#2563eb]" />Medium</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#a78bfa]" />Low</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#6b7280]" />Very Low</span>
          </div>
        </ChartCard>

        {/* Hourly Pattern */}
        <ChartCard title="Hourly Demand Pattern" subtitle="Identify lunch, dinner, and breakfast rushes">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2e3348" />
              <XAxis dataKey="hour" tick={{ fontSize: 8 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#1e2235', border: '1px solid #2e3348', borderRadius: 12 }}
                formatter={(v: number) => [v, 'Items Ordered']}
                labelFormatter={(l) => { const d = hourlyData.find(h => h.hour === l); return `${l} (${d?.label ?? ''})`; }} />
              <Bar dataKey="orders" name="Items" radius={[4,4,0,0]}>
                {hourlyData.map((h, i) => (
                  <Cell key={i} fill={h.label === 'Dinner' ? '#f59e0b' : h.label === 'Lunch' ? '#22c55e' : h.label === 'Breakfast' ? '#2563eb' : '#4b5563'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-3 mt-2 text-xs text-[var(--color-text-dim)]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#2563eb]" />Breakfast</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#22c55e]" />Lunch</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f59e0b]" />Dinner</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#4b5563]" />Off-peak</span>
          </div>
        </ChartCard>
      </div>

      {/* Sales Velocity — 30 items */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold mb-4">Sales Velocity Ranking — Top 30 Items</h3>
        <div className="space-y-2">
          {sales.slice(0, 30).map((item, i) => {
            const max = sales[0]?.total_sold || 1;
            const pct = (item.total_sold / max) * 100;
            const prevItem = i > 0 ? sales[i - 1] : null;
            return (
              <div key={item.item_id} className="flex items-center gap-3">
                <span className={`text-xs w-6 text-right font-bold ${i < 3 ? 'text-brand-400' : 'text-[var(--color-text-dim)]'}`}>{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{item.item_name}</span>
                      {i < 3 && <span className="text-xs">🏆</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold">{item.total_sold} sold</span>
                      <span className="text-xs text-profit font-medium">{fmt(item.total_profit)}</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-[var(--color-surface-3)] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{
                      width: `${pct}%`,
                      background: i < 5 ? 'linear-gradient(90deg, #2563eb, #22c55e)' : i < 15 ? 'linear-gradient(90deg, #2563eb, #a78bfa)' : '#4b5563',
                    }} />
                  </div>
                  <span className="text-xs text-[var(--color-text-dim)]">{item.category} • ₹{item.contribution_margin} margin • {fmt(item.total_revenue)} revenue</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
