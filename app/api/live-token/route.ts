/**
 * Returns the API key for client-side Live connection.
 * 
 * For production, this should use ephemeral tokens (ai.authTokens.create).
 * Currently, ephemeral tokens have compatibility issues with speechConfig
 * and the native-audio models. This endpoint exists so the API key stays
 * in env vars (not hardcoded in client code) and can be swapped to 
 * ephemeral tokens when the API stabilizes.
 */
export async function POST() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'API key not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ token: apiKey }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
