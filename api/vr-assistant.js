// /api/vr-assistant.js  (Vercel Serverless Function, CommonJS)
module.exports = async (req, res) => {
  // --- CORS (loosened for dev; restrict to your domains in prod) ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Use POST' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { history = [], userText = '' } = body;
    if (!userText) return res.status(400).json({ error: 'Missing userText' });

    const messages = [
      { role: 'system', content: 'You are a friendly VR guide in a serene forest. Keep replies <= 2 sentences.' },
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
        model: 'gpt-4o-mini',        // pick a model you have access to
        messages,
        temperature: 0.6,
        max_tokens: 200
      })
    });

    if (!r.ok) {
      const t = await r.text();
      return res.status(500).json({ error: 'OpenAI error', detail: t });
    }

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content?.trim()
      || "I'm not sure, but look around—there’s plenty to discover!";
    res.status(200).json({ reply });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
};
