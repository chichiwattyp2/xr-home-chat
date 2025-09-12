
/**
 * Simple client wrapper that talks to your Vercel functions
 * - `/api/chat`  : for messages[] chat (streaming or non-streaming depending on your route)
 * - `/api/vr-assistant` : for one-turn prompt (returns {reply})
 */
window.AskXR = {
  /**
   * Multi-turn chat using messages[] (use this if the page already builds a messages array)
   * Returns full text (non-stream) OR concatenates SSE if your /api/chat streams.
   */
  async chat(messages, {stream=false} = {}) {
    const url = stream ? '/api/chat?stream=1' : '/api/chat';
    const res = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({messages})
    });
    if (!res.ok) throw new Error(await res.text());

    // If your /api/chat streams SSE, concat chunks; otherwise parse JSON.
    if (stream && res.body && res.headers.get('content-type')?.includes('text/event-stream')) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '', out = '';
      while (true) {
        const {value, done} = await reader.read();
        if (done) break;
        buf += decoder.decode(value, {stream:true});
        for (const line of buf.split('\n')) {
          if (line.startsWith('data:')) {
            const data = line.slice(5).trim();
            if (data && data !== '[DONE]') out += data;
          }
        }
        buf = ''; // simplistic; good enough for most streams
      }
      return out;
    } else {
      const json = await res.json();
      // support either {reply} or {text} or {message}
      return json.reply || json.text || json.message || '';
    }
  },

  /**
   * One-turn helper: send plain text, optional short history.
   * Uses your /api/vr-assistant which returns {reply}.
   */
  async ask(userText, history=[]) {
    const res = await fetch('/api/vr-assistant', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({userText, history})
    });
    if (!res.ok) throw new Error(await res.text());
    const {reply} = await res.json();
    return reply || '';
  }
};

