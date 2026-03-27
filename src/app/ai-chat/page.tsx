'use client';
import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Lightbulb } from 'lucide-react';
import { PageHeader, Button } from '@/components/ui/shared';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '## 🤖 PetPooja Business AI\n\nI\'m your restaurant strategy consultant with access to your **real-time analytics data**.\n\nI can help with:\n• **Menu optimization** — which items to promote, reprice, or remove\n• **Combo strategy** — profitable bundles based on actual ordering patterns\n• **Demand forecasting** — peak hours, seasonal trends\n• **Revenue growth** — upsell targets, pricing recommendations\n• **Inventory** — stock risks and reorder timing\n\nTry asking me something!' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.content || data.error || 'Sorry, I could not generate a response.',
      }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error connecting to AI service. Ensure OPENAI_API_KEY is set in `.env.local`.' }]);
    }
    setLoading(false);
  };

  const quickPrompts = [
    'What items should I promote this week?',
    'Which combos increase AOV the most?',
    'Show me inventory risks',
    'How can I increase profit margins?',
    'What menu items should I remove?',
    'Suggest pricing changes',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-48px)]">
      <PageHeader title="PetPooja Business AI" subtitle="AI strategic advisor powered by OpenAI — uses your real restaurant data" />

      {/* Chat */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shrink-0 mt-1">
                <Bot size={16} className="text-white" />
              </div>
            )}
            <div className={`max-w-[75%] rounded-2xl px-5 py-3 text-sm leading-relaxed ${
              msg.role === 'user' ? 'bg-brand-500 text-white rounded-tr-sm' : 'glass-card rounded-tl-sm'
            }`}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-[var(--color-surface-3)] flex items-center justify-center shrink-0 mt-1">
                <User size={16} className="text-[var(--color-text-muted)]" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shrink-0">
              <Sparkles size={16} className="text-white animate-spin" />
            </div>
            <div className="glass-card rounded-2xl rounded-tl-sm px-5 py-3">
              <div className="flex gap-1.5 items-center">
                <span className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <span className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <span className="text-xs text-[var(--color-text-dim)] ml-2">Analyzing your data with OpenAI...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[var(--color-border)] pt-4 pb-2">
        <div className="flex gap-3">
          <input type="text" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Ask about your business — I have full access to your analytics..."
            className="flex-1 px-4 py-3 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm focus:outline-none focus:border-brand-500 transition-colors" />
          <Button variant="primary" onClick={sendMessage} disabled={loading || !input.trim()}>
            <Send size={16} />
          </Button>
        </div>
        <div className="flex gap-2 mt-2 flex-wrap">
          {quickPrompts.map(q => (
            <button key={q} onClick={() => { setInput(q); }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] hover:border-brand-500 hover:text-brand-400 transition-colors">
              <Lightbulb size={10} /> {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
