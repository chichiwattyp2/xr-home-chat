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
  if (req.method !== 'GET') return new Response(JSON.stringify({ error: 'GET required' }), { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } });

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL_REALTIME || 'gpt-4o-realtime-preview';
  if (!apiKey) return new Response('Missing OPENAI_API_KEY', { status: 500, headers: corsHeaders(origin) });

  const r = await fetch('https://api.openai.com/v1/realtime/sessions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, voice: 'alloy', input_audio_format: 'pcm16', output_audio_format: 'pcm16' })
  });

  const status = r.status;
  const txt = await r.text();
  return new Response(txt, { status, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } });
}
