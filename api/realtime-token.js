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
    return new Response(JSON.stringify({ error: 'GET required' }), {
      status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing OPENAI_API_KEY' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
    });
  }

  // GA: do NOT include `model` here. You can optionally include session config.
  const upstream = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ session: { type: 'realtime' } })
  });

  const bodyText = await upstream.text();
  return new Response(bodyText || JSON.stringify({ error: 'Upstream error' }), {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
  });
}
