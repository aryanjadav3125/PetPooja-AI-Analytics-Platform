// AI Context retrieval — smart query classifier + context builder

import { getItemSales, getMenuClassification, getEnrichedCombos, getUpsellCandidates, getInventoryAlerts, getRevenueOpportunities, getAOV } from './supabase';

/** Classify user question and fetch relevant data as context string */
export async function buildAIContext(question: string): Promise<string> {
  const q = question.toLowerCase();
  const blocks: string[] = [];

  // Always include top items
  const sales = await getItemSales();
  blocks.push(`## Top Items by Profit\n${JSON.stringify(sales.slice(0, 8).map(s => ({ item: s.item_name, category: s.category, profit: s.total_profit, margin: s.contribution_margin, sold: s.total_sold, revenue: s.total_revenue })), null, 1)}`);

  // Menu classification  
  const cls = await getMenuClassification();
  const stars = cls.filter(c => c.menu_category === 'STAR');
  const puzzles = cls.filter(c => c.menu_category === 'PUZZLE');
  const dogs = cls.filter(c => c.menu_category === 'DOG');
  blocks.push(`## Menu Engineering\nSTARS (${stars.length}): ${stars.slice(0, 5).map(s => s.item_name).join(', ')}\nPUZZLES (${puzzles.length}): ${puzzles.slice(0, 5).map(s => `${s.item_name} (margin ₹${s.contribution_margin}, sold ${s.total_sold})`).join(', ')}\nDOGS (${dogs.length}): ${dogs.slice(0, 5).map(s => s.item_name).join(', ')}`);

  if (/combo|bundle|pair|together|aov/i.test(q)) {
    const combos = await getEnrichedCombos();
    blocks.push(`## Top Combos\n${JSON.stringify(combos.slice(0, 8).map(c => ({ combo: `${c.item_a_name} + ${c.item_b_name}`, frequency: c.frequency, margin: c.combined_margin, bundle_price: c.bundle_price })), null, 1)}`);
  }

  if (/promot|upsell|push|market/i.test(q)) {
    const upsell = await getUpsellCandidates();
    blocks.push(`## Upsell Candidates (high margin, low sales)\n${JSON.stringify(upsell.slice(0, 8).map(u => ({ item: u.item_name, category: u.category, margin: u.contribution_margin, sold: u.total_sold })), null, 1)}`);
  }

  if (/inventor|stock|reorder|supply/i.test(q)) {
    const inv = await getInventoryAlerts();
    blocks.push(`## Inventory Status\n${JSON.stringify(inv.slice(0, 10).map(i => ({ ingredient: i.ingredient_name, stock: `${i.stock_quantity}${i.unit}`, merchant: i.merchant_id })), null, 1)}`);
  }

  if (/revenue|opportunit|grow|increas/i.test(q)) {
    const revOps = await getRevenueOpportunities();
    blocks.push(`## Revenue Opportunities\n${JSON.stringify(revOps.slice(0, 8).map(r => ({ item: r.item_name, recommendation: r.recommendation, margin: r.contribution_margin, sold: r.total_sold })), null, 1)}`);
  }

  if (/pric|cost|expensiv|cheap/i.test(q)) {
    const aov = await getAOV();
    blocks.push(`## AOV by Merchant\n${JSON.stringify(aov.slice(0, 10), null, 1)}`);
  }

  return blocks.join('\n\n');
}
