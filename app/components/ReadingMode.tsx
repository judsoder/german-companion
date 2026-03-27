'use client';

import { useState } from 'react';

interface TextSegment {
  id: string;
  german: string;
  type: 'paragraph' | 'quote';
}

interface WordNote {
  word: string;
  meaning: string;
  context: string;
}

const HESSE_PASSAGE: TextSegment[] = [
  {
    id: 'p1',
    german: 'Im Schatten des Hauses, in der Sonne des Flußufers, im Schatten des Feigenbaumes, in der Sonne des Gartens wuchs der Knabe auf.',
    type: 'paragraph',
  },
  {
    id: 'p2',
    german: 'Der schöne Sohn des Brahmanen, der junge Falke, wuchs auf mit seinem Freunde Govinda. Sonne bräunte seine lichten Schultern am Flußufer, beim Bade, bei den heiligen Waschungen, bei den heiligen Opfern.',
    type: 'paragraph',
  },
  {
    id: 'p3',
    german: 'Schatten floß in seine schwarzen Augen im Mangohain, bei den Knabenspielen, beim Gesang der Mutter, bei den heiligen Opfern, bei den Lehren seines Vaters, des Gelehrten, beim Gespräch der Weisen.',
    type: 'paragraph',
  },
  {
    id: 'p4',
    german: 'Lange schon nahm Siddhartha am Gespräch der Weisen teil, übte sich mit Govinda im Redekampf, übte sich mit Govinda in der Kunst der Betrachtung, im Dienst der Versenkung.',
    type: 'paragraph',
  },
];

const WORD_NOTES: WordNote[] = [
  { word: 'Flußufer', meaning: 'riverbank', context: 'Fluß (river) + Ufer (shore/bank)' },
  { word: 'Feigenbaum', meaning: 'fig tree', context: 'Feige (fig) + Baum (tree)' },
  { word: 'bräunte', meaning: 'browned/tanned', context: 'past tense of bräunen — the sun tanning his skin' },
  { word: 'Mangohain', meaning: 'mango grove', context: 'Hain = grove, a poetic word for a small forest' },
  { word: 'Redekampf', meaning: 'debate, rhetorical sparring', context: 'Rede (speech) + Kampf (fight/struggle)' },
  { word: 'Versenkung', meaning: 'deep meditation, immersion', context: 'from versenken — to sink into, to immerse' },
];

const JOURNAL_PASSAGE: TextSegment[] = [
  {
    id: 'j1',
    german: 'Heute habe ich darüber nachgedacht, was es bedeutet, aufmerksam zu sein. Nicht die erzwungene Aufmerksamkeit der Arbeit, sondern die weiche Art — wenn man einen Moment lang wirklich sieht, was vor einem liegt.',
    type: 'paragraph',
  },
  {
    id: 'j2',
    german: 'Lev hat gestern etwas gesagt, das mich überrascht hat. Er hat gesagt: „Papa, du denkst zu viel." Und dann hat er gelacht und meine Hand genommen. In diesem Moment war ich wirklich da.',
    type: 'paragraph',
  },
  {
    id: 'j3',
    german: 'Das ist vielleicht die eigentliche Übung: nicht mehr suchen, sondern da sein. Bauen, nicht suchen.',
    type: 'quote',
  },
];

type Source = 'hesse' | 'journal';

export default function ReadingMode() {
  const [source, setSource] = useState<Source>('hesse');
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);

  const passages = source === 'hesse' ? HESSE_PASSAGE : JOURNAL_PASSAGE;
  const matchedNote = hoveredWord
    ? WORD_NOTES.find(n => hoveredWord.includes(n.word) || n.word.includes(hoveredWord))
    : null;

  return (
    <div className="h-full flex">
      {/* Main reading area */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-xl mx-auto">
          {/* Source selector */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => { setSource('hesse'); setSelectedSegment(null); }}
              className={`text-sm font-serif transition-colors ${source === 'hesse' ? 'text-accent' : 'text-ink-faint hover:text-ink'}`}
            >
              Siddhartha
              <span className="text-xs font-mono text-ink-faint ml-1">Hesse</span>
            </button>
            <span className="text-border">·</span>
            <button
              onClick={() => { setSource('journal'); setSelectedSegment(null); }}
              className={`text-sm font-serif transition-colors ${source === 'journal' ? 'text-accent' : 'text-ink-faint hover:text-ink'}`}
            >
              Tagebuch
              <span className="text-xs font-mono text-ink-faint ml-1">journal</span>
            </button>
          </div>

          {/* Title */}
          {source === 'hesse' ? (
            <div className="mb-10">
              <h2 className="font-serif text-3xl font-medium text-ink tracking-wide">Siddhartha</h2>
              <p className="text-ink-muted text-sm mt-1 font-serif italic">Hermann Hesse, 1922 — Erster Teil</p>
            </div>
          ) : (
            <div className="mb-10">
              <h2 className="font-serif text-3xl font-medium text-ink tracking-wide">Tagebuch</h2>
              <p className="text-ink-muted text-sm mt-1 font-serif italic">Übersetzt aus deinen Einträgen — 27. März</p>
            </div>
          )}

          {/* Text */}
          <div className="space-y-6">
            {passages.map((seg) => (
              <div
                key={seg.id}
                onClick={() => setSelectedSegment(selectedSegment === seg.id ? null : seg.id)}
                className={`
                  cursor-pointer transition-all duration-200 rounded-lg px-4 py-3 -mx-4
                  ${selectedSegment === seg.id
                    ? 'bg-surface-raised border border-border-light'
                    : 'hover:bg-surface-raised/50'
                  }
                  ${seg.type === 'quote' ? 'border-l-2 border-l-accent/40 pl-6' : ''}
                `}
              >
                <p
                  className={`
                    font-serif leading-[1.85] tracking-wide
                    ${seg.type === 'quote' ? 'text-lg italic text-accent/90' : 'text-[1.05rem] text-ink/90'}
                  `}
                  onMouseOver={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.tagName === 'SPAN') {
                      setHoveredWord(target.textContent || null);
                    }
                  }}
                  onMouseOut={() => setHoveredWord(null)}
                >
                  {seg.german.split(' ').map((word, i) => (
                    <span
                      key={i}
                      className={`
                        hover:text-german hover:underline hover:underline-offset-4
                        hover:decoration-german/30 cursor-help transition-colors
                        ${WORD_NOTES.some(n => word.replace(/[.,;:!?]/g, '').includes(n.word) || n.word.includes(word.replace(/[.,;:!?]/g, '')))
                          ? 'text-german/80 underline underline-offset-4 decoration-german/20 decoration-dotted'
                          : ''
                        }
                      `}
                    >
                      {word}{' '}
                    </span>
                  ))}
                </p>

                {/* Segment actions */}
                {selectedSegment === seg.id && (
                  <div className="mt-4 pt-3 border-t border-border-light animate-fade-in flex gap-3">
                    <SegmentAction label="übersetzen" icon="🔄" onClick={() => setShowTranslation(!showTranslation)} />
                    <SegmentAction label="vorlesen" icon="🔊" />
                    <SegmentAction label="erklären" icon="💬" />
                    <SegmentAction label="wörter merken" icon="📌" />
                  </div>
                )}

                {/* Translation */}
                {selectedSegment === seg.id && showTranslation && (
                  <div className="mt-3 animate-fade-in">
                    <p className="text-sm text-english italic leading-relaxed">
                      {seg.id === 'p1' && 'In the shadow of the house, in the sunshine of the riverbank, in the shadow of the fig tree, in the sunshine of the garden, the boy grew up.'}
                      {seg.id === 'p2' && 'The handsome son of the Brahmin, the young falcon, grew up with his friend Govinda. Sun browned his fair shoulders by the riverbank, during bathing, during the sacred washings, during the sacred offerings.'}
                      {seg.id === 'p3' && 'Shadow flowed into his dark eyes in the mango grove, during boys\' games, during his mother\'s singing, during the sacred offerings, during the teachings of his father, the scholar, during the conversations of the wise.'}
                      {seg.id === 'p4' && 'For a long time already, Siddhartha had taken part in the conversations of the wise, had practiced with Govinda the art of debate, had practiced the art of contemplation, the service of deep meditation.'}
                      {seg.id === 'j1' && 'Today I thought about what it means to pay attention. Not the forced attention of work, but the soft kind — when for a moment you truly see what lies before you.'}
                      {seg.id === 'j2' && 'Lev said something yesterday that surprised me. He said: "Papa, you think too much." And then he laughed and took my hand. In that moment, I was truly there.'}
                      {seg.id === 'j3' && 'That is perhaps the real practice: not seeking anymore, but being there. Building, not seeking.'}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right sidebar — word panel */}
      <aside className="w-72 border-l border-border bg-surface-raised overflow-y-auto">
        <div className="p-5">
          <h3 className="text-xs font-mono text-ink-faint uppercase tracking-wider mb-4">
            {matchedNote ? 'Wortbedeutung' : 'Schlüsselwörter'}
          </h3>

          {matchedNote ? (
            <div className="animate-fade-in">
              <p className="font-serif text-xl text-german mb-1">{matchedNote.word}</p>
              <p className="text-sm text-english italic mb-3">{matchedNote.meaning}</p>
              <p className="text-xs text-ink-muted leading-relaxed">{matchedNote.context}</p>
              <button className="mt-4 text-xs font-mono text-accent hover:text-accent-muted transition-colors">
                + merken
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {WORD_NOTES.map((note) => (
                <div key={note.word} className="group cursor-pointer">
                  <div className="flex items-baseline justify-between">
                    <span className="font-serif text-german group-hover:text-german/80 transition-colors">
                      {note.word}
                    </span>
                    <span className="text-xs text-ink-faint font-mono">{note.meaning}</span>
                  </div>
                  <p className="text-xs text-ink-faint mt-0.5 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity">
                    {note.context}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Reading stats */}
          <div className="mt-8 pt-4 border-t border-border-light">
            <h3 className="text-xs font-mono text-ink-faint uppercase tracking-wider mb-3">Lesefortschritt</h3>
            <div className="space-y-2 text-xs font-mono text-ink-muted">
              <div className="flex justify-between">
                <span>gelesen</span>
                <span className="text-ink">4 absätze</span>
              </div>
              <div className="flex justify-between">
                <span>neue wörter</span>
                <span className="text-german">6 gemerkt</span>
              </div>
              <div className="flex justify-between">
                <span>lesezeit</span>
                <span className="text-ink">12 min</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function SegmentAction({ label, icon, onClick }: { label: string; icon: string; onClick?: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-active
        text-xs font-mono text-ink-muted hover:text-ink transition-colors"
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
