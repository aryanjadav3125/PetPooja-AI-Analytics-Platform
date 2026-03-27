import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { merchantId, type, details, expectedProfit } = await req.json();
    if (!type) return NextResponse.json({ error: 'type required' }, { status: 400 });

    const sb = getServiceClient();
    const { data, error } = await sb.from('recommendations').insert({
      merchant_id: merchantId || 'M005',
      type,
      details: details || {},
      expected_profit: expectedProfit ?? 0,
      status: 'pending',
    }).select().single();
    if (error) throw error;

    return NextResponse.json({ success: true, recommendation: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
