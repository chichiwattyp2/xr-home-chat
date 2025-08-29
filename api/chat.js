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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(origin) });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST required' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
    });
  }

  let bodyText = await req.text();
  let body;
  try { body = JSON.parse(bodyText || '{}'); } catch {}
  const prompt = body?.prompt;
  const system = body?.system;
  if (!prompt) {
    return new Response(JSON.stringify({ error: 'Missing prompt' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL_TEXT || 'gpt-4o-mini';
  if (!apiKey) {
    return new Response('Missing OPENAI_API_KEY', { status: 500, headers: corsHeaders(origin) });
  }

  // Build a simple single-string input for Responses API to avoid role formatting mismatches.
  const inputString = (system ? `System: ${system}\n\n` : '') + `User: ${prompt}`;

  const upstream = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      input: inputString,
      stream: true
    })
  });

  if (!upstream.ok || !upstream.body) {
    const txt = await upstream.text();
    return new Response(txt, { status: 500, headers: corsHeaders(origin) });
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      ...corsHeaders(origin)
    }
  });
}
