// client.js — Chat (SSE) + Realtime Voice (WebRTC) — GA version

// ---------------------------
// DOM hooks (A-Frame + UI)
// ---------------------------
const chatText = document.querySelector('#chatText');
const promptInput = document.querySelector('#prompt');
const sendBtn = document.querySelector('#send');
const voiceBtn = document.querySelector('#voice');
const audioEl = document.querySelector('#assistantAudio');

// Make sure iOS will actually play audio
if (audioEl) {
  audioEl.autoplay = true;
  audioEl.playsInline = true;
  audioEl.muted = false;
}

function setPanel(text) {
  const safe = (text || '').slice(-8000);
  chatText?.setAttribute('text', 'value', safe);
}
function appendPanel(chunk) {
  const current = chatText?.getAttribute('text')?.value || '';
  setPanel(current + chunk);
}

// ---------------------------
// Streaming Chat over SSE
// ---------------------------
let chatAbortController = null;
let sending = false;

async function sendPrompt() {
  const prompt = promptInput.value.trim();
  if (!prompt || sending) return;

  if (chatAbortController) chatAbortController.abort();
  chatAbortController = new AbortController();
  sending = true;
  sendBtn.disabled = true;

  promptInput.value = '';
  let buf = `You: ${prompt}\n\n`;
  setPanel(buf + '…');

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal: chatAbortController.signal
    });

    if (!res.ok || !res.body) {
      const err = await res.text().catch(() => 'Unknown error');
      setPanel(`Error ${res.status}: ${err}`);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let partial = '';

    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      partial += decoder.decode(value, { stream: true });
      const lines = partial.split('\n');
      partial = lines.pop() || '';

      for (const line of lines) {
        if (!line || line.startsWith(':')) continue;
        if (line.startsWith('data: ')) {
          const json = line.slice(6).trim();
          if (json === '[DONE]') continue;
          try {
            const evt = JSON.parse(json);
            if (evt.type === 'response.output_text.delta' && typeof evt.delta === 'string') {
              buf += evt.delta;
              setPanel(buf);
            }
          } catch {}
        }
      }
    }
  } catch (e) {
    if (e.name !== 'AbortError') setPanel(`Network error: ${e.message || e}`);
  } finally {
    chatAbortController = null;
    sending = false;
    sendBtn.disabled = false;
  }
}
sendBtn?.addEventListener('click', sendPrompt);
promptInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendPrompt(); });

// ---------------------------
// Realtime Voice via WebRTC (GA)
// ---------------------------
let pc = null;
let ws = null;
let localStream = null;
let voiceActive = false;

voiceBtn?.addEventListener('click', async () => {
  if (!voiceActive) await startVoice(); else await stopVoice();
});

async function startVoice() {
  voiceBtn.disabled = true;
  try {
    // 1) Fetch ephemeral GA client_secret
    const session = await fetch('/api/realtime-token').then(r => r.json()).catch(() => null);
    const EPHEMERAL_KEY = session?.client_secret?.value;
    const MODEL = session?.model || 'gpt-4o-realtime-preview';
    if (!EPHEMERAL_KEY) {
      setPanel('Realtime error: failed to get client_secret');
      return;
    }

    // 2) RTCPeerConnection + mic
    pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pc.ontrack = (e) => { audioEl.srcObject = e.streams[0]; };

    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
    } catch {
      setPanel('Microphone permission denied or unavailable');
      await stopVoice();
      return;
    }

    // 3) Offer + wait for full ICE gathering
    const offer = await pc.createOffer({ offerToReceiveAudio: true });
    await pc.setLocalDescription(offer);
    await waitForIceGatheringComplete(pc);

    // 4) Open GA Realtime WS with SAME model
    const sdpB64url = btoa(pc.localDescription.sdp)
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    ws = new WebSocket(
      `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(MODEL)}`,
      [
        'realtime',
        'openai-insecure-api-key.' + EPHEMERAL_KEY,
        'openai-sdp.' + sdpB64url
      ]
    );

    ws.onopen = () => {
      // 5) Optional: set voice + audio formats (safe to omit if defaults suit you)
      ws.send(JSON.stringify({
        type: 'session.update',
        session: {
          voice: 'alloy',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16'
        }
      }));
    };

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'webrtc.sdp_answer' && msg.sdp) {
          const sdp = atob(msg.sdp);
          await pc.setRemoteDescription({ type: 'answer', sdp });
        }

        if (msg.type === 'response.output_text.delta' && typeof msg.delta === 'string') {
          appendPanel(msg.delta);
        }

        if (msg.type === 'error') {
          console.error('[Realtime error]', msg);
          appendPanel(`\n\n[Realtime error] ${msg.error?.message || ''}`);
        }
      } catch (e) {
        console.error('WS parse error', e);
      }
    };

    ws.onerror = (e) => console.error('WS error', e);
    ws.onclose = () => console.log('WS closed');

    voiceActive = true;
    voiceBtn.textContent = '⏹ Stop';
  } catch (err) {
    console.error('startVoice failed:', err);
    await stopVoice();
  } finally {
    voiceBtn.disabled = false;
  }
}

async function stopVoice() {
  voiceBtn.disabled = true;
  try {
    if (ws && ws.readyState === WebSocket.OPEN) ws.close();
    ws = null;

    if (pc) {
      pc.getSenders()?.forEach(s => s.track && s.track.stop());
      pc.getReceivers()?.forEach(r => r.track && r.track.stop());
      pc.close();
      pc = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      localStream = null;
    }
    if (audioEl) audioEl.srcObject = null;

    voiceActive = false;
    voiceBtn.textContent = '🎤 Voice';
  } finally {
    voiceBtn.disabled = false;
  }
}

function waitForIceGatheringComplete(pc) {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') return resolve();
    const check = () => {
      if (pc.iceGatheringState === 'complete') {
        pc.removeEventListener('icegatheringstatechange', check);
        resolve();
      }
    };
    pc.addEventListener('icegatheringstatechange', check);
    setTimeout(() => { pc.removeEventListener('icegatheringstatechange', check); resolve(); }, 4000);
  });
}

// Clean up on page hide/unload
window.addEventListener('visibilitychange', () => { if (document.hidden && voiceActive) stopVoice(); });
window.addEventListener('beforeunload', () => { if (voiceActive) stopVoice(); });
