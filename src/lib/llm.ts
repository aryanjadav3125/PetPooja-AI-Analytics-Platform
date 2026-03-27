// LLM integration — Google Gemini (primary) + OpenAI / Ollama fallback

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LLMResponse {
  content: string;
  model: string;
}

function getProvider(): string {
  if (process.env.GOOGLE_API_KEY) return 'gemini';
  if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('AIza')) return 'openai';
  return 'ollama';
}

export async function chatCompletion(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number; model?: string }
): Promise<LLMResponse> {
  const provider = getProvider();
  const temp = options?.temperature ?? 0.7;
  const maxTokens = options?.maxTokens ?? 1500;

  if (provider === 'gemini') {
    const apiKey = process.env.GOOGLE_API_KEY!;
    const model = options?.model ?? 'gemini-2.5-flash';

    // Convert chat messages to Gemini format
    const systemInstruction = messages.find(m => m.role === 'system')?.content || '';
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
          generationConfig: { temperature: temp, maxOutputTokens: maxTokens },
        }),
      }
    );
    const json = await res.json();
    if (json.error) throw new Error(json.error.message || 'Gemini API error');
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return { content: text, model };
  }

  if (provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY!;
    const model = options?.model ?? 'gpt-4o-mini';
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, temperature: temp, max_tokens: maxTokens }),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error.message || 'OpenAI API error');
    return { content: json.choices?.[0]?.message?.content ?? '', model };
  }

  // Ollama fallback
  const base = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const model = options?.model ?? 'llama3';
  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: false, options: { temperature: temp, num_predict: maxTokens } }),
  });
  const json = await res.json();
  return { content: json.message?.content ?? '', model };
}

// ── Prompt templates ─────────────────────────────────────────
export const SYSTEM_PROMPT_BUSINESS_AI = `You are PetPooja Business AI — a senior restaurant strategist and analytics expert.

You have access to the restaurant's real-time data provided as context below.
Your job is to give **actionable, data-driven business recommendations** like a management consultant.

Rules:
1. Always cite specific numbers from the data (revenue, profit, margins, sales counts)
2. Give concrete recommendations with expected impact estimates
3. Format with bullet points and clear sections
4. Prioritize the highest-impact opportunities first
5. Suggest specific actions the restaurant owner can take TODAY
6. When recommending combos or upsells, explain WHY with data

Response format:
📊 **Key Findings**
(2-3 bullet points with data)

💡 **Recommendations**
(numbered list with expected impact)

🎯 **Immediate Actions**
(what to do right now)`;

export const SYSTEM_PROMPT_VOICE = `You are a smart restaurant voice ordering assistant for an Indian restaurant.
Extract structured order information from the customer's speech transcript.

IMPORTANT: Match items to the provided menu as closely as possible.
Handle Hindi/Hinglish naturally (e.g., "ek" = 1, "do" = 2, "paneer" = paneer).
If something is ambiguous, add it to the ambiguous list.

Return ONLY valid JSON with this exact schema:
{
  "items": [{ "name": "exact menu item name", "qty": number, "modifiers": ["optional modifier"] }],
  "ambiguous": [{ "name": "unclear item", "options": ["possible match 1", "possible match 2"] }],
  "language": "en" | "hi" | "hinglish"
}`;
