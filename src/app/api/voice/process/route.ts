import { NextResponse } from 'next/server';
import { chatCompletion, SYSTEM_PROMPT_VOICE } from '@/lib/llm';
import { getItemSales, getEnrichedCombos, getUpsellCandidates } from '@/lib/supabase';

function similarity(a: string, b: string): number {
  const al = a.toLowerCase().trim(), bl = b.toLowerCase().trim();
  if (al === bl) return 1;
  if (al.includes(bl) || bl.includes(al)) return 0.85;
  const aWords = al.split(/\s+/), bWords = bl.split(/\s+/);
  const commonWords = aWords.filter(w => bWords.some(bw => bw.includes(w) || w.includes(bw)));
  if (commonWords.length > 0) return commonWords.length / Math.max(aWords.length, bWords.length);
  return 0;
}

export async function POST(req: Request) {
  try {
    const ct = req.headers.get('content-type') ?? '';
    let transcript = '';

    if (ct.includes('multipart/form-data')) {
      // Audio STT via Gemini (Google AI Studio does not support Whisper, use text fallback)
      const formData = await req.formData();
      const audioBlob = formData.get('audio');
      if (audioBlob && process.env.GOOGLE_API_KEY) {
        // Gemini does not yet have a direct audio STT API like Whisper.
        // For the prototype, we use the Web Speech API on the client side for STT.
        // If audio arrives here, we acknowledge but ask for text.
        transcript = 'Audio received — for best results, use the text input or browser speech recognition.';
      } else {
        transcript = 'ek butter chicken aur do naan please';
      }
    } else {
      const body = await req.json();
      transcript = body.text ?? '';
    }

    if (!transcript) return NextResponse.json({ error: 'No transcript' }, { status: 400 });

    // Get menu items from item_sales_analysis (accessible view)
    const salesItems = await getItemSales();
    const menuNames = salesItems.map(m => m.item_name);

    // LLM intent extraction using Gemini
    const result = await chatCompletion([
      { role: 'system', content: SYSTEM_PROMPT_VOICE },
      { role: 'user', content: `Available menu items: ${JSON.stringify(menuNames.slice(0, 100))}\n\nCustomer said: "${transcript}"` },
    ], { temperature: 0.2, maxTokens: 800 });

    let parsed;
    try {
      const cleaned = result.content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { items: [], ambiguous: [{ name: transcript, options: menuNames.slice(0, 5) }], language: 'en' };
    }

    // Fuzzy match items to menu
    const itemMap = new Map(salesItems.map(s => [s.item_id, s]));
    const matchedItems = (parsed.items || []).map((item: { name: string; qty: number; modifiers?: string[] }) => {
      let bestMatch = salesItems[0];
      let bestScore = 0;
      for (const m of salesItems) {
        const score = similarity(item.name, m.item_name);
        if (score > bestScore) { bestScore = score; bestMatch = m; }
      }
      if (bestScore < 0.3) {
        parsed.ambiguous = parsed.ambiguous || [];
        parsed.ambiguous.push({ name: item.name, options: menuNames.slice(0, 5) });
        return null;
      }
      const unitPrice = bestMatch.total_sold > 0 ? Math.round(bestMatch.total_revenue / bestMatch.total_sold) : 200;
      return {
        item_id: bestMatch.item_id,
        name: bestMatch.item_name,
        qty: item.qty || 1,
        price: unitPrice,
        category: bestMatch.category,
        modifiers: item.modifiers || [],
      };
    }).filter(Boolean);

    // Smart upsells from data
    const upsells: { name: string; reason: string; price: number }[] = [];

    // 1. Combo-based upsells
    const matchedIds = matchedItems.map((i: { item_id: string }) => i.item_id);
    if (matchedIds.length > 0) {
      try {
        const combos = await getEnrichedCombos();
        const comboUpsells = combos
          .filter(c => matchedIds.includes(c.item_a) || matchedIds.includes(c.item_b))
          .filter(c => !matchedIds.includes(c.item_a) || !matchedIds.includes(c.item_b))
          .slice(0, 2)
          .map(c => {
            const suggestId = matchedIds.includes(c.item_a) ? c.item_b : c.item_a;
            const suggestItem = itemMap.get(suggestId);
            const price = suggestItem && suggestItem.total_sold > 0 ? Math.round(suggestItem.total_revenue / suggestItem.total_sold) : 150;
            return {
              name: matchedIds.includes(c.item_a) ? c.item_b_name : c.item_a_name,
              reason: `Customers frequently order this together (${c.frequency}× paired)`,
              price,
            };
          });
        upsells.push(...comboUpsells);
      } catch { /* ignore combo errors */ }
    }

    // 2. Margin-based upsells
    if (upsells.length < 3) {
      try {
        const upsellCands = await getUpsellCandidates();
        const marginUpsells = upsellCands
          .filter(u => !matchedIds.includes(u.item_id))
          .sort((a, b) => b.contribution_margin - a.contribution_margin)
          .slice(0, 2)
          .map(u => ({
            name: u.item_name,
            reason: `High-margin item (₹${u.contribution_margin} margin)`,
            price: u.total_sold > 0 ? Math.round(u.total_revenue / u.total_sold) : 200,
          }));
        upsells.push(...marginUpsells);
      } catch { /* ignore */ }
    }

    return NextResponse.json({
      transcript,
      order: {
        items: matchedItems,
        ambiguous: parsed.ambiguous || [],
        upsells: upsells.slice(0, 3),
        language: parsed.language || 'en',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
