// public/client.js  — Vercel (same-origin) version

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
  setPanel('You: ' + prompt + '\n\n…');

  // Calls your same-origin API: https://<your-app>.vercel.app/api/chat
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });

  if (!res.ok) {
    // Surface any upstream error text for debugging
    const err = await res.text().catch(() => 'Unknown error');
    setPanel('Error ' + res.status + ': ' + err);
    return;
  }

  // Stream the response and update the panel as chunks arrive
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = 'You: ' + prompt + '\n\n';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    setPanel(buf);
  }
}

sendBtn.addEventListener('click', sendPrompt);
promptInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendPrompt();
});

// ---------------------------
// Realtime voice via WebRTC
// ---------------------------
let pc;            // RTCPeerConnection
let localStream;   // Mic stream

voiceBtn.addEventListener('click', async () => {
  // Single-click to connect and start talking (model handles VAD)
  if (!pc) await startVoice();
});

async function startVoice() {
  // 1) Ask your server for an ephemeral Realtime session token
  //    GET https://<your-app>.vercel.app/api/realtime-token
  const session = await fetch('/api/realtime-token').then(r => r.json()).catch(() => null);
  if (!session || !session.client_secret || !session.client_secret.value) {
    setPanel('Realtime error: failed to get session token');
    return;
  }
  const EPHEMERAL_KEY = session.client_secret.value;

  // 2) Create a WebRTC peer connection
  pc = new RTCPeerConnection();

  // Remote audio from the model → play it
  pc.ontrack = (e) => {
    audioEl.srcObject = e.streams[0];
  };

  // 3) Get microphone input and attach to connection
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

  // 4) Create an SDP offer to receive audio back
  const offer = await pc.createOffer({ offerToReceiveAudio: true });
  await pc.setLocalDescription(offer);

  // 5) OpenAI Realtime over WebSocket using the ephemeral key + SDP
  const modelName = session.model || 'gpt-4o-realtime-preview';
  const baseUrl = 'wss://api.openai.com/v1/realtime?model=' + encodeURIComponent(modelName);

  const ws = new WebSocket(baseUrl, [
    'realtime',
    'openai-insecure-api-key.' + EPHEMERAL_KEY,
    'openai-sdp.' + btoa(pc.localDescription.sdp)
  ]);

  ws.onopen = () => {
    console.log('Realtime socket open');
  };

  ws.onmessage = async (event) => {
    // The server sends a variety of events. We handle the important ones:
    const msg = JSON.parse(event.data);

    // Streaming text tokens (optional but nice to show)
    if (msg.type === 'response.output_text.delta') {
      const current = chatText.getAttribute('text').value || '';
      chatText.setAttribute('text', 'value', current + msg.delta);
    }

    // Answer SDP from OpenAI → complete the WebRTC handshake
    if (msg.type === 'webrtc.sdp_answer') {
      const sdp = atob(msg.sdp);
      await pc.setRemoteDescription({ type: 'answer', sdp });
    }

    if (msg.type === 'error') {
      console.error('Realtime error', msg);
    }
  };

  ws.onerror = (e) => console.error('WS error', e);
  ws.onclose = () => console.log('WS closed');
}
