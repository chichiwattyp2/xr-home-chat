/* spotify.js — voice bootstrap + Spotify search/play for A-Frame
   - Injects a one-tap mic enabler and starts annyang from a user gesture
   - Dispatches/handles voice queries
   - Uses shared SpotifyWebApi (provided by your bootstrap that fires `spotify-api-ready`)
   - Plays preview_url in a hidden <audio> and wires it to the audioanalyser
*/

(function () {
  'use strict';

  // ------------------------------
  // Small utilities
  // ------------------------------
  function $(sel, root) { return (root || document).querySelector(sel); }
  function on(el, ev, fn, opts) { el && el.addEventListener(ev, fn, opts); }
  function emit(el, name, detail) { el && el.dispatchEvent(new CustomEvent(name, { detail })); }
  function ensureId(el, base) {
    if (!el.id) el.id = base + '-' + Math.random().toString(36).slice(2, 7);
    return '#' + el.id;
  }

  // ------------------------------
  // Voice bootstrap (mic + annyang)
  // ------------------------------
  function injectVoiceButton() {
    if ($('#start-voice')) return;

    var btn = document.createElement('button');
    btn.id = 'start-voice';
    btn.textContent = '🎤 Enable Voice';
    btn.style.cssText = [
      'position:fixed', 'right:1rem', 'bottom:1rem', 'z-index:9999',
      'padding:.6rem .9rem', 'border:0', 'border-radius:.5rem',
      'background:#222', 'color:#fff', 'cursor:pointer', 'font:500 14px/1.2 system-ui'
    ].join(';');
    document.body.appendChild(btn);

    const clickOnce = async () => {
      // 1) Ask for mic permission explicitly
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(t => t.stop());
        }
      } catch (err) {
        console.error('[voice] microphone permission failed:', err);
        alert('Microphone permission is required for voice commands.');
        return;
      }

      // 2) Start annyang (if present)
      if (window.annyang) {
        try {
          window.annyang.start({ autoRestart: true, continuous: false });
          console.log('[voice] annyang started');
        } catch (e) {
          console.error('[voice] failed to start annyang:', e);
        }
      } else {
        console.warn('[voice] annyang not found; speech disabled.');
      }

      // 3) Best-effort resume WebAudio
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) {
          const ctx = AFRAME && AFRAME.scenes && AFRAME.scenes[0] && AFRAME.scenes[0].systems &&
                      AFRAME.scenes[0].systems.audioanalyser &&
                      AFRAME.scenes[0].systems.audioanalyser._makeAnalyserFor ? null : null;
          // Rely on audioanalyser component to resume; nothing else to do here.
        }
      } catch (e) {}

      btn.removeEventListener('click', clickOnce);
      btn.style.display = 'none';
    };

    btn.addEventListener('click', clickOnce, { once: true });
  }

  // ------------------------------
  // Global voice commands -> event
  // ------------------------------
  function installVoiceCommands() {
    if (!window.annyang) return;
    // Avoid duplicate registration
    if (window.__spotifyVoiceInstalled) return;
    window.__spotifyVoiceInstalled = true;

    const cmds = {
      'play *q': (q) => document && emit(document, 'spotify-voice-query', { query: String(q || '').trim() }),
      'search *q': (q) => document && emit(document, 'spotify-voice-query', { query: String(q || '').trim() })
    };
    window.annyang.addCommands(cmds);
    window.annyang.setLanguage && window.annyang.setLanguage('en-US');
    console.log('[voice] commands installed');
  }

  // ------------------------------
  // A-Frame component: spotify
  // - owns the <audio> element
  // - wires audioanalyser.src to it
  // - searches & plays via SpotifyWebApi when query events arrive
  // ------------------------------
  AFRAME.registerComponent('spotify', {
    schema: {
      analyserEl: { type: 'selector', default: '#analyser' }
    },

    init: function () {
      const el = this.el;
      this.api = null;
      this.audio = new Audio();
      this.audio.preload = 'auto';
      this.audio.crossOrigin = 'anonymous';
      this.audio.playsInline = true;
      this.audio.controls = false;
      this.audio.style.display = 'none';
      document.body.appendChild(this.audio);

      // Give it a stable id so audioanalyser can point to it.
      const audioSel = ensureId(this.audio, 'spotify-audio');

      // Point analyser to our audio element, if an analyser exists.
      const analyserHost = this.data.analyserEl || el;
      try {
        analyserHost.setAttribute('audioanalyser', Object.assign(
          {}, analyserHost.getAttribute('audioanalyser') || {}, { src: audioSel }
        ));
      } catch (e) {
        // If audioanalyser not present on host, add it
        analyserHost.setAttribute('audioanalyser', 'src', audioSel);
      }

      // Get API when bootstrap says it’s ready
      on(document, 'spotify-api-ready', (evt) => {
        this.api = evt.detail && evt.detail.api ? evt.detail.api : null;
        if (!this.api) console.warn('[spotify] Missing API instance in spotify-api-ready detail.');
      });

      // Voice query -> search/play
      this._onVoice = (evt) => {
        const q = evt && evt.detail && evt.detail.query ? String(evt.detail.query).trim() : '';
        if (!q) return;
        this.searchAndPlay(q);
      };
      on(document, 'spotify-voice-query', this._onVoice);

      // UI + voice setup
      injectVoiceButton();
      installVoiceCommands();

      // If someone clicks the canvas/scene first, also try to start annyang (fallback)
      const unlockOnce = () => {
        if (window.annyang) {
          try { window.annyang.start({ autoRestart: true, continuous: false }); } catch (e) {}
        }
        window.removeEventListener('click', unlockOnce, true);
      };
      window.addEventListener('click', unlockOnce, true);
    },

    remove: function () {
      document.removeEventListener('spotify-voice-query', this._onVoice);
      if (this.audio && this.audio.parentNode) this.audio.parentNode.removeChild(this.audio);
    },

    // --------------------------
    // Core logic: search & play
    // --------------------------
    searchAndPlay: async function (query) {
      const el = this.el;
      emit(el, 'spotify-search', { query });

      try {
        // Prefer your shared SpotifyWebApi if available.
        const api = this.api || window.spotifyApi;
        if (!api || !api.searchTracks) {
          throw new Error('Spotify API not ready. (Did spotify-api-ready fire?)');
        }

        const res = await api.searchTracks(query, { limit: 10 });
        const items = (res && res.tracks && res.tracks.items) ? res.tracks.items : [];

        // Choose first track with a preview_url
        const track = items.find(t => t && t.preview_url) || items[0];
        if (!track || !track.preview_url) {
          throw new Error('No track with a preview available for: ' + query);
        }

        // Load & play preview
        this.audio.src = track.preview_url;
        try { await this.audio.play(); } catch (e) {
          // Needs a user gesture? The voice button click should have satisfied this,
          // but log just in case.
          console.warn('[spotify] Autoplay rejected; waiting for a user gesture.', e);
        }

        emit(el, 'spotify-track', { track });
        emit(el, 'spotify-play', { query, track });

        console.log('[spotify] Now playing:', track.name, '—', track.artists.map(a => a.name).join(', '));
      } catch (err) {
        console.error('[spotify] search/play failed:', err);
        emit(this.el, 'spotify-error', { error: String(err && err.message || err) });
      }
    }
  });

  // ------------------------------
  // Optional: small helper component
  // Lets you say <a-entity spotify-search> and it will re-emit clicks as a dummy query
  // (Useful for quick testing on mobile: tap mouth, it plays a default track)
  // ------------------------------
  AFRAME.registerComponent('spotify-search', {
    schema: { defaultQuery: { type: 'string', default: 'Daft Punk Harder Better' } },

    init: function () {
      this.el.setAttribute('tabindex', '0'); // make it focusable/clickable
      this._onClick = () => emit(document, 'spotify-voice-query', { query: this.data.defaultQuery });
      this.el.addEventListener('click', this._onClick);
      this.el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') this._onClick(); });
    },

    remove: function () {
      this.el.removeEventListener('click', this._onClick);
    }
  });

})();
