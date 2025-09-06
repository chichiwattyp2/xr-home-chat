// client.js — Chat (SSE) + Realtime Voice (WebRTC)
// + Canvas → A-Frame texture text rendering (ALL Asimovian)

'use strict';

// ==================
// Canvas text config
// ==================
const CHAT_PLANE_SELECTOR = '#chatTextPlane';   // <a-plane material="src: #chatTextCanvas">
const CHAT_CANVAS_ID      = 'chatTextCanvas';   // <canvas id="chatTextCanvas">
const HINT_CANVAS_ID      = 'chatHintCanvas';   // <canvas id="chatHintCanvas">

// 🔤 Use Asimovian everywhere
const CHAT_FONT_FAMILY    = 'Asimovian';
const HINT_FONT_FAMILY    = 'Asimovian';
const CHAT_FONT_SIZE_PX   = 60;
const HINT_FONT_SIZE_PX   = 44;

// ========= POT helpers (prevents auto-resize spam on three r111) =========
function ensurePOTCanvasSize(canvas, w, h) {
  if (!canvas) return;
  if (canvas.width !== w)  canvas.width  = w;
  if (canvas.height !== h) canvas.height = h;
}
function tuneCanvasTexture(planeEl) {
  // Wait until the mesh exists
  const apply = () => {
    const mesh = planeEl.getObject3D && planeEl.getObject3D('mesh');
    const tex  = mesh && mesh.material && mesh.material.map;
    if (!tex || typeof THREE === 'undefined') return false;

    // Stop WebGL from generating mipmaps / resizing to POT (we already are POT)
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;

    // Also ask material not to use mipmaps
    if (mesh.material) {
      mesh.material.needsUpdate = true;
    }
    return true;
  };

  if (!apply() && planeEl) {
    planeEl.addEventListener('object3dset', () => apply(), { once: true });
  }
}

// ===============
// Boot sequence
// ===============
let scene = null;
let chatText = null;          // fallback <a-entity text> (not used if canvas present)
let promptInput = null;
let sendBtn = null;
let voiceBtn = null;
let audioEl = null;

// Canvas/plane refs
let chatCanvas = null;
let chatPlane  = null;

// Buffer any UI text updates until scene + UI exist
let pendingPanelText = '';

// Draw text into canvas and refresh the A-Frame texture (newline-aware)
function drawTextToCanvas({
  canvas, text, fontFamily, fontSize = 56, color = "#fff",
  bg = null, padding = 28, maxWidth = null, align = "left",
  lineHeight = 1.22, weight = "600"
}) {
  if (!canvas) return;

  // Enforce POT sizes on every draw (guards if DOM changed)
  if (canvas === chatCanvas) ensurePOTCanvasSize(canvas, 1024, 256);
  if (canvas.id === HINT_CANVAS_ID) ensurePOTCanvasSize(canvas, 1024, 128);

  const ctx = canvas.getContext('2d');
  const W = canvas.width  || 1024;
  const H = canvas.height || 256;

  ctx.clearRect(0, 0, W, H);
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H); }

  ctx.fillStyle    = color;
  ctx.textBaseline = 'top';
  ctx.font = `${weight} ${fontSize}px "${fontFamily}", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;

  const usable = (maxWidth ?? (W - padding * 2));

  // Respect explicit newlines, then wrap each paragraph
  const outLines = [];
  const paragraphs = String(text ?? '').replace(/\r/g, '').split('\n');
  for (let pi = 0; pi < paragraphs.length; pi++) {
    const para = paragraphs[pi];
    if (para.length === 0) { outLines.push(''); continue; } // blank line

    const words = para.split(/\s+/);
    let line = '';
    for (const w of words) {
      const candidate = line ? `${line} ${w}` : w;
      if (ctx.measureText(candidate).width > usable) {
        outLines.push(line);
        line = w;
      } else {
        line = candidate;
      }
    }
    if (line) outLines.push(line);
    if (pi !== paragraphs.length - 1) outLines.push('');
  }

  let y = padding;
  for (const l of outLines) {
    let x = padding;
    const lw = ctx.measureText(l).width;
    if (align === 'center') x = (W - lw) / 2;
    if (align === 'right')  x = W - padding - lw;
    ctx.fillText(l, x, y);
    y += fontSize * lineHeight;
    if (y > H - padding - fontSize) break;
  }

  // force texture refresh
  if (chatPlane?.object3D) {
    const mesh = chatPlane.getObject3D('mesh');
    if (mesh?.material?.map) mesh.material.map.needsUpdate = true;
  }
}

// Throttled panel setter (streams smoothly)
let rafPending = false;
let latestPanelText = '';
let lastDrawnText = '';
function setPanelCanvas(text) {
  latestPanelText = (text || '').slice(-8000);
  if (latestPanelText === lastDrawnText) return; // no redraw if same
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    const doDraw = () => {
      drawTextToCanvas({
        canvas:     chatCanvas,
        text:       latestPanelText,
        fontFamily: CHAT_FONT_FAMILY,
        fontSize:   CHAT_FONT_SIZE_PX,
        color:      '#fff',
        align:      'left',
        maxWidth:   (chatCanvas?.width || 1024) - 64
      });
      lastDrawnText = latestPanelText;
    };

    // First run: wait for fonts to avoid blank canvas
    if (setPanelCanvas.firstRun && document.fonts?.ready) {
      setPanelCanvas.firstRun = false;
      document.fonts.ready.then(doDraw);
    } else {
      doDraw();
    }
  });
}
setPanelCanvas.firstRun = true;

// Unified panel API
function setPanel(text) {
  const t = (text || '').slice(-8000);
  if (chatCanvas && chatPlane) {
    setPanelCanvas(t);
  } else if (chatText) {
    chatText.setAttribute('text', 'value', t);
  } else {
    pendingPanelText = t;
  }
}
function appendPanel(chunk) {
  if (!chunk) return;
  const current =
    (chatCanvas ? latestPanelText :
     chatText?.getAttribute('text')?.value) ||
    pendingPanelText || '';
  setPanel(current + chunk);
}

// Wait for DOM + <a-scene>
function whenSceneReady() {
  return new Promise((resolve) => {
    const onDom = () => {
      scene = document.querySelector('a-scene');
      if (!scene) return resolve();           // page without a scene
      if (scene.hasLoaded) return resolve();
      scene.addEventListener('loaded', resolve, { once: true });
    };
    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', onDom, { once: true });
    else onDom();
  });
}

(async () => {
  await whenSceneReady();

  // Query scene/UI elements
  chatText    = document.querySelector('#chatText');           // fallback (not used if canvas exists)
  chatCanvas  = document.getElementById(CHAT_CANVAS_ID);       // canvas
  chatPlane   = document.querySelector(CHAT_PLANE_SELECTOR);   // plane using the canvas
  promptInput = document.querySelector('#prompt');
  sendBtn     = document.querySelector('#send');
  voiceBtn    = document.querySelector('#voice');
  audioEl     = document.querySelector('#assistantAudio');

  // Enforce POT sizes and tune texture
  ensurePOTCanvasSize(chatCanvas, 1024, 256);
  if (chatPlane) tuneCanvasTexture(chatPlane);

  // iOS playback friendliness
  if (audioEl) {
    audioEl.autoplay    = true;
    audioEl.playsInline = true;
    audioEl.muted       = false;
  }

  // Optional: restrict raycaster for perf if a cursor exists
  try {
    const cursor = document.querySelector('a-cursor');
    if (cursor && !cursor.getAttribute('raycaster')?.objects) {
      cursor.setAttribute('raycaster', 'objects: [data-raycastable]');
    }
  } catch {}

  // Flush any buffered panel text
  if (pendingPanelText) {
    setPanel(pendingPanelText);
    pendingPanelText = '';
  }

  // Wire events
  if (sendBtn) sendBtn.addEventListener('click', sendPrompt);
  if (promptInput) {
    promptInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendPrompt(); });
  }
  if (voiceBtn) {
    voiceBtn.addEventListener('click', async () => { if (!voiceActive) await startVoice(); else await stopVoice(); });
  }

  // One-time hint on secondary canvas (if present)
  const hintCanvas = document.getElementById(HINT_CANVAS_ID);
  if (hintCanvas) {
    ensurePOTCanvasSize(hintCanvas, 1024, 128);
    const drawHint = () => drawTextToCanvas({
      canvas:     hintCanvas,
      text:       'Type below or press mic',
      fontFamily: HINT_FONT_FAMILY,
      fontSize:   HINT_FONT_SIZE_PX,
      color:      '#9ad',
      align:      'left',
      maxWidth:   (hintCanvas.width || 1024) - 56
    });
    if (document.fonts?.ready) document.fonts.ready.then(drawHint); else drawHint();

    // If you also mapped hintCanvas to a plane, tune it too:
    const hintPlane = document.querySelector('#chatHintPlane');
    if (hintPlane) tuneCanvasTexture(hintPlane);
  }

  // Initial text
  setPanel('Hello! Type below or use the mic.\n');
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

  // Seed with assistant on a NEW line (visually separated)
  let buf = `You: ${prompt}\nAssistant:\n`;
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

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let partial   = '';

    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      partial += decoder.decode(value, { stream: true });

      // Robust SSE parsing: only "data:" payloads; ignore comments / event lines
      const lines = partial.split('\n');
      partial = lines.pop() || '';

      for (const raw of lines) {
        if (!raw) continue;
        const line = raw.trimStart();

        // Ignore keep-alive comments and named event lines
        if (line.startsWith(':')) continue;
        if (line.startsWith('event:')) continue;
        if (!line.startsWith('data:')) continue;

        const payload = line.slice(5).trim(); // after "data:"
        if (!payload || payload === '[DONE]') continue;

        try {
          const evt = JSON.parse(payload);

          if (evt.type === 'response.output_text.delta' && typeof evt.delta === 'string') {
            buf += evt.delta;
            setPanel(buf);
          } else if (evt.type === 'response.delta' && evt?.response?.output_text?.delta) {
            buf += String(evt.response.output_text.delta);
            setPanel(buf);
          } else if (typeof evt.text === 'string') {
            buf += evt.text;
            setPanel(buf);
          }
        } catch {
          // ignore malformed/incomplete chunks
        }
      }
    }

    // Add a trailing newline to separate turns
    buf += '\n';
    setPanel(buf);

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
  if (!window.RTCPeerConnection) { setPanel('WebRTC not supported in this browser.'); return; }
  if (!voiceBtn) return;
  voiceBtn.disabled = true;

  try {
    // 1) Fetch ephemeral realtime token
    const tokenRes = await fetch('/api/realtime-token');
    let tokenJson = null;
    try { tokenJson = await tokenRes.json(); } catch {}
    if (!tokenRes.ok) {
      const errText = await tokenRes.text().catch(() => '');
      setPanel(`Realtime token error ${tokenRes.status}: ${errText}`);
      return;
    }
    const EPHEMERAL_KEY = tokenJson?.client_secret?.value || tokenJson?.value;
    if (!EPHEMERAL_KEY) { setPanel('Realtime error: token missing "value".'); return; }

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

    // 3) Create offer and include ICE candidates
    const offer = await pc.createOffer({ offerToReceiveAudio: true });
    await pc.setLocalDescription(offer);
    await waitForIceGatheringComplete(pc);

    // 4) Open Realtime WS with URL-safe base64 SDP
    const sdpB64url = b64urlEncode(pc.localDescription.sdp);
    ws = new WebSocket(
      `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(REALTIME_MODEL)}`,
      ['realtime', 'openai-insecure-api-key.' + EPHEMERAL_KEY, 'openai-sdp.' + sdpB64url]
    );

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'session.update',
        session: { type: 'realtime', audio: { output: { voice: 'alloy' } } }
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
          const m = msg.error?.message || JSON.stringify(msg);
          console.error('[Realtime error]', m, msg);
          appendPanel(`\n\n[Realtime error] ${m}`);
        }
      } catch (e) {
        console.error('WS parse error', e);
      }
    };

    ws.onerror = (e) => console.error('WS error', e);
    ws.onclose  = (e) => {
      console.log('WS closed', e?.code, e?.reason || '');
      if (e?.reason) appendPanel(`\n\n[Realtime closed] ${e.reason}`);
    };

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
    const onChange = () => {
      if (pc.iceGatheringState === 'complete') {
        pc.removeEventListener('icegatheringstatechange', onChange);
        resolve();
      }
    };
    pc.addEventListener('icegatheringstatechange', onChange);
    setTimeout(() => { pc.removeEventListener('icegatheringstatechange', onChange); resolve(); }, 4000);
  });
}

// Cleanup on page hide/unload
window.addEventListener('visibilitychange', () => { if (document.hidden && voiceActive) stopVoice(); });
window.addEventListener('beforeunload', () => { if (voiceActive) stopVoice(); });
