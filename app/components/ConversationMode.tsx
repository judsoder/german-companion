'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface Message {
  id: string;
  role: 'user' | 'companion';
  text: string;
  timestamp: string;
  streaming?: boolean;
}

type ConversationMode = 'normal' | 'simple' | 'correct' | 'german-only';

function getTimestamp(): string {
  const now = new Date();
  return `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
}

const GREETING: Message = {
  id: 'greeting',
  role: 'companion',
  text: 'Hallo. Worüber möchtest du heute sprechen? Wir können über ein Buch reden, etwas aus deinem Tag, oder einfach ein Thema, das dich interessiert.',
  timestamp: getTimestamp(),
};

export default function ConversationMode() {
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [mode, setMode] = useState<ConversationMode>('normal');
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;

    setError(null);
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: text.trim(),
      timestamp: getTimestamp(),
    };

    const companionId = `companion-${Date.now()}`;
    const companionMsg: Message = {
      id: companionId,
      role: 'companion',
      text: '',
      timestamp: getTimestamp(),
      streaming: true,
    };

    setMessages(prev => [...prev, userMsg, companionMsg]);
    setInputText('');
    setIsStreaming(true);

    // Build API messages (exclude the empty streaming placeholder)
    const apiMessages = [...messages, userMsg]
      .filter(m => m.id !== 'greeting' || m.role === 'companion')
      .map(m => ({
        role: m.role === 'user' ? 'user' as const : 'model' as const,
        text: m.text,
      }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          mode: mode === 'normal' ? undefined : mode,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.text) {
                accumulated += parsed.text;
                setMessages(prev =>
                  prev.map(m =>
                    m.id === companionId
                      ? { ...m, text: accumulated }
                      : m
                  )
                );
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue; // partial JSON
              throw e;
            }
          }
        }
      }

      // Mark streaming complete
      setMessages(prev =>
        prev.map(m =>
          m.id === companionId
            ? { ...m, streaming: false, timestamp: getTimestamp() }
            : m
        )
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      // Remove the empty companion message on error
      setMessages(prev => prev.filter(m => m.id !== companionId));
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  }, [messages, isStreaming, mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputText);
  };

  const handleQuickAction = (action: string) => {
    if (action === 'german-only') {
      setMode('german-only');
      sendMessage('Auf Deutsch bleiben.');
    } else if (action === 'simple') {
      setMode('simple');
      sendMessage('Einfacher bitte.');
    } else if (action === 'correct') {
      setMode('correct');
      sendMessage('Korrigiere mich bitte.');
    } else if (action === 'anders') {
      sendMessage('Anders sagen.');
    } else if (action === 'topic') {
      sendMessage('Lass uns das Thema wechseln.');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Conversation area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-2xl mx-auto space-y-5">
          {/* Session header */}
          <div className="text-center mb-8">
            <p className="text-ink-faint text-xs font-mono">
              {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }).toLowerCase()}
            </p>
            <p className="text-ink-muted text-sm mt-1 font-serif italic">Gespräch mit Begleiter</p>
          </div>

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`animate-fade-in ${msg.role === 'user' ? 'flex justify-end' : ''}`}
            >
              <div
                className={`
                  max-w-lg rounded-2xl px-5 py-3.5
                  ${msg.role === 'user'
                    ? 'bg-surface-active text-ink ml-12'
                    : 'bg-surface-raised border border-border-light mr-12'
                  }
                `}
              >
                {/* Message text */}
                <p className="text-[0.95rem] leading-relaxed whitespace-pre-wrap">
                  {msg.text}
                  {msg.streaming && !msg.text && (
                    <span className="text-ink-faint animate-pulse-soft">…</span>
                  )}
                  {msg.streaming && msg.text && (
                    <span className="text-ink-faint animate-pulse-soft">▍</span>
                  )}
                </p>

                {/* Timestamp */}
                <div className={`mt-2 flex ${msg.role === 'user' ? 'justify-end' : 'items-center gap-3'}`}>
                  {msg.role === 'companion' && !msg.streaming && (
                    <>
                      <button
                        onClick={() => handleQuickAction('anders')}
                        className="text-xs font-mono text-ink-faint hover:text-accent transition-colors"
                      >
                        anders sagen
                      </button>
                    </>
                  )}
                  <span className={`text-xs font-mono text-ink-faint ${msg.role === 'companion' ? 'ml-auto' : ''}`}>
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Error */}
          {error && (
            <div className="text-center animate-fade-in">
              <p className="text-xs font-mono text-red-400/80 bg-red-400/10 inline-block px-4 py-2 rounded-lg">
                {error.includes('GEMINI_API_KEY')
                  ? 'API-Schlüssel fehlt. Bitte GEMINI_API_KEY konfigurieren.'
                  : `Fehler: ${error}`
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-border px-6 py-4">
        <div className="max-w-2xl mx-auto">
          {/* Quick actions */}
          <div className="flex gap-2 mb-3 flex-wrap">
            <QuickAction
              label="Auf Deutsch bleiben"
              active={mode === 'german-only'}
              onClick={() => handleQuickAction('german-only')}
            />
            <QuickAction
              label="Korrigiere mich"
              active={mode === 'correct'}
              onClick={() => handleQuickAction('correct')}
            />
            <QuickAction
              label="Einfacher bitte"
              active={mode === 'simple'}
              onClick={() => handleQuickAction('simple')}
            />
            <QuickAction
              label="Thema wechseln"
              onClick={() => handleQuickAction('topic')}
            />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Auf Deutsch schreiben..."
                disabled={isStreaming}
                className="w-full bg-surface-raised border border-border-light rounded-xl px-4 py-3 text-sm
                  placeholder:text-ink-faint focus:outline-none focus:border-accent/40 transition-colors
                  disabled:opacity-50"
              />
            </div>
            <button
              type="submit"
              disabled={!inputText.trim() || isStreaming}
              className="text-ink-faint hover:text-ink text-sm font-mono transition-colors
                disabled:opacity-30 disabled:cursor-not-allowed px-2"
            >
              ↵
            </button>
          </form>

          {/* Status line */}
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs font-mono text-ink-faint">
              {isStreaming ? (
                <span className="text-german">● begleiter denkt…</span>
              ) : (
                'schreib auf deutsch — oder auf englisch, ich antworte trotzdem auf deutsch'
              )}
            </p>
            <p className="text-xs font-mono text-ink-faint">
              {messages.filter(m => m.role === 'user').length} nachrichten
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ label, active, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1 rounded-full text-xs font-mono transition-all
        ${active
          ? 'bg-german/15 text-german border border-german/30'
          : 'bg-surface-raised text-ink-faint border border-border-light hover:text-ink hover:border-border'
        }
      `}
    >
      {label}
    </button>
  );
}
