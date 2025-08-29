// /api/health.js
export const config = { runtime: 'edge' };

export default async function handler() {
  const hasKey = !!process.env.OPENAI_API_KEY;
  const modelText = process.env.OPENAI_MODEL_TEXT || 'gpt-4o-mini';
  const modelRT = process.env.OPENAI_MODEL_REALTIME || 'gpt-4o-realtime-preview';

  return new Response(JSON.stringify({
    ok: true,
    env: {
      OPENAI_API_KEY: hasKey ? 'present' : 'missing',
      OPENAI_MODEL_TEXT: modelText,
      OPENAI_MODEL_REALTIME: modelRT
    }
  }), { headers: { 'Content-Type': 'application/json' } });
}
