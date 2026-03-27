'use client';

import { useState } from 'react';
import ConversationMode from './components/ConversationMode';
import ReadingMode from './components/ReadingMode';
import PhrasesMode from './components/PhrasesMode';

type Mode = 'conversation' | 'reading' | 'phrases';

const MODE_LABELS: Record<Mode, { label: string; sublabel: string }> = {
  conversation: { label: 'Gespräch', sublabel: 'speak' },
  reading: { label: 'Lektüre', sublabel: 'read' },
  phrases: { label: 'Wörter', sublabel: 'saved' },
};

export default function Home() {
  const [mode, setMode] = useState<Mode>('conversation');

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-2xl font-medium tracking-wide text-accent">
            Begleiter
          </h1>
          <span className="text-ink-faint text-xs font-mono mt-1">companion</span>
        </div>

        {/* Mode switcher */}
        <nav className="flex gap-1 bg-surface-raised rounded-lg p-1">
          {(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`
                px-4 py-1.5 rounded-md text-sm transition-all duration-200
                ${mode === m
                  ? 'bg-surface-active text-ink font-medium'
                  : 'text-ink-muted hover:text-ink hover:bg-surface-hover'
                }
              `}
            >
              <span className="font-serif italic">{MODE_LABELS[m].label}</span>
              <span className="text-ink-faint text-xs ml-1.5 font-mono">{MODE_LABELS[m].sublabel}</span>
            </button>
          ))}
        </nav>

        {/* Status */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-german animate-pulse-soft" />
          <span className="text-xs font-mono text-ink-faint">bereit</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        {mode === 'conversation' && <ConversationMode />}
        {mode === 'reading' && <ReadingMode />}
        {mode === 'phrases' && <PhrasesMode />}
      </main>
    </div>
  );
}
