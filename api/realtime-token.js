// at the top of each serverless function that calls OpenAI:
const OPENAI_KEY =
  process.env.OPENAI_API_KEY ||
  process.env.OPENAI_KEY ||            // <- legacy alias if you used it
  process.env.OPENAI_SECRET;           // <- any other legacy name

const TEXT_MODEL =
  process.env.OPENAI_MODEL_TEXT ||
  process.env.OPENAI_MODEL ||          // legacy alias if you used it
  'gpt-4o-mini';


export const config = { runtime: 'edge' };

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export default async function handler(req) {
  const origin = req.headers.get('origin') || '*';
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(origin) });
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'GET required' }), { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL_REALTIME || 'gpt-4o-realtime-preview';
  if (!apiKey) return new Response(JSON.stringify({ error: 'Missing OPENAI_API_KEY' }), { status: 500, headers: corsHeaders(origin) });

  const r = await fetch('https://api.openai.com/v1/realtime/sessions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, voice: 'alloy', input_audio_format: 'pcm16', output_audio_format: 'pcm16' })
  });

  const txt = await r.text();
  return new Response(txt || JSON.stringify({ error: 'Upstream error', status: r.status }), {
    status: r.status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
  });
}
