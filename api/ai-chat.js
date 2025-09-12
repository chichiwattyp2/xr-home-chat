// /api/ai-chat.js  (ESM Node function)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });

  let body = {};
  try {
    if (req.body && typeof req.body === 'object') body = req.body;
    else if (typeof req.body === 'string') body = JSON.parse(req.body || '{}');
    else {
      body = JSON.parse(await new Promise((ok,no)=>{let d='';req.on('data',c=>d+=c);req.on('end',()=>ok(d));req.on('error',no);})||'{}');
    }
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const prompt = String(body.prompt||'').trim();
  const system = String(body.system||'').trim();
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  const OPENAI_KEY = (process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || process.env.OPENAI_SECRET || '').trim();
  const MODEL = (process.env.OPENAI_MODEL_TEXT || process.env.OPENAI_MODEL || 'gpt-4o-mini').trim();
  if (!OPENAI_KEY) return res.status(500).json({ error: 'Missing OPENAI_API_KEY' });

  const messages = [];
  if (system) messages.push({ role:'system', content: system });
  messages.push({ role:'user', content: prompt });

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method:'POST',
      headers:{ 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type':'application/json' },
      body: JSON.stringify({ model: MODEL, messages, temperature: 0.6, max_tokens: 300 })
    });
    const text = await r.text();
    if (!r.ok) return res.status(r.status).setHeader('Content-Type','application/json').send(text);

    let data={}; try{ data=JSON.parse(text);}catch{}
    const reply = data?.choices?.[0]?.message?.content?.trim() || 'Let’s keep exploring!';
    return res.status(200).json({ reply });
  } catch (err) {
    console.error('[ai-chat] crash', err);
    return res.status(500).json({ error: 'Internal crash' });
  }
}
