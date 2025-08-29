// public/client.js — SSE-parsing version (same-origin API)

const chatText = document.querySelector('#chatText');
const promptInput = document.querySelector('#prompt');
const sendBtn = document.querySelector('#send');
const voiceBtn = document.querySelector('#voice');
const audioEl = document.querySelector('#assistantAudio');

function setPanel(text) {
  chatText.setAttribute('text', 'value', text);
}

async function sendPrompt() {
  const prompt = promptInput.value.trim();
  if (!prompt) return;

  promptInput.value = '';
  let buf = 'You: ' + prompt + '\n\n';
  setPanel(buf + '…');

  // Call same-origin API
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });

  if (!res.ok || !res.body) {
    const err = await res.text().catch(() => 'Unknown error');
    setPanel('Error ' + res.status + ': ' + err);
    return;
  }

  // --- Parse Server-Sent Events from OpenAI Responses API ---
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let partial = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    partial += decoder.decode(value, { stream: true });

    // SSE protocol is line-based. Process complete lines only.
    const lines = partial.split('\n');
    partial = lines.pop() || '';

    for (const line of lines) {
      // Lines may be empty or comments starting with ":"
      if (!line || line.startsWith(':')) continue;

      // We only care about data: lines (ignore "event:" lines)
      if (line.startsWith('data: ')) {
        const json = line.slice(6).trim();
        if (json === '[DONE]') continue;

        try {
          const evt = JSON.parse(json);

          // Streamed text tokens arrive as response.output_text.delta
          if (evt.type === 'response.output_text.delta' && typeof evt.delta === 'string') {
            buf += evt.delta;
            setPanel(buf);
          }

          // Optional: when the response completes, you could add a cue
          if (evt.type === 'response.completed') {
            // setPanel(buf + '\n\n✓');
          }
        } catch {
          // Ignore non-JSON lines
        }
      }
    }
  }
}

sendBtn.addEventListener('click', sendPrompt);
promptInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendPrompt();
});

// ---------------------------
// Realtime voice via WebRTC
// ---------------------------
let pc;
let localStream;

voiceBtn.addEventListener('click', async () => {
  if (!pc) await startVoice();
});

async function startVoice() {
  // Get ephemeral session token from same-origin API
  const session = await fetch('/api/realtime-token').then(r => r.json()).catch(() => null);
  if (!session || !session.client_secret || !session.client_secret.value) {
    setPanel('Realtime error: failed to get session token');
    return;
  }
  const EPHEMERAL_KEY = session.client_secret.value;

  pc = new RTCPeerConnection();

  // Play remote audio
  pc.ontrack = (e) => {
    audioEl.srcObject = e.streams[0];
  };

  // Get mic
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

  // Offer
  const offer = await pc.createOffer({ offerToReceiveAudio: true });
  await pc.setLocalDescription(offer);

  // OpenAI Realtime WebSocket (WebRTC over WS bootstrap)
  const modelName = session.model || 'gpt-4o-realtime-preview';
  const baseUrl = 'wss://api.openai.com/v1/realtime?model=' + encodeURIComponent(modelName);

  const ws = new WebSocket(baseUrl, [
    'realtime',
    'openai-insecure-api-key.' + EPHEMERAL_KEY,
    'openai-sdp.' + btoa(pc.localDescription.sdp)
  ]);

  ws.onopen = () => console.log('Realtime socket open');
  ws.onmessage = async (event) => {
    try {
      const msg = JSON.parse(event.data);

      // Live text from the voice model (optional)
      if (msg.type === 'response.output_text.delta' && typeof msg.delta === 'string') {
        const current = chatText.getAttribute('text').value || '';
        chatText.setAttribute('text', 'value', current + msg.delta);
      }

      if (msg.type === 'webrtc.sdp_answer' && msg.sdp) {
        const sdp = atob(msg.sdp);
        await pc.setRemoteDescription({ type: 'answer', sdp });
      }

      if (msg.type === 'error') {
        console.error('Realtime error', msg);
      }
    } catch (e) {
      // Non-JSON messages can be ignored
    }
  };
  ws.onerror = (e) => console.error('WS error', e);
  ws.onclose = () => console.log('WS closed');
}
