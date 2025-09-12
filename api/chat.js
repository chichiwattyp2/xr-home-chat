// api/chat.js (Edge Function)

export const config = { runtime: 'edge' };

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// ---- Env fallbacks (use these everywhere) ----
const OPENAI_KEY =
  process.env.OPENAI_API_KEY ||
  process.env.OPENAI_KEY ||            // legacy alias if you used it
  process.env.OPENAI_SECRET;           // any other legacy name

const TEXT_MODEL =
  process.env.OPENAI_MODEL_TEXT ||
  process.env.OPENAI_MODEL ||          // legacy alias if you used it
  'gpt-4o-mini';

export default async function handler(req) {
  const origin = req.headers.get('origin') || '*';
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(origin) });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST required' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
    });
  }

  if (!OPENAI_KEY) {
    return new Response(JSON.stringify({ error: 'Missing OPENAI_API_KEY' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
    });
  }

  let body = {};
  try { body = await req.json(); } catch {}
  const prompt = body?.prompt;
  const system = body?.system;
  if (!prompt) {
    return new Response(JSON.stringify({ error: 'Missing prompt' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
    });
  }

  // You can also send {instructions: system} to /responses. This simple version
  // just prefixes the system text.
  const inputString = (system ? `System: ${system}\n\n` : '') + `User: ${prompt}`;

  const upstream = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: TEXT_MODEL,
      input: inputString,
      stream: true
    })
  });

  if (!upstream.ok) {
    const txt = await upstream.text();
    return new Response(txt || JSON.stringify({ error: 'Upstream error', status: upstream.status }), {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
    });
  }

  // Forward the stream and preserve the content-type
  const ct = upstream.headers.get('content-type') || 'text/event-stream; charset=utf-8';
  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': ct,
      'Cache-Control': 'no-store',
      ...corsHeaders(origin)
    }
  });
}
