import { GoogleGenAI } from '@google/genai';
import { BEGLEITER_SYSTEM_PROMPT } from '@/lib/system-prompt';

export const runtime = 'edge';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'GEMINI_API_KEY not configured' }),
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

  // Build conversation history for Gemini
  const contents = messages.map((msg) => ({
    role: msg.role === 'user' ? 'user' as const : 'model' as const,
    parts: [{ text: msg.text }],
  }));

  try {
    const response = await ai.models.generateContentStream({
      model: 'gemini-2.0-flash',
      config: {
        systemInstruction: BEGLEITER_SYSTEM_PROMPT + modeAddition,
        temperature: 0.8,
        topP: 0.9,
        maxOutputTokens: 512,
      },
      contents,
    });

    // Stream the response
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
          const errorMessage = err instanceof Error ? err.message : 'Stream error';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`));
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
    const errorMessage = err instanceof Error ? err.message : 'API error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
