// /api/realtime-token.js  (Vercel Edge)
// Returns an ephemeral **client_secret** for the GA Realtime API.

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
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'GET required' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL_REALTIME || 'gpt-4o-realtime-preview';
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing OPENAI_API_KEY' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
    });
  }

  // GA endpoint (NOT the old beta /v1/realtime/sessions)
  const upstream = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    // Keep this minimal; you can set voice etc. later via session.update on the WS
    body: JSON.stringify({ model })
  });

  const bodyText = await upstream.text(); // pass through as-is
  return new Response(bodyText || JSON.stringify({ error: 'Upstream error' }), {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
  });
}
