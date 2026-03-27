'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, Session, LiveServerMessage, Modality } from '@google/genai';
import { BEGLEITER_VOICE_PROMPT } from '@/lib/system-prompt';

// Audio constants
const SAMPLE_RATE = 16000;
const PLAYBACK_RATE = 24000;
const LIVE_MODEL = 'gemini-2.5-flash-native-audio-latest';

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
type SpeakingState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface TranscriptEntry {
  id: string;
  role: 'user' | 'companion';
  text: string;
  timestamp: string;
}

function getTimestamp(): string {
  const now = new Date();
  return `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export default function LiveConversation() {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [speakingState, setSpeakingState] = useState<SpeakingState>('idle');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentModelText, setCurrentModelText] = useState('');

  const sessionRef = useRef<Session | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, currentModelText]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  // ─── Audio playback ─────────────────────────────────

  const playAudioChunk = useCallback((pcmData: ArrayBuffer) => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;

    // Convert Int16 PCM to Float32
    const int16 = new Int16Array(pcmData);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }

    audioQueueRef.current.push(float32);
    drainAudioQueue();
  }, []);

  const drainAudioQueue = useCallback(() => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    if (!audioContextRef.current) return;
    isPlayingRef.current = true;

    const ctx = audioContextRef.current;
    const chunk = audioQueueRef.current.shift()!;

    const buffer = ctx.createBuffer(1, chunk.length, PLAYBACK_RATE);
    buffer.copyToChannel(chunk as unknown as Float32Array<ArrayBuffer>, 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => {
      isPlayingRef.current = false;
      currentSourceRef.current = null;
      drainAudioQueue();
    };
    currentSourceRef.current = source;
    source.start();
  }, []);

  // ─── Mic capture via AudioWorklet ───────────────────

  const startMicCapture = useCallback(async (session: Session) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: SAMPLE_RATE,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    mediaStreamRef.current = stream;

    const ctx = audioContextRef.current!;

    // Create a ScriptProcessor as fallback (AudioWorklet needs a separate file)
    const source = ctx.createMediaStreamSource(stream);
    const processor = ctx.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
      if (!sessionRef.current) return;
      const inputData = e.inputBuffer.getChannelData(0);

      // Resample to 16kHz if needed
      const targetLength = Math.round(inputData.length * (SAMPLE_RATE / ctx.sampleRate));
      const resampled = new Float32Array(targetLength);
      const ratio = inputData.length / targetLength;
      for (let i = 0; i < targetLength; i++) {
        resampled[i] = inputData[Math.floor(i * ratio)];
      }

      // Convert to Int16 PCM
      const int16 = new Int16Array(resampled.length);
      for (let i = 0; i < resampled.length; i++) {
        const s = Math.max(-1, Math.min(1, resampled[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      // Convert to base64
      const bytes = new Uint8Array(int16.buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      // Send to Gemini Live
      try {
        session.sendRealtimeInput({
          audio: {
            data: base64,
            mimeType: 'audio/pcm;rate=16000',
          },
        });
      } catch {
        // Session may have closed
      }
    };

    source.connect(processor);
    // ScriptProcessor must connect to something to fire, but we don't want mic feedback
    const silentDest = ctx.createGain();
    silentDest.gain.value = 0;
    silentDest.connect(ctx.destination);
    processor.connect(silentDest);
    workletNodeRef.current = processor as unknown as AudioWorkletNode;
  }, []);

  // ─── Connect to Gemini Live ─────────────────────────

  const connect = useCallback(async () => {
    setConnectionState('connecting');
    setError(null);

    try {
      // Get ephemeral token from server
      const tokenRes = await fetch('/api/live-token', { method: 'POST' });
      if (!tokenRes.ok) {
        const err = await tokenRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to get auth token');
      }
      const { token } = await tokenRes.json();

      // Create audio context (resume for autoplay policy)
      const ctx = new AudioContext({ sampleRate: PLAYBACK_RATE });
      if (ctx.state === 'suspended') await ctx.resume();
      audioContextRef.current = ctx;

      // Connect to Gemini Live
      const ai = new GoogleGenAI({ apiKey: token });

      const session = await ai.live.connect({
        model: LIVE_MODEL,
        callbacks: {
          onopen: () => {
            console.log('Live session opened');
          },
          onmessage: (msg: LiveServerMessage) => {
            handleServerMessage(msg);
          },
          onerror: (err: ErrorEvent) => {
            console.error('Live session error:', err);
            setError('Sitzungsfehler. Bitte neu verbinden.');
            setConnectionState('error');
          },
          onclose: (ev: CloseEvent) => {
            console.log('Live session closed:', ev.code, ev.reason);
            if (connectionState !== 'error') {
              setConnectionState('disconnected');
            }
            setSpeakingState('idle');
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: {
            parts: [{ text: BEGLEITER_VOICE_PROMPT }],
          },
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Kore',
              },
            },
          },
        },
      });

      sessionRef.current = session;
      setConnectionState('connected');
      setSpeakingState('listening');

      // Start mic capture
      await startMicCapture(session);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      console.error('Connect error:', msg);
      setError(msg.length > 150 ? 'Verbindung fehlgeschlagen. Bitte versuche es erneut.' : msg);
      setConnectionState('error');
    }
  }, [startMicCapture]);

  // ─── Handle incoming messages ───────────────────────

  const handleServerMessage = useCallback((msg: LiveServerMessage) => {
    if (msg.serverContent) {
      const content = msg.serverContent;

      // Text transcript from model
      if (content.modelTurn?.parts) {
        for (const part of content.modelTurn.parts) {
          if (part.text) {
            // Filter thinking traces (start with ** or contain planning language)
            const text = part.text;
            const isThinking = text.startsWith('**') || text.startsWith('*') ||
              /^(I've|I'm|Let me|The user|Processing|Crafting|Outputting|Formulating)/i.test(text.trim());
            if (!isThinking) {
              setSpeakingState('speaking');
              setCurrentModelText(prev => prev + text);
            }
          }
          if (part.inlineData?.data) {
            // Audio data
            setSpeakingState('speaking');
            const binaryString = atob(part.inlineData.data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            playAudioChunk(bytes.buffer);
          }
        }
      }

      if (content.interrupted) {
        // Stop current playback and clear queue
        if (currentSourceRef.current) {
          try { currentSourceRef.current.stop(); } catch {}
          currentSourceRef.current = null;
        }
        audioQueueRef.current = [];
        isPlayingRef.current = false;
        setCurrentModelText('');
        setSpeakingState('listening');
      }

      if (content.turnComplete) {
        // Finalize the current model turn
        setCurrentModelText(prev => {
          if (prev.trim()) {
            setTranscript(t => [...t, {
              id: `model-${Date.now()}`,
              role: 'companion',
              text: prev.trim(),
              timestamp: getTimestamp(),
            }]);
          }
          return '';
        });
        setSpeakingState('listening');
      }
    }
  }, [playAudioChunk]);

  // ─── Disconnect ─────────────────────────────────────

  const disconnect = useCallback(() => {
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch {}
      sessionRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setConnectionState('disconnected');
    setSpeakingState('idle');
  }, []);

  // ─── Send text message ──────────────────────────────

  const [textInput, setTextInput] = useState('');

  const sendText = useCallback((text: string) => {
    if (!sessionRef.current || !text.trim()) return;

    setTranscript(t => [...t, {
      id: `user-${Date.now()}`,
      role: 'user',
      text: text.trim(),
      timestamp: getTimestamp(),
    }]);

    sessionRef.current.sendClientContent({
      turns: [{ role: 'user', parts: [{ text: text.trim() }] }],
      turnComplete: true,
    });

    setSpeakingState('thinking');
    setTextInput('');
  }, []);

  const handleQuickAction = useCallback((action: string) => {
    if (!sessionRef.current) return;
    const messages: Record<string, string> = {
      'german-only': 'Auf Deutsch bleiben.',
      'simple': 'Einfacher bitte.',
      'correct': 'Korrigiere mich bitte.',
      'anders': 'Anders sagen.',
      'topic': 'Lass uns das Thema wechseln.',
    };
    if (messages[action]) sendText(messages[action]);
  }, [sendText]);

  // ─── Render ─────────────────────────────────────────

  return (
    <div className="h-full flex flex-col">
      {/* Transcript area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-2xl mx-auto space-y-5">
          <div className="text-center mb-8">
            <p className="text-ink-faint text-xs font-mono">live gespräch</p>
            <p className="text-ink-muted text-sm mt-1 font-serif italic">Sprich mit Begleiter</p>
          </div>

          {/* Connection prompt */}
          {connectionState === 'disconnected' && transcript.length === 0 && (
            <div className="text-center py-12 animate-fade-in">
              <p className="text-ink-muted text-lg font-serif mb-6">
                Drücke den Knopf unten und sprich auf Deutsch.
              </p>
              <p className="text-ink-faint text-sm">
                Begleiter hört zu und antwortet dir.
              </p>
            </div>
          )}

          {/* Transcript */}
          {transcript.map((entry) => (
            <div
              key={entry.id}
              className={`animate-fade-in ${entry.role === 'user' ? 'flex justify-end' : ''}`}
            >
              <div className={`
                max-w-lg rounded-2xl px-5 py-3.5
                ${entry.role === 'user'
                  ? 'bg-surface-active text-ink ml-12'
                  : 'bg-surface-raised border border-border-light mr-12'
                }
              `}>
                <p className="text-[0.95rem] leading-relaxed">{entry.text}</p>
                <div className={`mt-1 flex ${entry.role === 'user' ? 'justify-end' : ''}`}>
                  <span className="text-xs font-mono text-ink-faint">{entry.timestamp}</span>
                </div>
              </div>
            </div>
          ))}

          {/* Streaming model text */}
          {currentModelText && (
            <div className="animate-fade-in">
              <div className="max-w-lg rounded-2xl px-5 py-3.5 bg-surface-raised border border-border-light mr-12">
                <p className="text-[0.95rem] leading-relaxed">
                  {currentModelText}
                  <span className="text-ink-faint animate-pulse-soft">▍</span>
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-center animate-fade-in">
              <p className="text-xs font-mono text-red-400/80 bg-red-400/10 inline-block px-4 py-2 rounded-lg max-w-md">
                {error}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="border-t border-border px-6 py-4">
        <div className="max-w-2xl mx-auto">
          {/* Quick actions (only when connected) */}
          {connectionState === 'connected' && (
            <div className="flex gap-2 mb-3 flex-wrap">
              <QuickAction label="Auf Deutsch bleiben" onClick={() => handleQuickAction('german-only')} />
              <QuickAction label="Korrigiere mich" onClick={() => handleQuickAction('correct')} />
              <QuickAction label="Einfacher bitte" onClick={() => handleQuickAction('simple')} />
              <QuickAction label="Anders sagen" onClick={() => handleQuickAction('anders')} />
            </div>
          )}

          {/* Main controls */}
          <div className="flex items-center gap-3">
            {/* Mic / Connect button */}
            <button
              onClick={connectionState === 'connected' ? disconnect : connect}
              disabled={connectionState === 'connecting'}
              className={`
                w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300
                ${connectionState === 'connected'
                  ? speakingState === 'listening'
                    ? 'bg-german text-surface scale-110 shadow-lg shadow-german/20'
                    : speakingState === 'speaking'
                      ? 'bg-accent text-surface scale-105 shadow-lg shadow-accent/20'
                      : 'bg-surface-active text-german border-2 border-german/40'
                  : connectionState === 'connecting'
                    ? 'bg-surface-raised border border-border text-ink-faint animate-pulse-soft'
                    : connectionState === 'error'
                      ? 'bg-red-400/10 border border-red-400/30 text-red-400'
                      : 'bg-surface-raised border border-border hover:border-german text-ink-muted hover:text-german'
                }
              `}
            >
              {connectionState === 'connected' ? (
                speakingState === 'listening' ? (
                  <span className="text-xl">●</span>
                ) : (
                  <span className="text-lg">⏸</span>
                )
              ) : connectionState === 'connecting' ? (
                <span className="text-sm">…</span>
              ) : (
                <span className="text-xl">🎙</span>
              )}
            </button>

            {/* Text input (also works when connected) */}
            {connectionState === 'connected' && (
              <form
                onSubmit={(e) => { e.preventDefault(); sendText(textInput); }}
                className="flex-1 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Oder schreib etwas..."
                  className="flex-1 bg-surface-raised border border-border-light rounded-xl px-4 py-3 text-sm
                    placeholder:text-ink-faint focus:outline-none focus:border-accent/40 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!textInput.trim()}
                  className="text-ink-faint hover:text-ink text-sm font-mono transition-colors disabled:opacity-30 px-2"
                >
                  ↵
                </button>
              </form>
            )}

            {connectionState !== 'connected' && (
              <p className="text-sm text-ink-faint">
                {connectionState === 'connecting'
                  ? 'Verbindung wird hergestellt…'
                  : connectionState === 'error'
                    ? 'Verbindung fehlgeschlagen. Tippe erneut auf das Mikrofon.'
                    : 'Tippe auf das Mikrofon, um zu beginnen.'
                }
              </p>
            )}
          </div>

          {/* Status */}
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                connectionState === 'connected'
                  ? speakingState === 'listening' ? 'bg-german animate-pulse-soft'
                    : speakingState === 'speaking' ? 'bg-accent'
                    : 'bg-ink-faint'
                  : 'bg-ink-faint'
              }`} />
              <p className="text-xs font-mono text-ink-faint">
                {connectionState === 'connected'
                  ? speakingState === 'listening' ? 'ich höre zu…'
                    : speakingState === 'speaking' ? 'begleiter spricht…'
                    : speakingState === 'thinking' ? 'begleiter denkt…'
                    : 'bereit'
                  : connectionState === 'connecting' ? 'verbinde…'
                  : 'nicht verbunden'
                }
              </p>
            </div>
            <p className="text-xs font-mono text-ink-faint">
              {transcript.length} nachrichten
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded-full text-xs font-mono transition-all
        bg-surface-raised text-ink-faint border border-border-light hover:text-ink hover:border-border"
    >
      {label}
    </button>
  );
}
