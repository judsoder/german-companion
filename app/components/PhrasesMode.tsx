'use client';

import { useState } from 'react';

interface SavedPhrase {
  id: string;
  german: string;
  english: string;
  context: string;
  source: string;
  savedAt: string;
  strength: 'new' | 'learning' | 'known';
}

const MOCK_PHRASES: SavedPhrase[] = [
  {
    id: '1',
    german: 'die Versenkung',
    english: 'deep meditation, immersion',
    context: '„im Dienst der Versenkung" — Siddhartha',
    source: 'Lektüre · Siddhartha',
    savedAt: 'heute',
    strength: 'new',
  },
  {
    id: '2',
    german: 'der Zusammenhang',
    english: 'connection, context (between ideas)',
    context: '„Das ist genau der Zusammenhang, den ich meine."',
    source: 'Gespräch · Hesse-Diskussion',
    savedAt: 'heute',
    strength: 'new',
  },
  {
    id: '3',
    german: 'inwiefern',
    english: 'in what way, to what extent',
    context: '„Anders — inwiefern?"',
    source: 'Gespräch · Hesse-Diskussion',
    savedAt: 'heute',
    strength: 'learning',
  },
  {
    id: '4',
    german: 'der Redekampf',
    english: 'debate, rhetorical sparring',
    context: '„übte sich mit Govinda im Redekampf"',
    source: 'Lektüre · Siddhartha',
    savedAt: 'heute',
    strength: 'new',
  },
  {
    id: '5',
    german: 'sich verändern',
    english: 'to change (oneself)',
    context: '„Ich glaube, ich habe mich verändert."',
    source: 'Gespräch · eigener Satz',
    savedAt: 'gestern',
    strength: 'learning',
  },
  {
    id: '6',
    german: 'aufmerksam sein',
    english: 'to pay attention, to be attentive',
    context: '„was es bedeutet, aufmerksam zu sein"',
    source: 'Tagebuch · Übersetzung',
    savedAt: 'gestern',
    strength: 'known',
  },
  {
    id: '7',
    german: 'die Übung',
    english: 'the practice, the exercise',
    context: '„Das ist vielleicht die eigentliche Übung"',
    source: 'Tagebuch · Übersetzung',
    savedAt: 'gestern',
    strength: 'learning',
  },
  {
    id: '8',
    german: 'das Flußufer',
    english: 'the riverbank',
    context: '„in der Sonne des Flußufers"',
    source: 'Lektüre · Siddhartha',
    savedAt: 'vor 2 tagen',
    strength: 'known',
  },
  {
    id: '9',
    german: 'der Mangohain',
    english: 'the mango grove',
    context: '„im Mangohain, bei den Knabenspielen"',
    source: 'Lektüre · Siddhartha',
    savedAt: 'vor 2 tagen',
    strength: 'known',
  },
  {
    id: '10',
    german: 'eigentlich',
    english: 'actually, really, in fact',
    context: '„die eigentliche Übung"',
    source: 'Gespräch',
    savedAt: 'vor 3 tagen',
    strength: 'known',
  },
];

type Filter = 'all' | 'new' | 'learning' | 'known';

export default function PhrasesMode() {
  const [filter, setFilter] = useState<Filter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = filter === 'all' ? MOCK_PHRASES : MOCK_PHRASES.filter(p => p.strength === filter);

  const counts = {
    all: MOCK_PHRASES.length,
    new: MOCK_PHRASES.filter(p => p.strength === 'new').length,
    learning: MOCK_PHRASES.filter(p => p.strength === 'learning').length,
    known: MOCK_PHRASES.filter(p => p.strength === 'known').length,
  };

  return (
    <div className="h-full flex">
      {/* Main list */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h2 className="font-serif text-2xl text-ink">Gemerkte Wörter</h2>
            <p className="text-ink-muted text-sm mt-1">
              {MOCK_PHRASES.length} Wörter aus Gesprächen, Lektüre und Tagebuch
            </p>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-6">
            {(['all', 'new', 'learning', 'known'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-mono transition-all
                  ${filter === f
                    ? 'bg-surface-active text-ink'
                    : 'text-ink-faint hover:text-ink hover:bg-surface-raised'
                  }
                `}
              >
                {f === 'all' ? 'alle' : f === 'new' ? 'neu' : f === 'learning' ? 'lerne ich' : 'kann ich'}
                <span className="ml-1 text-ink-faint">{counts[f]}</span>
              </button>
            ))}
          </div>

          {/* Phrase list */}
          <div className="space-y-1">
            {filtered.map((phrase) => (
              <div
                key={phrase.id}
                onClick={() => setExpandedId(expandedId === phrase.id ? null : phrase.id)}
                className={`
                  cursor-pointer rounded-xl px-4 py-3 transition-all duration-200
                  ${expandedId === phrase.id
                    ? 'bg-surface-raised border border-border-light'
                    : 'hover:bg-surface-raised/60'
                  }
                `}
              >
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-3">
                    <StrengthDot strength={phrase.strength} />
                    <span className="font-serif text-lg text-german">{phrase.german}</span>
                  </div>
                  <span className="text-sm text-english italic">{phrase.english}</span>
                </div>

                {expandedId === phrase.id && (
                  <div className="mt-3 ml-6 animate-fade-in space-y-2">
                    <p className="text-sm text-ink-muted font-serif italic">
                      {phrase.context}
                    </p>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs font-mono text-ink-faint">{phrase.source} · {phrase.savedAt}</span>
                      <div className="flex gap-2">
                        <button className="text-xs font-mono text-ink-faint hover:text-accent transition-colors">
                          🔊 hören
                        </button>
                        <button className="text-xs font-mono text-ink-faint hover:text-accent transition-colors">
                          📝 beispiel
                        </button>
                        <button className="text-xs font-mono text-ink-faint hover:text-german transition-colors">
                          ↑ kann ich
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right sidebar — stats & review */}
      <aside className="w-72 border-l border-border bg-surface-raised overflow-y-auto">
        <div className="p-5">
          {/* Session summary */}
          <h3 className="text-xs font-mono text-ink-faint uppercase tracking-wider mb-4">Wortschatz</h3>
          <div className="space-y-3 mb-6">
            <StatRow label="diese woche" value="+14" accent />
            <StatRow label="gesamt" value="87 wörter" />
            <StatRow label="kann ich" value="34" />
            <StatRow label="lerne ich" value="29" />
            <StatRow label="neu" value="24" />
          </div>

          {/* Review prompt */}
          <div className="bg-surface-active rounded-xl p-4 mb-6">
            <p className="text-sm text-ink mb-2">
              <span className="font-serif italic text-accent">Wiederholung</span>
            </p>
            <p className="text-xs text-ink-muted mb-3">
              7 Wörter sind bereit für die Wiederholung. Am besten lernst du sie im Gespräch.
            </p>
            <button className="w-full py-2 rounded-lg bg-german/15 text-german text-xs font-mono
              hover:bg-german/25 transition-colors">
              Gespräch mit Wiederholung starten
            </button>
          </div>

          {/* Sources */}
          <h3 className="text-xs font-mono text-ink-faint uppercase tracking-wider mb-3">Quellen</h3>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between text-ink-muted">
              <span>Gespräche</span>
              <span className="text-ink">38</span>
            </div>
            <div className="flex justify-between text-ink-muted">
              <span>Siddhartha</span>
              <span className="text-ink">26</span>
            </div>
            <div className="flex justify-between text-ink-muted">
              <span>Tagebuch</span>
              <span className="text-ink">15</span>
            </div>
            <div className="flex justify-between text-ink-muted">
              <span>Andere</span>
              <span className="text-ink">8</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function StrengthDot({ strength }: { strength: 'new' | 'learning' | 'known' }) {
  const colors = {
    new: 'bg-accent',
    learning: 'bg-yellow-500/60',
    known: 'bg-german',
  };
  return <div className={`w-1.5 h-1.5 rounded-full ${colors[strength]} mt-2.5 flex-shrink-0`} />;
}

function StatRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-xs font-mono text-ink-faint">{label}</span>
      <span className={`text-sm font-mono ${accent ? 'text-german font-medium' : 'text-ink'}`}>{value}</span>
    </div>
  );
}
