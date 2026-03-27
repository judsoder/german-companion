'use client';

import { useState } from 'react';

interface Message {
  id: string;
  role: 'user' | 'companion';
  german: string;
  english?: string;
  timestamp: string;
  annotation?: string;
}

const MOCK_CONVERSATION: Message[] = [
  {
    id: '1',
    role: 'companion',
    german: 'Guten Morgen. Wie geht es dir heute? Du hast gestern über Hesse geschrieben — möchtest du darüber sprechen?',
    english: 'Good morning. How are you today? You wrote about Hesse yesterday — would you like to talk about it?',
    timestamp: '8:14',
  },
  {
    id: '2',
    role: 'user',
    german: 'Ja, ich habe Siddhartha noch einmal gelesen. Es war... anders als beim ersten Mal.',
    timestamp: '8:14',
  },
  {
    id: '3',
    role: 'companion',
    german: 'Anders — inwiefern? Was hat sich verändert, das Buch oder du?',
    english: 'Different — in what way? What changed, the book or you?',
    timestamp: '8:15',
    annotation: 'inwiefern = in what respect/way (more precise than "wie")',
  },
  {
    id: '4',
    role: 'user',
    german: 'Ich glaube, ich habe mich verändert. Siddhartha sucht immer... er sucht immer etwas Neues.',
    timestamp: '8:15',
  },
  {
    id: '5',
    role: 'companion',
    german: 'Ja, genau. Und am Ende erkennt er, dass das Suchen selbst der Weg war. Das erinnert mich an etwas, das du in deinem Tagebuch geschrieben hast — „Bauen, nicht suchen."',
    english: 'Yes, exactly. And in the end he realizes that the searching itself was the path. That reminds me of something you wrote in your journal — "Building, not seeking."',
    timestamp: '8:16',
  },
  {
    id: '6',
    role: 'user',
    german: 'Stimmt. Das ist genau das... wie sagt man "connection"?',
    timestamp: '8:16',
  },
  {
    id: '7',
    role: 'companion',
    german: 'Die Verbindung. Oder in diesem Zusammenhang vielleicht: der Zusammenhang — the deeper connection between ideas. Du könntest sagen: „Das ist genau der Zusammenhang, den ich meine."',
    annotation: 'Verbindung = connection (general) · Zusammenhang = connection/context (between ideas, concepts)',
    timestamp: '8:17',
  },
];

export default function ConversationMode() {
  const [showEnglish, setShowEnglish] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);

  return (
    <div className="h-full flex flex-col">
      {/* Conversation area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Session header */}
          <div className="text-center mb-8">
            <p className="text-ink-faint text-xs font-mono">donnerstag, 27. märz · sitzung 47</p>
            <p className="text-ink-muted text-sm mt-1 font-serif italic">Über Hesse und das Suchen</p>
          </div>

          {MOCK_CONVERSATION.map((msg) => (
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
                {/* German text */}
                <p className="text-[0.95rem] leading-relaxed">{msg.german}</p>

                {/* Annotation */}
                {msg.annotation && (
                  <div className="mt-3 pt-2.5 border-t border-border-light">
                    <p className="text-xs text-german font-mono leading-relaxed">{msg.annotation}</p>
                  </div>
                )}

                {/* Controls for companion messages */}
                {msg.role === 'companion' && (
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={() => setShowEnglish(showEnglish === msg.id ? null : msg.id)}
                      className="text-xs font-mono text-ink-faint hover:text-english transition-colors"
                    >
                      {showEnglish === msg.id ? 'hide english' : 'en'}
                    </button>
                    <button className="text-xs font-mono text-ink-faint hover:text-accent transition-colors">
                      slower
                    </button>
                    <button className="text-xs font-mono text-ink-faint hover:text-accent transition-colors">
                      anders sagen
                    </button>
                    <button className="text-xs font-mono text-ink-faint hover:text-accent transition-colors">
                      🔊
                    </button>
                    <span className="text-xs font-mono text-ink-faint ml-auto">{msg.timestamp}</span>
                  </div>
                )}

                {/* English translation (toggled) */}
                {showEnglish === msg.id && msg.english && (
                  <div className="mt-2 animate-fade-in">
                    <p className="text-sm text-english italic leading-relaxed">{msg.english}</p>
                  </div>
                )}

                {/* User message timestamp */}
                {msg.role === 'user' && (
                  <div className="mt-1 flex justify-end">
                    <span className="text-xs font-mono text-ink-faint">{msg.timestamp}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-border px-6 py-4">
        <div className="max-w-2xl mx-auto">
          {/* Quick actions */}
          <div className="flex gap-2 mb-3">
            <QuickAction label="Auf Deutsch bleiben" active />
            <QuickAction label="Korrigiere mich" />
            <QuickAction label="Einfacher bitte" />
            <QuickAction label="Thema wechseln" />
          </div>

          {/* Input */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsListening(!isListening)}
              className={`
                w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300
                ${isListening
                  ? 'bg-german text-surface scale-110 shadow-lg shadow-german/20'
                  : 'bg-surface-raised border border-border hover:border-german text-ink-muted hover:text-german'
                }
              `}
            >
              <span className="text-lg">{isListening ? '●' : '🎙'}</span>
            </button>
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isListening ? 'Ich höre zu...' : 'Auf Deutsch schreiben...'}
                className="w-full bg-surface-raised border border-border-light rounded-xl px-4 py-3 text-sm
                  placeholder:text-ink-faint focus:outline-none focus:border-accent/40 transition-colors"
              />
              {isListening && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-0.5 bg-german rounded-full animate-pulse-soft"
                      style={{
                        height: `${8 + Math.random() * 12}px`,
                        animationDelay: `${i * 0.15}s`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
            <button className="text-ink-faint hover:text-ink text-sm font-mono transition-colors">
              ↵
            </button>
          </div>

          {/* Status line */}
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs font-mono text-ink-faint">
              {isListening ? (
                <span className="text-german">● aufnahme läuft</span>
              ) : (
                'sprechen oder tippen'
              )}
            </p>
            <p className="text-xs font-mono text-ink-faint">
              sitzung: 23 min · 14 neue wörter
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ label, active }: { label: string; active?: boolean }) {
  return (
    <button
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
