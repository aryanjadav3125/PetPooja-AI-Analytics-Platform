import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { items, totalAmount, source } = await req.json();
    if (!items?.length) return NextResponse.json({ error: 'items required' }, { status: 400 });

    const sb = getServiceClient();
    const total = totalAmount ?? items.reduce((s: number, i: { price: number; qty: number }) => s + i.price * i.qty, 0);

    const { data: order, error: orderErr } = await sb.from('Orders').insert({
      merchant_id: 'M005',
      order_time: new Date().toISOString(),
      order_channel: source || 'voice',
      total_amount: total,
    }).select().single();
    if (orderErr) throw orderErr;

    const orderItems = items.map((i: { item_id: string; qty: number; price: number }) => ({
      order_id: order.order_id,
      item_id: i.item_id,
      quantity: i.qty,
      selling_price: i.price,
      profit: 0,
    }));
    const { error: itemErr } = await sb.from('Order_Item').insert(orderItems);
    if (itemErr) throw itemErr;

    return NextResponse.json({ success: true, order_id: order.order_id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
