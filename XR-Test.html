<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>XR-Test</title>

    <!-- A-Frame 1.7.0 -->
    <script src="https://aframe.io/releases/1.7.0/aframe.min.js"></script>

    <!-- Helpers updated for A-Frame 1.7 (audioanalyser + layout fixes) -->
    <script src="spotify/build.js"></script>

    <!-- Spotify Web API JS (only used when you DO have a token) -->
    <script src="https://unpkg.com/spotify-web-api-js/dist/spotify-web-api.js"></script>

    <!-- annyang speech recognition -->
    <script src="spotify/annyang.min.js"></script>
<script src="https://unpkg.com/aframe-play-sound-on-event@1.0.2/dist/aframe-play-sound-on-event.min.js"></script> <script src="https://unpkg.com/aframe-event-set-component@3.0.3/dist/aframe-event-set-component.min.js"></script> <script src="spotify/aframe-dialog-popup-component.js"></script> <script src="https://cdn.jsdelivr.net/gh/donmccurdy/aframe-extras@v6.1.0/dist/aframe-extras.min.js"></script> <script src="https://rawgit.com/donmccurdy/aframe-extras/master/dist/aframe-extras.loaders.min.js"></script>
    <!-- Optional: resume WebAudio on first gesture (Chrome autoplay policy) -->
    <script>
      window.addEventListener('pointerdown', () => {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        try { const ctx = new Ctx(); ctx.resume && ctx.resume(); } catch (e) {}
      }, { once: true });
    </script>

    <!-- Bootstrap: use token flow if present, otherwise demo mode -->
    <script>
    (async () => {
      if (!window.ensureSpotifyAccessToken) {
        console.warn('[bootstrap] No Spotify token flow present; running in demo mode (iTunes fallback).');
        return;
      }
      const token = await window.ensureSpotifyAccessToken();
      if (!token) {
        console.warn('[bootstrap] No Spotify token yet; components will fall back.');
        return;
      }
      window.spotifyApi = new SpotifyWebApi();
      window.spotifyApi.setAccessToken(token);
      document.dispatchEvent(new CustomEvent('spotify-api-ready', {
        detail: { api: window.spotifyApi, token }
      }));
    })();
    </script>

    <!-- Inlined spotify player component (adds artwork, stop(), voice bootstrap) -->
    <script>
    (function () {
      'use strict';

      function $(sel, root) { return (root || document).querySelector(sel); }
      function on(el, ev, fn, opts) { el && el.addEventListener(ev, fn, opts); }
      function emit(el, name, detail) { el && el.dispatchEvent(new CustomEvent(name, { detail })); }
      function ensureId(el, base) { if (!el.id) el.id = base + '-' + Math.random().toString(36).slice(2,7); return '#' + el.id; }

      // Small floating "Enable Voice" button for the browser mic permission.
      function injectVoiceButton() {
        if ($('#start-voice')) return;
        const btn = document.createElement('button');
        btn.id = 'start-voice';
        btn.textContent = '🎤 Enable Voice';
        btn.style.cssText = [
          'position:fixed','right:1rem','bottom:1rem','z-index:9999',
          'padding:.6rem .9rem','border:0','border-radius:.5rem',
          'background:#222','color:#fff','cursor:pointer','font:500 14px/1.2 system-ui'
        ].join(';');
        document.body.appendChild(btn);

        const clickOnce = async () => {
          try {
            if (navigator.mediaDevices?.getUserMedia) {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              stream.getTracks().forEach(t => t.stop());
            }
          } catch (err) {
            console.error('[voice] microphone permission failed:', err);
            alert('Microphone permission is required for voice commands.');
            return;
          }
          if (window.annyang) {
            try { window.annyang.start({ autoRestart: true, continuous: false }); }
            catch (e) { console.error('[voice] failed to start annyang:', e); }
          }
          btn.removeEventListener('click', clickOnce);
          btn.style.display = 'none';
        };
        btn.addEventListener('click', clickOnce, { once: true });
      }

      function installVoiceCommands() {
        if (!window.annyang || window.__spotifyVoiceInstalled) return;
        window.__spotifyVoiceInstalled = true;
        const cmds = {
          'play *q':   (q) => emit(document, 'spotify-voice-query', { query: String(q||'').trim() }),
          'search *q': (q) => emit(document, 'spotify-voice-query', { query: String(q||'').trim() }),
          'stop':      ()  => emit(document, 'spotify-stop', {}),
          'pause':     ()  => emit(document, 'spotify-stop', {})
        };
        window.annyang.addCommands(cmds);
        window.annyang.setLanguage && window.annyang.setLanguage('en-US');
      }

      AFRAME.registerComponent('spotify', {
        schema: { analyserEl: { type: 'selector', default: '#playerHost' } },

        init: function () {
          this.api = null;

          // Hidden <audio> used for playback and for the analyser
          this.audio = new Audio();
          this.audio.preload = 'auto';
          this.audio.crossOrigin = 'anonymous';
          this.audio.playsInline = true;
          this.audio.controls = false;
          this.audio.style.display = 'none';
          document.body.appendChild(this.audio);

          const audioSel = ensureId(this.audio, 'spotify-audio');

          // Point audioanalyser to our hidden <audio>
          const host = this.data.analyserEl || this.el;
          try {
            host.setAttribute('audioanalyser',
              Object.assign({}, host.getAttribute('audioanalyser')||{}, { src: audioSel })
            );
          } catch (e) {
            host.setAttribute('audioanalyser', 'src', audioSel);
          }

          // Wire up API if present
          on(document, 'spotify-api-ready', (evt) => {
            this.api = evt.detail && evt.detail.api ? evt.detail.api : null;
          });

          // Voice input
          this._onVoice = (evt) => {
            const q = evt?.detail?.query ? String(evt.detail.query).trim() : '';
            if (q) this.searchAndPlay(q);
          };
          on(document, 'spotify-voice-query', this._onVoice);

          // Global stop
          on(document, 'spotify-stop', () => this.stop());

          injectVoiceButton();
          installVoiceCommands();

          // Best-effort: unlocking SR on first click helps in some browsers
          const unlockOnce = () => {
            if (window.annyang) { try { window.annyang.start({ autoRestart:true, continuous:false }); } catch (e) {} }
            window.removeEventListener('click', unlockOnce, true);
          };
          window.addEventListener('click', unlockOnce, true);
        },

        remove: function () {
          document.removeEventListener('spotify-voice-query', this._onVoice);
          if (this.audio && this.audio.parentNode) this.audio.parentNode.removeChild(this.audio);
        },

        // Public stop() used by UI + voice
        stop: function () {
          if (this.audio) {
            try { this.audio.pause(); } catch (e) {}
            // keep time (pause) rather than resetting, feels better for Play toggle
          }
          this.el.emit('spotify-stopped', {});
        },

        // Search + play (Spotify when token present, otherwise iTunes preview)
        searchAndPlay: async function (query) {
          const el = this.el;
          this.el.emit('spotify-search', { query });

          try {
            let track = null;

            if (this.api?.searchTracks) {
              const res = await this.api.searchTracks(query, { limit: 10 });
              const items = (res?.tracks?.items) || [];
              const found = items.find(t => t?.preview_url) || items[0];
              if (found && found.preview_url) {
                track = {
                  name: found.name,
                  artists: found.artists || [],
                  preview_url: found.preview_url,
                  artwork: (found.album && found.album.images && found.album.images[0] && found.album.images[0].url) || '',
                  external_urls: found.external_urls || {}
                };
              }
            }

            if (!track) {
              const qEnc = encodeURIComponent(query);
              const resp = await fetch(`https://itunes.apple.com/search?term=${qEnc}&media=music&limit=10`);
              const data = await resp.json();
              const item = (data.results || []).find(r => r.previewUrl) || (data.results || [])[0];
              if (!item || !item.previewUrl) throw new Error('No preview available for: ' + query);
              const art = item.artworkUrl100 ? item.artworkUrl100.replace('100x100', '512x512') : '';
              track = {
                name: item.trackName,
                artists: [{ name: item.artistName }],
                preview_url: item.previewUrl,
                artwork: art,
                external_urls: { spotify: item.trackViewUrl }
              };
            }

            this.audio.src = track.preview_url;
            try { await this.audio.play(); } catch (e) {
              console.warn('[spotify] Autoplay blocked; click the page and try again.', e);
            }

            el.emit('spotify-track', { track });
            el.emit('spotify-play',  { query, track });
          } catch (err) {
            console.error('[spotify] search/play failed:', err);
            el.emit('spotify-error', { error: String(err?.message || err) });
          }
        }
      });

      // === UI Panel built from A-Frame primitives ===
      AFRAME.registerComponent('spotify-panel-ui', {
        schema: {
          width:   { default: 2.4 },
          height:  { default: 1.35 },
          player:  { type: 'selector', default: '#playerHost' }
        },

        init: function () {
          const root = this.el;
          const w = this.data.width, h = this.data.height;

          // Background panel
          const bg = document.createElement('a-plane');
          bg.setAttribute('width',  w);
          bg.setAttribute('height', h);
          bg.setAttribute('color',  '#111');
          bg.setAttribute('material', 'shader: flat; opacity: 0.98');
          root.appendChild(bg);

          // Album art square (left)
          const art = document.createElement('a-plane');
          art.setAttribute('position', `${-w/2 + 0.35} 0 0.01`);
          art.setAttribute('width', '0.9');
          art.setAttribute('height','0.9');
          art.setAttribute('color', '#333');
          art.setAttribute('material', 'shader: flat');
          root.appendChild(art);
          this._art = art;

          // Track title
          const title = document.createElement('a-entity');
          title.setAttribute('text', 'value: —; color: #fff; width: 2.2; anchor: left; baseline: top');
          title.setAttribute('position', `${-w/2 + 0.95} 0.35 0.02`);
          root.appendChild(title);
          this._title = title;

          // Artist line
          const artist = document.createElement('a-entity');
          artist.setAttribute('text', 'value: ; color: #9ad; width: 2.2; anchor: left; baseline: top');
          artist.setAttribute('position', `${-w/2 + 0.95} 0.13 0.02`);
          root.appendChild(artist);
          this._artist = artist;

          // Progress bar track
          const pbTrack = document.createElement('a-plane');
          pbTrack.setAttribute('position', `${-w/2 + 0.95} -0.05 0.02`);
          pbTrack.setAttribute('width', '1.25');
          pbTrack.setAttribute('height','0.03');
          pbTrack.setAttribute('color',  '#222');
          pbTrack.setAttribute('material', 'shader: flat');
          pbTrack.setAttribute('anchor', 'left');
          root.appendChild(pbTrack);

          // Progress bar fill
          const pbFill = document.createElement('a-plane');
          pbFill.setAttribute('position', `${-w/2 + 0.95} -0.05 0.03`);
          pbFill.setAttribute('width', '0.001');
          pbFill.setAttribute('height','0.03');
          pbFill.setAttribute('color',  '#3ddc84');
          pbFill.setAttribute('material', 'shader: flat');
          pbFill.setAttribute('anchor', 'left');
          root.appendChild(pbFill);
          this._pbFill = pbFill;

          // Buttons group (right side)
          const btnX = w/2 - 0.35;

          // Play/Pause circular button
          const playBtn = document.createElement('a-circle');
          playBtn.setAttribute('radius', '0.11');
          playBtn.setAttribute('color',  '#1db954');
          playBtn.setAttribute('material','shader: flat');
          playBtn.setAttribute('position', `${btnX} 0.18 0.03`);
          playBtn.classList.add('ui-interactive');
          root.appendChild(playBtn);

          // Play glyph (triangle)
          const playGlyph = document.createElement('a-triangle');
          playGlyph.setAttribute('color', '#fff');
          playGlyph.setAttribute('material','shader: flat');
          playGlyph.setAttribute('scale', '0.1 0.1 0.1');
          playGlyph.setAttribute('rotation', '0 0 90');
          playGlyph.setAttribute('position', `${btnX} 0.18 0.04`);
          root.appendChild(playGlyph);

          // Stop square button
          const stopBtn = document.createElement('a-circle');
          stopBtn.setAttribute('radius', '0.11');
          stopBtn.setAttribute('color',  '#b00020');
          stopBtn.setAttribute('material','shader: flat');
          stopBtn.setAttribute('position', `${btnX} -0.04 0.03`);
          stopBtn.classList.add('ui-interactive');
          root.appendChild(stopBtn);

          const stopGlyph = document.createElement('a-plane');
          stopGlyph.setAttribute('width', '0.08');
          stopGlyph.setAttribute('height','0.08');
          stopGlyph.setAttribute('color', '#fff');
          stopGlyph.setAttribute('material','shader: flat');
          stopGlyph.setAttribute('position', `${btnX} -0.04 0.04`);
          root.appendChild(stopGlyph);

          // Mic button (triggers demo query prompt or voice)
          const micBtn = document.createElement('a-circle');
          micBtn.setAttribute('radius', '0.11');
          micBtn.setAttribute('color',  '#333');
          micBtn.setAttribute('material','shader: flat');
          micBtn.setAttribute('position', `${btnX} -0.26 0.03`);
          micBtn.classList.add('ui-interactive');
          root.appendChild(micBtn);

          const micGlyph = document.createElement('a-entity');
          micGlyph.setAttribute('text', 'value: 🎤; color: #fff; width: 2; align: center');
          micGlyph.setAttribute('position', `${btnX} -0.26 0.05`);
          root.appendChild(micGlyph);

          // Interactions
          const player = this.data.player || $('#playerHost');
          const getPlayerCmp = () => (player && player.components && player.components.spotify) ? player.components.spotify : null;

          const tryPlayPause = async () => {
            const cmp = getPlayerCmp();
            if (!cmp) return;
            const audio = cmp.audio;
            if (!audio) return;
            if (audio.paused) {
              try { await audio.play(); } catch (e) { console.warn('Autoplay blocked, user gesture required.', e); }
            } else {
              audio.pause();
            }
          };

          playBtn.addEventListener('click', tryPlayPause);
          playGlyph.addEventListener('click', tryPlayPause);

          stopBtn.addEventListener('click', () => document.dispatchEvent(new CustomEvent('spotify-stop')));
          stopGlyph.addEventListener('click', () => document.dispatchEvent(new CustomEvent('spotify-stop')));

          // Mic: if annyang present we just start listening; otherwise prompt user for a quick text query.
          micBtn.addEventListener('click', async () => {
            if (window.annyang) {
              try { window.annyang.start({ autoRestart: true, continuous: false }); } catch (e) {}
              alert('Say: “play <artist or song>”');
            } else {
              const q = prompt('Type a song or artist to play:');
              if (q) document.dispatchEvent(new CustomEvent('spotify-voice-query', { detail: { query: q } }));
            }
          });

          // Track updates -> update UI text + artwork
          const setText = (el, key, value) => {
            const t = el.getAttribute('text') || {};
            t[key] = value;
            el.setAttribute('text', t);
          };

          this._onTrack = (evt) => {
            const t = evt.detail?.track || {};
            const title = t.name || '—';
            const artists = (t.artists || []).map(a => a && a.name ? a.name : '').filter(Boolean).join(', ');
            setText(this._title,  'value', title);
            setText(this._artist, 'value', artists || '');
            const art = t.artwork || t.albumArt || (t.album && t.album.images && t.album.images[0] && t.album.images[0].url) || '';
            if (art) this._art.setAttribute('material', `shader: flat; src: ${art};`);
            else     this._art.setAttribute('material', 'shader: flat; color: #333;');
          };
          player.addEventListener('spotify-track', this._onTrack);

          // Progress update in tick
          this._playerCmpGetter = getPlayerCmp;
        },

        tick: function () {
          const cmp = this._playerCmpGetter && this._playerCmpGetter();
          const audio = cmp && cmp.audio;
          if (!audio || !isFinite(audio.duration) || audio.duration <= 0) {
            this._pbFill && this._pbFill.setAttribute('width', '0.001');
            return;
          }
          const pct = Math.max(0, Math.min(1, audio.currentTime / audio.duration));
          const full = 1.25; // same as pbTrack width
          this._pbFill && this._pbFill.setAttribute('width', (full * pct).toFixed(4));
        },

        remove: function () {
          const player = this.data.player || document.querySelector('#playerHost');
          if (player && this._onTrack) player.removeEventListener('spotify-track', this._onTrack);
        }
      });
    })();
    </script>
     <style>
 html, body {margin:0; height:100%;}
    .ui {position:fixed; inset:0; pointer-events:none; font-family: system-ui, -apple-system, Segoe UI, Roboto, "DM Sans", Arial, sans-serif; z-index: 9999;}
    .topbar {position:absolute; left:0; right:0; top:0; height:56px; display:flex; align-items:center; gap:10px; padding:0 12px; color:#fff; pointer-events:auto;}
    .topbar .glass {backdrop-filter: blur(8px); background: rgba(0,0,0,.35); border-bottom:1px solid rgba(255,255,255,.08);} 
    .brand {display:flex; align-items:center; gap:10px; font-weight:700}
    .brand .logo {width:28px; height:28px; border-radius:6px; background:#000; display:inline-flex; align-items:center; justify-content:center; color:#0bd3ff; font-weight:800}
    .spacer {flex:1}
    .btn {appearance:none; border:1px solid rgba(255,255,255,.15); background: rgba(0,0,0,.5); color:#fff; padding:8px 12px; border-radius:12px; cursor:pointer; pointer-events:auto}
    .panel {position:absolute; right:12px; top:68px; width:360px; max-height:70vh; overflow:auto; background: rgba(10,10,10,.9); border:1px solid rgba(255,255,255,.12); border-radius:16px; color:#eee; padding:12px; display:none; box-shadow: 0 10px 30px rgba(0,0,0,.4); pointer-events:auto}
    .panel.open {display:block}
    .item {display:flex; gap:10px; padding:10px; border-radius:12px; border:1px solid rgba(255,255,255,.12); margin-bottom:10px; align-items:center}
    .item img {width:56px; height:56px; object-fit:cover; border-radius:8px}
    .muted {opacity:.8; font-size:12px}
    .row {display:flex; align-items:center; justify-content:space-between; gap:8px}
    .hint {position:absolute; left:12px; bottom:12px; background: rgba(0,0,0,.55); border:1px solid rgba(255,255,255,.1); color:#ddd; padding:8px 10px; border-radius:10px; font-size:13px} </style>
  </head>


  <body>
  <!-- 2D UI overlay -->
  <div class="ui">
    <div class="topbar glass">
      <div class="brand"><div class="logo">i</div> iLabs Dispensary <span style="font-size:11px; opacity:.8; margin-left:6px">Metaverse</span></div>
      <div class="spacer"></div>
      <button class="btn" id="btnCatalog">Catalog</button>
      <button class="btn" id="btnCart">Cart (<span id="cartCount">0</span>)</button>
      <button class="btn" id="btnVR">Enter VR</button>
    </div>

    <div id="catalog" class="panel"></div>
    <div id="cart" class="panel"></div>
    <div class="hint">Desktop: WASD + mouse to look · Click products to view · VR: use controller to point + trigger</div>
  </div>
     <a-scene renderer="colorManagement: true; physicallyCorrectLights: true;" background="color: #0b0b0b" vr-mode-ui="enabled: true">
      <a-assets>
       
          <img
            id="dawn"
            crossorigin="anonymous"
            src="https://cdn.glitch.com/9f5d1b92-a581-4134-8864-9bd98ff8ed97%2Fdawn.jpeg"
          />

          <a-asset-item
            id="roomer"
            src="https://cdn.glitch.com/9f5d1b92-a581-4134-8864-9bd98ff8ed97%2Fglassedit.glb"
          ></a-asset-item>
        
        
    
      <!-- Font for <a-text> -->
      <a-asset-item id="roboto" src="https://cdn.aframe.io/fonts/Roboto-msdf.json"></a-asset-item>
     
    
       
      </a-assets>
  <!-- Hidden “host” for the player + analyser -->
      <a-entity id="playerHost" audioanalyser spotify position="0 0 0" visible="false"></a-entity>

      <!-- Centered UI panel in front of the camera -->
      <a-entity position="-7.70206 4.78398 8.53435" spotify-panel-ui="" rotation="0 180 0"></a-entity>

       <a-sky src="#dawn"></a-sky>

        <!-- directional light and ambient lighting -->

        <a-entity
          light="color: #ccccff; intensity: 1; type: ambient;"
          visible=""
        ></a-entity>
    

    <!-- 
    <a-entity id="room">
      <a-plane position="0 0 0" rotation="-90 0 0" width="30" height="30" material="src: #floorTex; repeat: 4 4; roughness: 0.9" shadow="receive: true"></a-plane>
      <a-box color="#151515" depth="0.2" height="6" width="30" position="0 3 -15"></a-box>
      <a-box color="#151515" depth="30" height="6" width="0.2" position="-15 3 0"></a-box>
      <a-box color="#151515" depth="30" height="6" width="0.2" position="15 3 0"></a-box>
      <a-box color="#222" depth="0.2" height="0.2" width="30" position="0 6 -15"></a-box>
     
      <a-box color="#0bd3ff" width="6" height="0.2" depth="0.5" position="0 3.5 -7" material="emissive: #0bd3ff; emissiveIntensity: 1.2"></a-box>
    </a-entity>-->
<!--travel-->

<!--<a-entity
        id="dialog"
        position="0 1.2 -4"
        dialog-popup="
          openIconImage: assets/info.jpg;
          closeIconImage: assets/close.jpg;
          title: Welcome To SuperCruisr;
          body: To move around the enviroment: line up the white CIRLCE cursor on your screen with the floating crystals and click or tap.
          to release your cursor on desktop. press the ESC key.;
          "></a-entity>-->
<a-gltf-model src="#roomer" position="47.87792 -11.04427 -10.03337" gltf-model="https://cdn.glitch.com/9f5d1b92-a581-4134-8864-9bd98ff8ed97%2Fglassedit.glb" rotation="0 180 0" scale="1.5 1.5 1.5">
        </a-gltf-model>
<a-entity id="travel">
        <!--  CHECKPOINTS BEGIN -->
        <a-icosahedron
          checkpoint=""
          color="#FF926B"
          radius="0.25"
          position="-2.83815 1.03616 -4.50222"
          material="normalMap: true; roughness: 0; metalness: 0.3;  transparent: true; opacity: 1"
          rotation="0 151.5181857798522 0"
          animation="property: rotation; to: 0 360 0; loop: true; dur: 5000"
          geometry=""
          event-set__enter="_event: mouseenter; _target: #Text; visible: true"
                  event-set__leave="_event: mouseleave; _target: #Text; visible: false">
        <a-text id="Text" value="This is a checkpoint" align="center" color="#FFF" visible="false" position="0 -0.55 0.55"
                geometry="primitive: plane; width: 1.75" material="color: #333"></a-text>
        </a-icosahedron>
       
        <a-icosahedron
          checkpoint=""
          color="#FF926B"
          radius="0.25"
          position="10.38706 4.51096 -15.13568"
          material="normalMap: true; roughness: 0; metalness: 0.3;  transparent: true; opacity: 1"
          rotation="0 155.26644895094998 0"
          animation="property: rotation; to: 0 360 0; loop: true; dur: 5000"
          geometry=""
        ></a-icosahedron>
        <a-icosahedron
          checkpoint=""
          color="#FF926B"
          radius="0.25"
          position="23.23242 6.96579 -4.0634"
          material="normalMap: true; roughness: 0; metalness: 0.3;  transparent: true; opacity: 1"
          rotation="0 155.26644895094998 0"
          animation="property: rotation; to: 0 360 0; loop: true; dur: 5000"
          geometry=""
        ></a-icosahedron>
        <a-icosahedron
          checkpoint=""
          color="#FF926B"
          radius="0.25"
          position="3.97271 6.96579 -10.7524"
          material="normalMap: true; roughness: 0; metalness: 0.3;  transparent: true; opacity: 1"
          rotation="0 155.26644895094998 0"
          animation="property: rotation; to: 0 360 0; loop: true; dur: 5000"
          geometry=""
        ></a-icosahedron>
        <a-icosahedron
          checkpoint=""
          color="#FF926B"
          radius="0.25"
          position="-5.85937 4.97873 -10.7524"
          material="normalMap: true; roughness: 0; metalness: 0.3;  transparent: true; opacity: 1"
          rotation="0 155.26644895094998 0"
          animation="property: rotation; to: 0 360 0; loop: true; dur: 5000"
          geometry=""
        ></a-icosahedron></a-entity>

    <!-- Shelves + Products (procedural via component) -->
    <a-entity id="store" store-builder></a-entity>
    
   <a-entity id="rig" movement-controls="controls: checkpoint" checkpoint-controls="mode: animate" position="0 2.22085 6.6555" rotation="0 0 0">
          <a-camera>
         <a-entity cursor="" position="0.00705 0.04225 -1.70324" geometry="primitive: ring; radiusInner: 0.02; radiusOuter: 0.03" material="shader: flat; color: #CCC" raycaster=""></a-entity></a-camera></a-entity>
    </a-scene>
<script>
  // ---- Product data (replace with live API later) ----
   const PRODUCTS = [
    { id:'awaken-15', name:'Awaken (15ml)', price: 399, category:'Tincture', strength:'1:1 THC:CBD', img:'https://images.unsplash.com/photo-1585386959984-a41552231605?q=80&w=400&auto=format&fit=crop' },
    { id:'awaken-30', name:'Awaken (30ml)', price: 699, category:'Tincture', strength:'1:1 THC:CBD', img:'https://images.unsplash.com/photo-1611077543631-b002bc36fdae?q=80&w=400&auto=format&fit=crop' },
    { id:'traveler-gummy', name:'Traveler Gummies (10pc)', price: 349, category:'Edible', strength:'10mg/pc', img:'https://images.unsplash.com/photo-1600271886742-f049cd451bba?q=80&w=400&auto=format&fit=crop' },
    { id:'big-cookie', name:'Blom Big Cookie (60mg)', price: 129, category:'Edible', strength:'60mg', img:'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=400&auto=format&fit=crop' },
    { id:'neuroplus', name:'NeuroPlus (30ml)', price: 799, category:'Tincture', strength:'CBN:CBD Formula', img:'https://images.unsplash.com/photo-1585238342028-79336f1266c9?q=80&w=400&auto=format&fit=crop' },
    { id:'vape-awaken', name:'Awaken Vape (1g)', price: 599, category:'Vape', strength:'Broad Spec', img:'https://images.unsplash.com/photo-1601972602229-98bfd02f40a1?q=80&w=400&auto=format&fit=crop' }
  ];

  // ---- Cart state ----
  let CART = [];
  const catalogEl = document.getElementById('catalog');
  const cartEl = document.getElementById('cart');
  const cartCount = document.getElementById('cartCount');

  function renderCatalog(){
    catalogEl.innerHTML = '<h3>Catalog</h3>' + PRODUCTS.map(p=>`
      <div class="item">
        <img src="${p.img}" alt="${p.name}"/>
        <div style="flex:1">
          <div style="font-weight:600">${p.name}</div>
          <div class="muted">${p.category} · ${p.strength || ''}</div>
        </div>
        <div class="row">
          <div style="font-weight:700">R ${p.price}</div>
          <button class="btn" data-id="${p.id}">View</button>
        </div>
      </div>`).join('');
    catalogEl.querySelectorAll('button[data-id]').forEach(btn=>btn.addEventListener('click', ()=>{
      const p = PRODUCTS.find(x=>x.id===btn.dataset.id); if(p) openProduct(p);
    }));
  }

  function renderCart(){
    const total = CART.reduce((s,i)=> s + i.price * i.qty, 0);
    cartEl.innerHTML = `<h3>Your Cart</h3>` + (CART.length? CART.map(i=>`
      <div class="item">
        <img src="${i.img}" alt="${i.name}"/>
        <div style="flex:1">
          <div style="font-weight:600">${i.name}</div>
          <div class="muted">Qty: ${i.qty}</div>
        </div>
        <div class="row">
          <div style="font-weight:700">R ${i.price * i.qty}</div>
          <button class="btn" data-remove="${i.id}">Remove</button>
        </div>
      </div>`).join('') : '<div class="muted">Your cart is empty.</div>') +
      `<div class="row" style="margin-top:8px; justify-content:space-between">
        <div style="font-weight:700">Total</div>
        <div style="font-weight:700">R ${total}</div>
      </div>
      <button id="checkout" class="btn" style="width:100%; margin-top:8px">Checkout</button>`;
    cartEl.querySelectorAll('button[data-remove]').forEach(btn=>btn.addEventListener('click', ()=>{
      CART = CART.filter(i=>i.id!==btn.dataset.remove); updateCart();
    }));
    const checkoutBtn = cartEl.querySelector('#checkout');
    if(checkoutBtn) checkoutBtn.addEventListener('click', ()=>{
      alert('Checkout clicked – connect to payment gateway / API.');
    });
  }

  function updateCart(){ cartCount.textContent = CART.reduce((s,i)=> s+i.qty, 0); renderCart(); }
  function addToCart(p){ const ex = CART.find(i=>i.id===p.id); if(ex) ex.qty+=1; else CART.push({...p, qty:1}); updateCart(); }

  // Simple product modal using window.alert for brevity (swap to a nicer modal if you like)
  function openProduct(p){
    const ok = confirm(`${p.name}\n${p.category} • ${p.strength || ''}\nPrice: R ${p.price}\n\nAdd to cart?`);
    if(ok) addToCart(p);
  }

  // Toggle panels
  document.getElementById('btnCatalog').onclick = ()=> catalogEl.classList.toggle('open');
  document.getElementById('btnCart').onclick = ()=> cartEl.classList.toggle('open');
  document.getElementById('btnVR').onclick = ()=> { document.querySelector('a-scene').enterVR(); };

  renderCatalog(); renderCart();

  // ---- A‑Frame custom component to build shelves + products ----
  AFRAME.registerComponent('store-builder', {
    init(){
      const el = this.el;
      // Create three shelves across the back
      const positions = [ -6, 0, 6 ];
      positions.forEach((x)=>{
        const shelf = document.createElement('a-entity');
        shelf.setAttribute('position', `${x} 0 -6`);
        shelf.setAttribute('shelf', 'rows:3; cols:6');
        el.appendChild(shelf);
      });

      // Place products onto shelves
      const shelves = el.querySelectorAll('[shelf]');
      let idx = 0;
      shelves.forEach((shelf)=>{
        for(let i=0;i<12 && idx<PRODUCTS.length;i++){
          const p = PRODUCTS[idx++];
          const product = document.createElement('a-entity');
          product.setAttribute('product-box', `id:${p.id}`);
          product.classList.add('pickable');
          // Grid position on shelf (cols:6, rows:2 effectively since 12 max here)
          const col = i % 6; const row = Math.floor(i/6);
          product.setAttribute('position', `${-2.2 + col*0.88} ${0.7 + row*0.8} 0`);
          // Store product data for click handler
          product.dataset.pid = p.id;
          shelf.appendChild(product);
        }
      });

      // Global click handler for 3D picks
      this.clickHandler = (evt)=>{
        const target = evt.detail && evt.detail.intersectedEl ? evt.detail.intersectedEl : evt.target;
        if(!target) return;
        const pid = target.dataset && target.dataset.pid;
        if(!pid) return;
        const p = PRODUCTS.find(x=>x.id===pid);
        if(p) openProduct(p);
      };
      el.sceneEl.addEventListener('click', this.clickHandler);
    },
    remove(){ this.el.sceneEl.removeEventListener('click', this.clickHandler); }
  });

  // Simple shelf primitive (uprights + planks)
  AFRAME.registerComponent('shelf', {
    schema: { rows:{type:'int', default:3}, cols:{type:'int', default:6} },
    init(){
      const group = document.createElement('a-entity');
      const rows = this.data.rows;
      for(let r=0;r<rows;r++){
        const plank = document.createElement('a-box');
        plank.setAttribute('width', 5.4);
        plank.setAttribute('height', 0.08);
        plank.setAttribute('depth', 0.6);
        plank.setAttribute('color', '#2a2a2a');
        plank.setAttribute('metalness', 0.2);
        plank.setAttribute('roughness', 0.6);
        plank.setAttribute('position', `0 ${0.6 + r*0.8} 0`);
        plank.setAttribute('shadow', 'cast: true; receive: true');
        group.appendChild(plank);
      }
      const high = rows*0.8 + 0.6;
      const mkUp = (x)=>{ const up = document.createElement('a-box'); up.setAttribute('width', 0.08); up.setAttribute('height', high); up.setAttribute('depth', 0.6); up.setAttribute('color', '#2a2a2a'); up.setAttribute('position', `${x} ${high/2} 0`); return up; };
      group.appendChild(mkUp(-2.7));
      group.appendChild(mkUp( 2.7));
      this.el.appendChild(group);
    }
  });

  // Product box with floating label
  AFRAME.registerComponent('product-box', {
    schema: { id: {type:'string'} },
    init(){
      const data = PRODUCTS.find(x=>x.id===this.data.id);
      if(!data){ console.warn('Unknown product id', this.data.id); return; }
      // Box
      const box = document.createElement('a-box');
      box.setAttribute('width', 0.22);
      box.setAttribute('height', 0.32);
      box.setAttribute('depth', 0.12);
      box.setAttribute('color', '#3aa0ff');
      box.setAttribute('metalness', 0.1);
      box.setAttribute('roughness', 0.6);
      box.setAttribute('shadow', 'cast: true');
      this.el.appendChild(box);
      // Label (a-text)
      const label = document.createElement('a-entity');
      label.setAttribute('position', '0 0.35 0');
      const text = document.createElement('a-text');
      text.setAttribute('value', `${data.name}\n${data.strength || data.category}\nR ${data.price}`);
      text.setAttribute('align', 'center');
      text.setAttribute('width', 1.2);
      text.setAttribute('color', '#fff');
      text.setAttribute('anchor', 'center');
      text.setAttribute('font', '#roboto');
      label.appendChild(text);
      this.el.appendChild(label);
      // Save product id for click
      this.el.dataset.pid = data.id;
    }
  });
 
 </script>
    
      
    
  
  </body>
</html>
