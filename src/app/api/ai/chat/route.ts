import { NextResponse } from 'next/server';
import { chatCompletion, SYSTEM_PROMPT_BUSINESS_AI } from '@/lib/llm';
import { buildAIContext } from '@/lib/ai-context';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 });

    const context = await buildAIContext(message);

    const result = await chatCompletion([
      { role: 'system', content: `${SYSTEM_PROMPT_BUSINESS_AI}\n\n--- RESTAURANT DATA ---\n${context}` },
      { role: 'user', content: message },
    ], { temperature: 0.7, maxTokens: 1500 });

    return NextResponse.json({ content: result.content, model: result.model });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ content: `Error: ${msg}`, error: msg }, { status: 200 });
  }
}
