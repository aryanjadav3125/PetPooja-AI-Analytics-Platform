import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ItemSalesAnalysis,
  MenuClassification,
  ComboDetection,
  AOVAnalysis,
  ItemDemandTrend,
  UpsellCandidate,
  InventoryAlert,
  RevenueOpportunity,
  EnrichedCombo,
} from './types';

// ── Lazy client ──────────────────────────────────────────────
let _sb: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!_sb) _sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
  return _sb;
}
export const supabase = { from: (...args: Parameters<SupabaseClient['from']>) => sb().from(...args) } as unknown as SupabaseClient;

export function getServiceClient() {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', k);
}

// ── Views ────────────────────────────────────────────────────
export async function getItemSales(): Promise<ItemSalesAnalysis[]> {
  const { data } = await sb().from('item_sales_analysis').select('*').order('total_profit', { ascending: false });
  return (data ?? []) as ItemSalesAnalysis[];
}

export async function getMenuClassification(): Promise<MenuClassification[]> {
  const { data } = await sb().from('menu_performance_classification').select('*');
  return (data ?? []) as MenuClassification[];
}

export async function getCombos(): Promise<ComboDetection[]> {
  const { data } = await sb().from('combo_detection').select('*').order('frequency', { ascending: false }).limit(200);
  return (data ?? []) as ComboDetection[];
}

export async function getAOV(): Promise<AOVAnalysis[]> {
  const { data } = await sb().from('aov_analysis').select('*');
  return (data ?? []) as AOVAnalysis[];
}

export async function getDemandTrends(): Promise<ItemDemandTrend[]> {
  const { data } = await sb().from('item_demand_trends').select('*').order('order_time', { ascending: true });
  return (data ?? []) as ItemDemandTrend[];
}

export async function getUpsellCandidates(): Promise<UpsellCandidate[]> {
  const { data } = await sb().from('upsell_candidates').select('*');
  return (data ?? []) as UpsellCandidate[];
}

export async function getInventoryAlerts(): Promise<InventoryAlert[]> {
  const { data } = await sb().from('inventory_alerts').select('*');
  return (data ?? []) as InventoryAlert[];
}

export async function getRevenueOpportunities(): Promise<RevenueOpportunity[]> {
  const { data } = await sb().from('revenue_opportunities').select('*');
  return (data ?? []) as RevenueOpportunity[];
}

// ── Item lookup from item_sales_analysis (Menu table is RLS-blocked) ──
export async function getItemMap(): Promise<Map<string, ItemSalesAnalysis>> {
  const sales = await getItemSales();
  return new Map(sales.map(s => [s.item_id, s]));
}

// ── Enriched combos (join with item_sales_analysis for names + margins) ──
export async function getEnrichedCombos(): Promise<EnrichedCombo[]> {
  const [combos, salesItems] = await Promise.all([getCombos(), getItemSales()]);
  const itemMap = new Map(salesItems.map(s => [s.item_id, s]));
  const totalFreq = combos.reduce((s, c) => s + c.frequency, 0) || 1;
  const avgAOV = salesItems.length > 0 ? salesItems.reduce((s, i) => s + i.total_revenue / Math.max(i.total_sold, 1), 0) / salesItems.length : 300;

  return combos
    .map(c => {
      const a = itemMap.get(c.item_a);
      const b = itemMap.get(c.item_b);
      if (!a || !b) return null;
      const aPrice = a.total_sold > 0 ? Math.round(a.total_revenue / a.total_sold) : 0;
      const bPrice = b.total_sold > 0 ? Math.round(b.total_revenue / b.total_sold) : 0;
      const sumPrice = aPrice + bPrice;
      const combinedMargin = a.contribution_margin + b.contribution_margin;
      const discount = Math.max(Math.round(sumPrice * 0.1), 20);
      const bundlePrice = sumPrice - discount;
      return {
        item_a: c.item_a,
        item_b: c.item_b,
        item_a_name: a.item_name,
        item_b_name: b.item_name,
        item_a_category: a.category,
        item_b_category: b.category,
        frequency: c.frequency,
        combined_margin: combinedMargin,
        combined_revenue: sumPrice * c.frequency,
        bundle_price: bundlePrice,
        discount,
        aov_uplift_pct: +((bundlePrice / avgAOV - 1) * 100).toFixed(1),
      } as EnrichedCombo;
    })
    .filter(Boolean) as EnrichedCombo[];
}
