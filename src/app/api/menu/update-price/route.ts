import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { itemId, newPrice } = await req.json();
    if (!itemId || newPrice === undefined) return NextResponse.json({ error: 'itemId and newPrice required' }, { status: 400 });

    const sb = getServiceClient();
    const { error } = await sb.from('Menu').update({ selling_price: newPrice }).eq('item_id', itemId);
    if (error) throw error;

    return NextResponse.json({ success: true, message: `Price updated to ₹${newPrice}` });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
