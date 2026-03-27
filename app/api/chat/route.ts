import { GoogleGenAI } from '@google/genai';
import { BEGLEITER_SYSTEM_PROMPT } from '@/lib/system-prompt';

export const runtime = 'edge';

// Models to try in order of preference
const MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.5-flash-lite',
];

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'API-Schlüssel nicht konfiguriert.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { messages, mode } = (await req.json()) as {
    messages: ChatMessage[];
    mode?: string;
  };

  // Build mode-specific prompt additions
  let modeAddition = '';
  if (mode === 'simple') {
    modeAddition = '\n\n[Der Benutzer hat "einfacher bitte" gewählt. Verwende ab jetzt einfachere Sprache.]';
  } else if (mode === 'correct') {
    modeAddition = '\n\n[Der Benutzer hat "korrigiere mich" gewählt. Korrigiere Fehler aktiv aber freundlich.]';
  } else if (mode === 'german-only') {
    modeAddition = '\n\n[Der Benutzer hat "auf Deutsch bleiben" gewählt. Kein Englisch, auch nicht in Erklärungen.]';
  }

  const ai = new GoogleGenAI({ apiKey });

  const contents = messages.map((msg) => ({
    role: msg.role === 'user' ? 'user' as const : 'model' as const,
    parts: [{ text: msg.text }],
  }));

  const config = {
    systemInstruction: BEGLEITER_SYSTEM_PROMPT + modeAddition,
    temperature: 0.8,
    topP: 0.9,
    maxOutputTokens: 512,
  };

  // Try models in order until one works
  let lastError = '';
  for (const model of MODELS) {
    try {
      const response = await ai.models.generateContentStream({
        model,
        config,
        contents,
      });

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of response) {
              const text = chunk.text || '';
              if (text) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
              }
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Stream error';
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      // If rate limited or quota exceeded, try next model
      if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
        lastError = msg;
        continue;
      }
      // For other errors, fail immediately
      return new Response(
        JSON.stringify({ error: humanizeError(msg) }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // All models exhausted
  return new Response(
    JSON.stringify({ error: humanizeError(lastError) }),
    { status: 429, headers: { 'Content-Type': 'application/json' } }
  );
}

function humanizeError(raw: string): string {
  if (raw.includes('quota') || raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED')) {
    return 'API-Kontingent erreicht. Bitte warte einen Moment und versuche es erneut.';
  }
  if (raw.includes('API key') || raw.includes('401') || raw.includes('UNAUTHENTICATED')) {
    return 'API-Schlüssel ungültig. Bitte überprüfe die Konfiguration.';
  }
  if (raw.includes('not found') || raw.includes('404')) {
    return 'Modell nicht verfügbar. Bitte versuche es später erneut.';
  }
  return 'Verbindungsproblem. Bitte versuche es erneut.';
}
