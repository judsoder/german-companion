import { GoogleGenAI, Modality } from '@google/genai';

export async function POST() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'API key not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const token = await ai.authTokens.create({
      config: {
        httpOptions: { apiVersion: 'v1alpha' },
        // Constrain to our live model and config
        liveConnectConstraints: {
          config: {
            responseModalities: [Modality.AUDIO, Modality.TEXT],
          },
        },
        expireTime: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min
      },
    });

    return new Response(
      JSON.stringify({ token: token.name }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Token creation failed';
    console.error('Token creation error:', msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
