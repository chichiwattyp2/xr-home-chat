// /api/chat.js  (Node serverless function)

module.exports = async (req, res) => {
  // CORS (harmless even same-origin)
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });

  // Parse body safely
  let body = {};
  try {
    if (typeof req.body === 'string') body = JSON.parse(req.body || '{}');
    else if (req.body && typeof req.body === 'object') body = req.body;
    else {
      body = JSON.parse(await new Promise((ok, no) => {
        let d=''; req.on('data', c => d += c); req.on('end', () => ok(d)); req.on('error', no);
      }) || '{}');
    }
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const prompt = body?.prompt || '';
  const system = body?.system || '';
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  // Read env INSIDE the handler
  const OPENAI_KEY =
    process.env.OPENAI_API_KEY ||
    process.env.OPENAI_KEY ||
    process.envOPENAI_SECRET;
  const MODEL =
    process.env.OPENAI_MODEL_TEXT ||
    process.env.OPENAI_MODEL ||
    'gpt-4o-mini';

  if (!OPENAI_KEY) return res.status(500).json({ error: 'Missing OPENAI_API_KEY' });

  const inputString = (system ? `System: ${system}\n\n` : '') + `User: ${prompt}`;

  try {
    // Non-stream first (simpler, JSON-only)
    const upstream = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, input: inputString, stream: false })
    });

    const text = await upstream.text();
    if (!upstream.ok) {
      // Pass OpenAI’s JSON error through to the client
      return res.status(upstream.status).setHeader('Content-Type','application/json').send(text);
    }

    // Normalize to { reply: "..." }
    let data; try { data = JSON.parse(text); } catch { data = {}; }
    const reply =
      data?.output_text ||
      data?.choices?.[0]?.message?.content ||
      data?.data?.[0]?.content?.[0]?.text ||
      'Sorry, I had trouble answering that.';
    return res.status(200).json({ reply });

  } catch (err) {
    console.error('[chat] Uncaught error:', err);
    return res.status(500).json({ error: 'Internal crash' });
  }
};
