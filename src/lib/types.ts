// ── Exact types matching Supabase schema ─────────────────────

// Tables (PascalCase in Supabase)
export interface Merchant {
  merchant_id: string;
  restaurant_name: string;
  location?: string;
  city?: string;
  state?: string;
  owner_name?: string;
  cuisine_type?: string;
}

export interface MenuItem {
  item_id: string;
  merchant_id: string;
  item_name: string;
  category: string;
  selling_price: number;
  food_cost: number;
  contribution_margin: number;
  created_at?: string;
}

export interface Order {
  order_id: number;
  merchant_id: string;
  order_time: string;
  order_channel?: string;
  customer_phone?: string;
  total_amount: number;
}

export interface OrderItem {
  order_item_id?: number;
  order_id: number;
  item_id: string;
  quantity: number;
  selling_price: number;
  profit: number;
}

export interface InventoryRow {
  inventory_id: number;
  merchant_id: string;
  ingredient_name: string;
  stock_quantity: number;
  unit: string;
}

// ── View types (exact columns from Supabase) ────────────────

export interface ItemSalesAnalysis {
  item_id: string;
  item_name: string;
  category: string;
  contribution_margin: number;
  total_sold: number;
  total_profit: number;
  total_revenue: number;
}

export interface MenuClassification {
  item_id: string;
  item_name: string;
  category: string;
  contribution_margin: number;
  total_sold: number;
  menu_category: 'STAR' | 'PUZZLE' | 'PLOWHORSE' | 'DOG';
}

export interface ComboDetection {
  item_a: string; // item_id
  item_b: string; // item_id
  frequency: number;
}

export interface AOVAnalysis {
  merchant_id: string;
  average_order_value: number;
  total_orders: number;
}

export interface ItemDemandTrend {
  item_id: string;
  order_time: string;
  daily_sales: number;
}

export interface UpsellCandidate {
  item_id: string;
  item_name: string;
  category: string;
  contribution_margin: number;
  total_sold: number;
  total_profit: number;
  total_revenue: number;
}

export interface PriceOptCandidate {
  item_id: string;
  item_name: string;
  category: string;
  contribution_margin: number;
  total_sold: number;
  total_profit: number;
  total_revenue: number;
}

export interface InventoryAlert {
  inventory_id: number;
  merchant_id: string;
  ingredient_name: string;
  stock_quantity: number;
  unit: string;
  cost_per_unit: number;
  last_updated: string;
}

export interface RevenueOpportunity {
  item_name: string;
  category: string;
  contribution_margin: number;
  total_sold: number;
  total_profit: number;
  recommendation: string;
}

// ── Enriched types (computed in frontend) ────────────────────

export interface EnrichedCombo {
  item_a: string;
  item_b: string;
  item_a_name: string;
  item_b_name: string;
  item_a_category: string;
  item_b_category: string;
  frequency: number;
  combined_margin: number;
  combined_revenue: number;
  bundle_price: number;
  discount: number;
  aov_uplift_pct: number;
}

export interface BusinessInsight {
  type: 'revenue' | 'menu' | 'combo' | 'demand' | 'inventory' | 'upsell' | 'price';
  icon: string;
  title: string;
  description: string;
  impact?: string;
  action?: string;
  severity: 'info' | 'success' | 'warning' | 'critical';
}
