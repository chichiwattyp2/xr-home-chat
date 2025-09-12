// api/vr-assistant.js  (Vercel Serverless Function, Node 18+)
module.exports = async (req, res) => {
  // Same-origin with /public, so CORS isn't required, but harmless to include:
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Use POST' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { history = [], userText = '' } = body;
    if (!userText) return res.status(400).json({ error: 'Missing userText' });

    const messages = [
      { role: 'system', content: 'You are a friendly VR guide in a serene forest. Keep replies ≤ 2 sentences.' },
      ...history,
      { role: 'user', content: String(userText) }
    ];

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',          // pick a model you have access to
        messages,
        temperature: 0.6,
        max_tokens: 200
      })
    });

    if (!r.ok) return res.status(500).json({ error: 'OpenAI error', detail: await r.text() });
    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content?.trim()
      || "I'm not sure, but look around—there’s plenty to discover!";
    res.status(200).json({ reply });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
};
