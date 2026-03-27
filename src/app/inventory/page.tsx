'use client';
import { useEffect, useState, useMemo } from 'react';
import { PageHeader, KPICard, Badge, Skeleton } from '@/components/ui/shared';
import { Package, AlertTriangle, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { InventoryAlert } from '@/lib/types';

export default function InventoryPage() {
  const [rawInv, setRawInv] = useState<InventoryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('inventory_alerts').select('*');
      setRawInv((data ?? []) as InventoryAlert[]);
      setLoading(false);
    })();
  }, []);

  // Deduplicate: group by ingredient_name, aggregate stock across merchants
  const inv = useMemo(() => {
    const map = new Map<string, { ingredient_name: string; total_stock: number; unit: string; avg_cost: number; merchants: string[]; min_stock: number; inventory_ids: number[]; last_updated: string }>();
    rawInv.forEach(item => {
      const key = item.ingredient_name.toLowerCase().trim();
      const existing = map.get(key);
      if (existing) {
        existing.total_stock += item.stock_quantity;
        existing.min_stock = Math.min(existing.min_stock, item.stock_quantity);
        existing.avg_cost = Math.round((existing.avg_cost + (item.cost_per_unit || 0)) / 2);
        if (!existing.merchants.includes(item.merchant_id)) existing.merchants.push(item.merchant_id);
        existing.inventory_ids.push(item.inventory_id);
        if (item.last_updated > existing.last_updated) existing.last_updated = item.last_updated;
      } else {
        map.set(key, {
          ingredient_name: item.ingredient_name,
          total_stock: item.stock_quantity,
          unit: item.unit,
          avg_cost: item.cost_per_unit || 0,
          merchants: [item.merchant_id],
          min_stock: item.stock_quantity,
          inventory_ids: [item.inventory_id],
          last_updated: item.last_updated || '',
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.min_stock - b.min_stock);
  }, [rawInv]);

  const getStatus = (item: typeof inv[0]) => {
    if (item.min_stock < 5) return 'critical';
    if (item.min_stock < 10) return 'low';
    if (item.min_stock < 20) return 'medium';
    return 'ok';
  };

  const filtered = useMemo(() => {
    if (!statusFilter) return inv;
    return inv.filter(i => getStatus(i) === statusFilter);
  }, [inv, statusFilter]);

  const critical = inv.filter(i => getStatus(i) === 'critical');
  const low = inv.filter(i => getStatus(i) === 'low');
  const totalValue = inv.reduce((s, i) => s + (i.total_stock * i.avg_cost), 0);

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-80" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory Intelligence" subtitle={`${inv.length} unique ingredients tracked (deduplicated from ${rawInv.length} records across merchants)`} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Unique Ingredients" value={inv.length.toString()} icon={Package} color="brand" />
        <KPICard label="Critical Stock" value={critical.length.toString()} icon={AlertTriangle} color="loss" subtitle="< 5 units at any outlet" />
        <KPICard label="Low Stock" value={low.length.toString()} icon={AlertTriangle} color="warning" subtitle="5-10 units" />
        <KPICard label="Total Stock Value" value={`₹${(totalValue/1000).toFixed(1)}K`} icon={DollarSign} color="profit" />
      </div>

      {critical.length > 0 && (
        <div className="glass-card p-4 border-l-4 border-loss animate-fade-in">
          <p className="text-sm"><span className="font-bold text-loss">⚠ Critical Alert:</span> {critical.slice(0, 5).map(i => `${i.ingredient_name} (${i.min_stock}${i.unit} at lowest outlet)`).join(', ')} — reorder immediately to avoid menu outages.</p>
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex gap-2">
        {[
          { key: '', label: 'All', count: inv.length },
          { key: 'critical', label: '🔴 Critical', count: critical.length },
          { key: 'low', label: '🟡 Low', count: low.length },
          { key: 'medium', label: '🟢 Medium', count: inv.filter(i => getStatus(i) === 'medium').length },
          { key: 'ok', label: '✅ OK', count: inv.filter(i => getStatus(i) === 'ok').length },
        ].map(tab => (
          <button key={tab.key} onClick={() => setStatusFilter(tab.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${statusFilter === tab.key ? 'bg-brand-500/20 border-brand-500 text-brand-400' : 'bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-brand-500'}`}>
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Inventory table */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold mb-4">Inventory Status ({filtered.length} items)</h3>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[var(--color-surface)]"><tr className="border-b border-[var(--color-border)] text-xs text-[var(--color-text-dim)]">
              <th className="text-left py-2 pr-3">Ingredient</th>
              <th className="text-right py-2 pr-3">Lowest Stock</th>
              <th className="text-right py-2 pr-3">Total Stock</th>
              <th className="text-left py-2 pr-3">Unit</th>
              <th className="text-right py-2 pr-3">Cost/Unit</th>
              <th className="text-right py-2 pr-3">Total Value</th>
              <th className="text-center py-2 pr-3">Outlets</th>
              <th className="text-center py-2 pr-3">Status</th>
              <th className="text-left py-2">Action</th>
            </tr></thead>
            <tbody>{filtered.map((item, i) => {
              const status = getStatus(item);
              const value = item.total_stock * item.avg_cost;
              return (
                <tr key={`${item.ingredient_name}-${i}`} className="border-b border-[var(--color-border)]/30 hover:bg-[var(--color-surface-2)] transition-colors">
                  <td className="py-2.5 pr-3 font-medium">{item.ingredient_name}</td>
                  <td className="py-2.5 pr-3 text-right font-mono font-bold"
                    style={{ color: status === 'critical' ? '#ef4444' : status === 'low' ? '#f59e0b' : '#22c55e' }}>
                    {item.min_stock}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono">{item.total_stock}</td>
                  <td className="py-2.5 pr-3 text-xs">{item.unit}</td>
                  <td className="py-2.5 pr-3 text-right font-mono">₹{item.avg_cost}</td>
                  <td className="py-2.5 pr-3 text-right font-mono">₹{value.toLocaleString()}</td>
                  <td className="py-2.5 pr-3 text-center text-xs">{item.merchants.length} outlet{item.merchants.length > 1 ? 's' : ''}</td>
                  <td className="py-2.5 pr-3 text-center">
                    <Badge variant={status === 'critical' ? 'danger' : status === 'low' ? 'warning' : 'success'}>
                      {status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="py-2.5 text-xs">
                    {status === 'critical' ? '🚨 Reorder NOW' : status === 'low' ? '📦 Reorder soon' : '✅ Adequate'}
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
