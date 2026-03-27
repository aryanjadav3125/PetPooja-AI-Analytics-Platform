'use client';
import { useState, useRef } from 'react';
import { Mic, MicOff, CheckCircle, ShoppingCart, AlertCircle, Sparkles, FileText, X, Plus, Minus } from 'lucide-react';
import { PageHeader, Button, Badge } from '@/components/ui/shared';

interface OrderItem { item_id: string; name: string; qty: number; price: number; category?: string; modifiers?: string[] }
interface ParsedOrder { items: OrderItem[]; ambiguous: { name: string; options: string[] }[]; upsells: { name: string; reason: string; price: number }[]; language: string }
interface LiveOrder { id: number; timestamp: string; items: OrderItem[]; total: number; status: 'pending' | 'confirmed' | 'preparing' }

const fmt = (n: number) => `₹${n.toFixed(0)}`;

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function VoicePage() {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [parsed, setParsed] = useState<ParsedOrder | null>(null);
  const [processing, setProcessing] = useState(false);
  const [liveOrders, setLiveOrders] = useState<LiveOrder[]>([]);
  const [showInvoice, setShowInvoice] = useState<LiveOrder | null>(null);
  const recognitionRef = useRef<any>(null);

  // Use Web Speech API for browser STT
  const startRecording = () => {
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) { alert('Speech Recognition not supported. Use Chrome or Edge.'); return; }
    const recognition = new SR();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      setTextInput(text);
      processText(text);
    };
    recognition.onerror = () => { setRecording(false); };
    recognition.onend = () => { setRecording(false); };
    recognition.start();
    recognitionRef.current = recognition;
    setRecording(true);
  };

  const stopRecording = () => { recognitionRef.current?.stop(); setRecording(false); };

  const processText = async (text?: string) => {
    const input = text || textInput;
    if (!input.trim()) return;
    setProcessing(true);
    setTranscript(input);
    try {
      const res = await fetch('/api/voice/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input }),
      });
      const data = await res.json();
      setParsed(data.order || null);
    } catch { setParsed(null); }
    setProcessing(false);
  };

  const updateQty = (idx: number, delta: number) => {
    if (!parsed) return;
    const items = [...parsed.items];
    items[idx] = { ...items[idx], qty: Math.max(1, items[idx].qty + delta) };
    setParsed({ ...parsed, items });
  };

  const removeItem = (idx: number) => {
    if (!parsed) return;
    setParsed({ ...parsed, items: parsed.items.filter((_, i) => i !== idx) });
  };

  const addUpsell = (upsell: { name: string; price: number }) => {
    if (!parsed) return;
    setParsed({
      ...parsed,
      items: [...parsed.items, { item_id: '', name: upsell.name, qty: 1, price: upsell.price }],
      upsells: parsed.upsells.filter(u => u.name !== upsell.name),
    });
  };

  const confirmOrder = async () => {
    if (!parsed || parsed.items.length === 0) return;
    setProcessing(true);
    const total = parsed.items.reduce((s, i) => s + i.price * i.qty, 0);

    // Add to live orders
    const newOrder: LiveOrder = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      items: parsed.items,
      total,
      status: 'confirmed',
    };
    setLiveOrders(prev => [newOrder, ...prev]);

    // Create in database
    try {
      await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: parsed.items,
          totalAmount: total,
          source: 'voice',
        }),
      });
      newOrder.status = 'preparing';
      setLiveOrders(prev => prev.map(o => o.id === newOrder.id ? { ...o, status: 'preparing' } : o));
    } catch { /* keep as confirmed */ }

    setParsed(null);
    setTranscript('');
    setTextInput('');
    setProcessing(false);
  };

  const total = parsed?.items.reduce((s, i) => s + i.price * i.qty, 0) ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Voice Ordering Copilot" subtitle="Take orders by voice or text — Gemini-powered intent extraction with smart upsells" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Input */}
        <div className="space-y-4">
          <div className="glass-card p-5">
            <div className="flex flex-col items-center gap-4 py-4">
              <button onClick={recording ? stopRecording : startRecording}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
                  recording ? 'bg-loss animate-pulse-glow shadow-2xl shadow-loss/40' : 'bg-gradient-to-br from-brand-500 to-purple-600 hover:shadow-2xl hover:shadow-brand-500/40 hover:scale-110'
                }`}>
                {recording ? <MicOff size={32} className="text-white" /> : <Mic size={32} className="text-white" />}
              </button>
              <p className="text-sm text-[var(--color-text-muted)]">
                {recording ? '🔴 Listening... Speak your order' : 'Tap to start voice order'}
              </p>
            </div>

            <div className="border-t border-[var(--color-border)] pt-4">
              <p className="text-xs text-[var(--color-text-dim)] mb-2">Or type (supports Hindi/Hinglish):</p>
              <div className="flex gap-2">
                <input type="text" value={textInput} onChange={e => setTextInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && processText()}
                  placeholder="e.g. Ek butter chicken aur do naan"
                  className="flex-1 px-3 py-2 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm focus:outline-none focus:border-brand-500" />
                <Button variant="primary" onClick={() => processText()} disabled={processing}>Go</Button>
              </div>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {['Ek burger aur coke', 'Do biryani, ek raita', 'Pizza with extra cheese'].map(ex => (
                  <button key={ex} onClick={() => { setTextInput(ex); processText(ex); }}
                    className="text-[10px] px-2 py-1 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-dim)] hover:border-brand-500 transition-colors">
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {transcript && (
            <div className="glass-card p-4 animate-fade-in">
              <h3 className="text-xs font-medium text-[var(--color-text-dim)] mb-1">📝 Transcript</h3>
              <p className="text-sm font-medium">{transcript}</p>
            </div>
          )}
        </div>

        {/* Center: Order Builder */}
        <div className="space-y-4">
          {processing && (
            <div className="glass-card p-8 flex flex-col items-center gap-3 animate-fade-in">
              <Sparkles size={24} className="text-brand-400 animate-spin" />
              <p className="text-sm text-[var(--color-text-muted)]">Processing with Gemini AI...</p>
            </div>
          )}

          {parsed && parsed.items.length > 0 && (
            <div className="glass-card p-5 animate-fade-in space-y-3">
              <div className="flex items-center gap-2">
                <ShoppingCart size={18} className="text-brand-400" />
                <h3 className="text-sm font-semibold">Order Summary</h3>
              </div>

              {parsed.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--color-border)]/30">
                  <div className="flex-1">
                    <span className="font-medium text-sm">{item.name}</span>
                    {item.category && <span className="text-xs text-[var(--color-text-dim)] ml-2">({item.category})</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(i, -1)} className="w-6 h-6 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center hover:bg-[var(--color-surface-3)]"><Minus size={12} /></button>
                    <span className="text-sm font-mono w-6 text-center">{item.qty}</span>
                    <button onClick={() => updateQty(i, 1)} className="w-6 h-6 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center hover:bg-[var(--color-surface-3)]"><Plus size={12} /></button>
                    <span className="font-medium text-sm w-16 text-right">{fmt(item.price * item.qty)}</span>
                    <button onClick={() => removeItem(i)} className="text-[var(--color-text-dim)] hover:text-loss"><X size={14} /></button>
                  </div>
                </div>
              ))}

              {parsed.ambiguous.length > 0 && (
                <div className="bg-warning/10 border border-warning/20 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1"><AlertCircle size={14} className="text-warning" /><span className="text-xs font-medium text-warning">Clarification needed</span></div>
                  {parsed.ambiguous.map((a, i) => (
                    <p key={i} className="text-xs text-[var(--color-text-muted)]">&quot;{a.name}&quot; → did you mean: {a.options.join(' or ')}?</p>
                  ))}
                </div>
              )}

              {parsed.upsells && parsed.upsells.length > 0 && (
                <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-3">
                  <p className="text-xs font-medium text-brand-400 mb-2">💡 Smart Suggestions</p>
                  {parsed.upsells.map((u, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1">
                      <div>
                        <span className="font-medium">{u.name}</span>
                        {u.price > 0 && <span className="text-xs text-[var(--color-text-dim)] ml-1">(₹{u.price})</span>}
                        <p className="text-[10px] text-[var(--color-text-dim)]">{u.reason}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => addUpsell(u)}>+ Add</Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
                <span className="text-lg font-bold">Total: {fmt(total)}</span>
                <Button variant="primary" onClick={confirmOrder} disabled={processing}>
                  <CheckCircle size={16} /> Confirm & Create KOT
                </Button>
              </div>
            </div>
          )}

          {!parsed && !processing && (
            <div className="glass-card p-8 flex flex-col items-center gap-3 text-center opacity-50">
              <ShoppingCart size={32} className="text-[var(--color-text-dim)]" />
              <p className="text-sm text-[var(--color-text-muted)]">Order items will appear here after voice/text input</p>
            </div>
          )}
        </div>

        {/* Right: Live Orders & Invoice */}
        <div className="space-y-4">
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={18} className="text-brand-400" />
              <h3 className="text-sm font-semibold">Live Orders</h3>
              <Badge variant="success">{liveOrders.length}</Badge>
            </div>

            {liveOrders.length === 0 ? (
              <p className="text-xs text-[var(--color-text-dim)] text-center py-4">No orders yet. Take a voice order to see it here.</p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {liveOrders.map(order => (
                  <div key={order.id} onClick={() => setShowInvoice(showInvoice?.id === order.id ? null : order)}
                    className={`rounded-xl bg-[var(--color-surface-2)] p-3 cursor-pointer transition-all hover:bg-[var(--color-surface-3)] ${showInvoice?.id === order.id ? 'ring-1 ring-brand-500' : ''}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-[var(--color-text-dim)]">#{order.id.toString().slice(-4)}</span>
                      <Badge variant={order.status === 'preparing' ? 'success' : order.status === 'confirmed' ? 'warning' : 'default'}>{order.status}</Badge>
                    </div>
                    <p className="text-sm font-medium">{order.items.map(i => `${i.qty}× ${i.name}`).join(', ')}</p>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-[var(--color-text-dim)]">{order.timestamp}</span>
                      <span className="text-sm font-bold text-profit">₹{order.total}</span>
                    </div>

                    {/* Invoice view */}
                    {showInvoice?.id === order.id && (
                      <div className="mt-3 pt-3 border-t border-[var(--color-border)] animate-fade-in">
                        <div className="text-center mb-2">
                          <p className="text-xs font-bold">🧾 ORDER INVOICE</p>
                          <p className="text-[10px] text-[var(--color-text-dim)]">#{order.id} • {order.timestamp}</p>
                        </div>
                        <table className="w-full text-xs">
                          <thead><tr className="border-b border-[var(--color-border)]/50">
                            <th className="text-left py-1">Item</th><th className="text-center py-1">Qty</th><th className="text-right py-1">Price</th><th className="text-right py-1">Total</th>
                          </tr></thead>
                          <tbody>
                            {order.items.map((item, i) => (
                              <tr key={i} className="border-b border-[var(--color-border)]/30">
                                <td className="py-1">{item.name}</td>
                                <td className="py-1 text-center">{item.qty}</td>
                                <td className="py-1 text-right">₹{item.price}</td>
                                <td className="py-1 text-right font-medium">₹{item.price * item.qty}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="flex justify-between mt-2 pt-1 border-t border-[var(--color-border)]">
                          <span className="font-bold text-xs">TOTAL</span>
                          <span className="font-bold text-sm text-profit">₹{order.total}</span>
                        </div>
                        <p className="text-[10px] text-[var(--color-text-dim)] text-center mt-2">Channel: Voice • Status: KOT Sent</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
