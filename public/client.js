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

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });

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
promptInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendPrompt(); });

// --- Voice via Realtime + WebRTC ---
let pc, localStream;

voiceBtn.addEventListener('click', async () => {
  if (!pc) await startVoice();
});

async function startVoice() {
  const session = await fetch('/api/realtime-token').then(r => r.json());
  if (!session || !session.client_secret || !session.client_secret.value) {
    alert('Failed to get realtime session'); return;
  }
  const EPHEMERAL_KEY = session.client_secret.value;

  pc = new RTCPeerConnection();

  pc.ontrack = (e) => {
    audioEl.srcObject = e.streams[0];
  };

  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

  const offer = await pc.createOffer({ offerToReceiveAudio: true });
  await pc.setLocalDescription(offer);

  const baseUrl = 'wss://api.openai.com/v1/realtime?model=' + encodeURIComponent(session.model || 'gpt-4o-realtime-preview');
  const ws = new WebSocket(baseUrl, [
    'realtime',
    'openai-insecure-api-key.' + EPHEMERAL_KEY,
    'openai-sdp.' + btoa(pc.localDescription.sdp)
  ]);

  ws.onopen = () => console.log('Realtime socket open');
  ws.onmessage = async (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'response.output_text.delta') {
      chatText.setAttribute('text', 'value', (chatText.getAttribute('text').value || '') + msg.delta);
    }
    if (msg.type === 'webrtc.sdp_answer') {
      const sdp = atob(msg.sdp);
      await pc.setRemoteDescription({ type: 'answer', sdp });
    }
    if (msg.type === 'error') console.error('Realtime error', msg);
  };
  ws.onerror = (e) => console.error('WS error', e);
  ws.onclose = () => console.log('WS closed');
}
