// client.js — Chat (SSE-ish) + Realtime Voice (WebRTC) — robust edition

// ===============
// Boot sequence
// ===============
let scene = null;
let chatText = null;
let promptInput = null;
let sendBtn = null;
let voiceBtn = null;
let audioEl = null;

// Buffer any UI text updates until scene + #chatText exist
let pendingPanelText = '';

function setPanel(text) {
  const t = (text || '').slice(-8000);
  if (chatText) {
    // A-Frame text component
    chatText.setAttribute('text', 'value', t);
  } else {
    pendingPanelText = t;
  }
}
function appendPanel(chunk) {
  if (!chunk) return;
  const current = chatText?.getAttribute('text')?.value || pendingPanelText || '';
  setPanel(current + chunk);
}

// Wait for DOM + <a-scene> loaded (A-Frame done)
function whenSceneReady() {
  return new Promise((resolve) => {
    const onDom = () => {
      scene = document.querySelector('a-scene');
      if (!scene) return resolve(); // page without a scene: resolve anyway
      if (scene.hasLoaded) return resolve();
      scene.addEventListener('loaded', resolve, { once: true });
    };
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', onDom, { once: true });
    } else {
      onDom();
    }
  });
}

(async () => {
  await whenSceneReady();

  // Now it is safe to query scene children
  chatText = document.querySelector('#chatText');
  promptInput = document.querySelector('#prompt');
  sendBtn = document.querySelector('#send');
  voiceBtn = document.querySelector('#voice');
  audioEl = document.querySelector('#assistantAudio');

  // iOS playback friendliness
  if (audioEl) {
    audioEl.autoplay = true;
    audioEl.playsInline = true;
    audioEl.muted = false;
  }

  // Flush any buffered panel text
  if (pendingPanelText && chatText) {
    chatText.setAttribute('text', 'value', pendingPanelText);
    pendingPanelText = '';
  }

  // Wire events if elements exist
  if (sendBtn) sendBtn.addEventListener('click', sendPrompt);
  if (promptInput) {
    promptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendPrompt();
    });
  }
  if (voiceBtn) {
    voiceBtn.addEventListener('click', async () => {
      if (!voiceActive) await startVoice(); else await stopVoice();
    });
  }

  // Nice initial hint
  if (!pendingPanelText && chatText) {
    setPanel('Hello! Type below or use the mic.\n');
  }
})().catch((e) => {
  console.error('Boot error:', e);
  setPanel(`Boot error: ${e?.message || e}`);
});

// ============================
// Streaming Chat over fetch()
// ============================
let chatAbortController = null;
let sending = false;

async function sendPrompt() {
  if (!promptInput || !sendBtn) return;

  const prompt = promptInput.value.trim();
  if (!prompt || sending) return;

  if (chatAbortController) chatAbortController.abort();
  chatAbortController = new AbortController();
  sending = true;
  sendBtn.disabled = true;

  promptInput.value = '';
  let buf = `You: ${prompt}\n\nAssistant: `;
  setPanel(buf + '…');

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal: chatAbortController.signal
    });

    if (!res.ok || !res.body) {
      const errText = await res.text().catch(() => 'Unknown error');
      setPanel(`Error ${res.status}: ${errText}`);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let partial = '';

    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      partial += decoder.decode(value, { stream: true });

      // Support both raw text streaming and SSE-style "data: {...}"
      const lines = partial.split('\n');
      partial = lines.pop() || '';

      for (const line of lines) {
        if (!line) continue;

        // SSE line
        if (line.startsWith('data: ')) {
          const payload = line.slice(6).trim();
          if (!payload || payload === '[DONE]') continue;
          try {
            const evt = JSON.parse(payload);
            if (evt.type === 'response.output_text.delta' && typeof evt.delta === 'string') {
              buf += evt.delta;
              setPanel(buf);
            } else if (typeof evt.text === 'string') {
              // Fallback
              buf += evt.text;
              setPanel(buf);
            }
          } catch {
            // ignore bad/incomplete chunks
          }
          continue;
        }

        // Raw text line
        buf += line;
        setPanel(buf);
      }
    }
  } catch (e) {
    if (e.name !== 'AbortError') setPanel(`Network error: ${e.message || e}`);
  } finally {
    chatAbortController = null;
    sending = false;
    if (sendBtn) sendBtn.disabled = false;
  }
}

// ===================================
// Realtime Voice via WebRTC (OpenAI)
// ===================================
const REALTIME_MODEL = 'gpt-realtime';

let pc = null;
let ws = null;
let localStream = null;
let voiceActive = false;

function b64urlEncode(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
}
function b64urlDecode(b64url) {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  return atob(b64);
}

async function startVoice() {
  if (!window.RTCPeerConnection) {
    setPanel('WebRTC not supported in this browser.');
    return;
  }
  if (!voiceBtn) return;
  voiceBtn.disabled = true;

  try {
    // 1) Fetch ephemeral realtime token (your server must allow this in CSP)
    const tokenRes = await fetch('/api/realtime-token');
    let tokenJson = null;
    try { tokenJson = await tokenRes.json(); } catch {}
    if (!tokenRes.ok) {
      const errText = await tokenRes.text().catch(() => '');
      setPanel(`Realtime token error ${tokenRes.status}: ${errText}`);
      return;
    }
    const EPHEMERAL_KEY = tokenJson?.client_secret?.value || tokenJson?.value;
    if (!EPHEMERAL_KEY) {
      setPanel('Realtime error: token missing "value".');
      return;
    }

    // 2) RTCPeerConnection + mic
    pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pc.ontrack = (e) => { if (audioEl) audioEl.srcObject = e.streams[0]; };
    pc.onconnectionstatechange = () => console.log('PeerConnection:', pc.connectionState);

    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
    } catch {
      setPanel('Microphone permission denied or unavailable.');
      await stopVoice();
      return;
    }

    // 3) Create offer and include ICE candidates (better interop)
    const offer = await pc.createOffer({ offerToReceiveAudio: true });
    await pc.setLocalDescription(offer);
    await waitForIceGatheringComplete(pc);

    // 4) Open Realtime WS with URL-safe base64 SDP
    const sdpB64url = b64urlEncode(pc.localDescription.sdp);
    ws = new WebSocket(
      `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(REALTIME_MODEL)}`,
      [
        'realtime',
        'openai-insecure-api-key.' + EPHEMERAL_KEY,
        'openai-sdp.' + sdpB64url
      ]
    );

    ws.onopen = () => {
      // Session preferences
      ws.send(JSON.stringify({
        type: 'session.update',
        session: {
          type: 'realtime',
          audio: { output: { voice: 'alloy' } }
        }
      }));
    };

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'webrtc.sdp_answer' && msg.sdp) {
          const sdp = b64urlDecode(msg.sdp);
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
    if (voiceBtn) voiceBtn.textContent = '⏹ Stop';
  } catch (err) {
    console.error('startVoice failed:', err);
    await stopVoice();
  } finally {
    if (voiceBtn) voiceBtn.disabled = false;
  }
}

async function stopVoice() {
  if (voiceBtn) voiceBtn.disabled = true;
  try {
    if (ws && ws.readyState === WebSocket.OPEN) ws.close();
    ws = null;

    if (pc) {
      try { pc.getSenders()?.forEach(s => s.track && s.track.stop()); } catch {}
      try { pc.getReceivers()?.forEach(r => r.track && r.track.stop()); } catch {}
      try { pc.close(); } catch {}
      pc = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      localStream = null;
    }
    if (audioEl) audioEl.srcObject = null;

    voiceActive = false;
    if (voiceBtn) voiceBtn.textContent = '🎤 Voice';
  } finally {
    if (voiceBtn) voiceBtn.disabled = false;
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
    setTimeout(() => { // Failsafe for quirky networks
      pc.removeEventListener('icegatheringstatechange', check);
      resolve();
    }, 4000);
  });
}

// Cleanup on page hide/unload
window.addEventListener('visibilitychange', () => { if (document.hidden && voiceActive) stopVoice(); });
window.addEventListener('beforeunload', () => { if (voiceActive) stopVoice(); });
