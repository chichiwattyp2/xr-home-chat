/* build.js — A-Frame 1.7 compatible helpers (with user-gesture AudioContext unlock) */

(function () {
  'use strict';

  if (typeof AFRAME === 'undefined') {
    throw new Error('A-Frame not found; load aframe.min.js first.');
  }

  // Shim getComputedAttribute → getAttribute
  (function () {
    const proto =
      (AFRAME && AFRAME.Entity && AFRAME.Entity.prototype) ||
      (window.ANode && window.ANode.prototype) ||
      HTMLElement.prototype;
    if (proto && !proto.getComputedAttribute) {
      proto.getComputedAttribute = proto.getAttribute;
    }
  })();

  // ================= Audio analyser =================
  let _audioCtx;

  function _newCtx () {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) throw new Error('Web Audio API not supported.');
    return new Ctx();
  }

  function getAudioContext () {
    // Don’t create the context until after the first gesture (see unlocker below).
    if (!_audioCtx) _audioCtx = _newCtx();
    return _audioCtx;
  }

  // Expose a one-shot unlock that you can call from any user gesture (button/click)
  window.__resumeAFrameAudioContext = async function () {
    try {
      if (!_audioCtx) _audioCtx = _newCtx();
      if (_audioCtx.state !== 'running') await _audioCtx.resume();
    } catch (e) { /* ignore */ }
  };

  // Also auto-unlock on the first interaction if possible
  ['pointerdown','touchstart','keydown'].forEach(ev => {
    window.addEventListener(ev, () => {
      window.__resumeAFrameAudioContext();
    }, { once: true, passive: true });
  });

  AFRAME.registerSystem('audioanalyser', {
    init: function () { this._byElement = new Map(); },

    _makeAnalyserFor: function (audioEl, smoothingTimeConstant, fftSize) {
      const ctx = getAudioContext();
      const analyser = ctx.createAnalyser();
      analyser.smoothingTimeConstant = smoothingTimeConstant;
      analyser.fftSize = fftSize;

      if (!audioEl._mediaElementSourceNode) {
        audioEl._mediaElementSourceNode = ctx.createMediaElementSource(audioEl);
        audioEl._mediaElementSourceNode.connect(ctx.destination);
      }
      audioEl._mediaElementSourceNode.connect(analyser);
      return analyser;
    },

    createAnalyser: function (data) {
      if (!data || !data.src) throw new Error('[audioanalyser] Missing `src` (<audio> element).');
      return this._makeAnalyserFor(data.src, data.smoothingTimeConstant, data.fftSize);
    },

    getOrCreateAnalyser: function (data) {
      if (!data || !data.src) throw new Error('[audioanalyser] Missing `src` (<audio> element).');
      const key = data.src;
      if (this._byElement.has(key)) return this._byElement.get(key);
      const analyser = this._makeAnalyserFor(key, data.smoothingTimeConstant, data.fftSize);
      this._byElement.set(key, analyser);
      return analyser;
    }
  });

  AFRAME.registerComponent('audioanalyser', {
    schema: {
      enableBeatDetection: { default: true },
      enableLevels: { default: true },
      enableWaveform: { default: true },
      enableVolume: { default: true },
      fftSize: { default: 2048 },
      smoothingTimeConstant: { default: 0.8 },
      src: { type: 'selector' },   // <audio> element
      unique: { default: false }
    },

    init: function () {
      this.analyser = null;
      this.levels = null;
      this.waveform = null;
      this.volume = 0;
      this.beatCutOff = 0;
      this.beatTime = 0;

      // If the context isn’t running yet, we’ll try again after the first unlock.
      this._retryInit = this.update.bind(this);
      window.addEventListener('aframe-audioctx-ready', this._retryInit, { once: true });
    },

    update: function () {
      const data = this.data;
      if (!data.src) return;

      // If context exists but is still suspended, delay init until it’s running.
      if (_audioCtx && _audioCtx.state !== 'running') {
        // Try again shortly; also the global unlocker will re-call update via event.
        setTimeout(() => this.update(), 120);
        return;
      }

      const analyser = data.unique
        ? this.system.createAnalyser(data)
        : this.system.getOrCreateAnalyser(data);

      this.analyser = analyser;
      this.levels = new Uint8Array(analyser.frequencyBinCount);
      this.waveform = new Uint8Array(analyser.fftSize);
      this.el.emit('audioanalyser-ready', { analyser });
    },

    tick: function () {
      const data = this.data;
      const analyser = this.analyser;
      if (!analyser) return;

      if (data.enableLevels || data.enableVolume) analyser.getByteFrequencyData(this.levels);
      if (data.enableWaveform) analyser.getByteTimeDomainData(this.waveform);

      if (data.enableVolume || data.enableBeatDetection) {
        let sum = 0;
        for (let i = 0; i < this.levels.length; i++) sum += this.levels[i];
        this.volume = sum / this.levels.length;
      }

      if (data.enableBeatDetection) {
        const BEAT_DECAY_RATE = 0.99, BEAT_HOLD = 60, BEAT_MIN = 0.15;
        const volume = this.volume / 255;
        if (!this.beatCutOff) this.beatCutOff = volume;
        if (volume > this.beatCutOff && volume > BEAT_MIN) {
          this.el.emit('audioanalyser-beat');
          this.beatCutOff = volume * 1.5;
          this.beatTime = 0;
        } else {
          if (this.beatTime <= BEAT_HOLD) this.beatTime++;
          else {
            this.beatCutOff *= BEAT_DECAY_RATE;
            this.beatCutOff = Math.max(this.beatCutOff, BEAT_MIN);
          }
        }
      }
    }
  });

  // ============== entity-generator (unchanged) ==============
  AFRAME.registerComponent('entity-generator', {
    schema: { mixin: { default: '' }, num: { default: 10 } },
    init: function () {
      for (let i = 0; i < this.data.num; i++) {
        const e = document.createElement('a-entity');
        if (this.data.mixin) e.setAttribute('mixin', this.data.mixin);
        this.el.appendChild(e);
      }
    }
  });

  // ============== layout (unchanged from previous fixed version) ==============
  AFRAME.registerComponent('layout', {
    schema: {
      columns: { default: 1, min: 0 },
      margin:  { default: 1, min: 0 },
      radius:  { default: 1, min: 0 },
      type:    { default: 'line', oneOf: ['box','circle','cube','dodecahedron','line','pyramid'] }
    },
    init: function () {
      const el = this.el;
      this.children = Array.from(el.children || []);
      this.initialPositions = [];

      const getPos = (t) => {
        const p = (t.object3D && t.object3D.position) ||
                  (t.getAttribute && t.getAttribute('position')) || {x:0,y:0,z:0};
        return [p.x||0, p.y||0, p.z||0];
      };

      this.children.forEach(ch => {
        if (ch.hasLoaded) this.initialPositions.push(getPos(ch));
        else ch.addEventListener('loaded', function onL () {
          ch.removeEventListener('loaded', onL);
          this.initialPositions.push(getPos(ch));
        }.bind(this));
      });

      this._onChildAttached = (evt) => {
        if (evt.detail.el && evt.detail.el.parentNode === el) {
          this.children.push(evt.detail.el);
          this.update();
        }
      };
      this._onChildDetached = (evt) => {
        const i = this.children.indexOf(evt.detail.el);
        if (i !== -1) this.children.splice(i, 1);
        this.update();
      };
      el.addEventListener('child-attached', this._onChildAttached);
      el.addEventListener('child-detached', this._onChildDetached);
    },
    update: function () {
      const children = this.children;
      const data = this.data;
      const el = this.el;

      const sp = (el.object3D && el.object3D.position) ||
                 (el.getAttribute && el.getAttribute('position')) || {x:0,y:0,z:0};

      const start = { x: sp.x||0, y: sp.y||0, z: sp.z||0 };

      let positions;
      switch (data.type) {
        case 'box': positions = getBoxPositions(data, children.length); break;
        case 'circle': positions = getCirclePositions(data, children.length, start); break;
        case 'cube': positions = getCubePositions(data, children.length, start); break;
        case 'dodecahedron': positions = getDodecahedronPositions(data, children.length, start); break;
        case 'pyramid': positions = getPyramidPositions(data, children.length, start); break;
        default: positions = getLinePositions(data, children.length);
      }
      setPositions(children, positions);
    },
    remove: function () {
      const el = this.el;
      el.removeEventListener('child-attached', this._onChildAttached);
      el.removeEventListener('child-detached', this._onChildDetached);
      setPositions(this.children, this.initialPositions);
    }
  });

  function getBoxPositions (data, n) {
    const pos = [], cols = Math.max(1, data.columns), rows = Math.ceil(n / cols);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
      pos.push([c*data.margin, r*data.margin, 0]);
    return pos;
  }
  function getCirclePositions (data, n, s) {
    const pos = [], N = Math.max(1, n);
    for (let i = 0; i < n; i++) {
      const rad = i * (2*Math.PI)/N;
      pos.push([ s.x + data.radius*Math.cos(rad), s.y, s.z + data.radius*Math.sin(rad) ]);
    }
    return pos;
  }
  function getLinePositions (data, n) { return getBoxPositions(Object.assign({}, data, {columns: Math.max(1,n)}), n); }
  function getCubePositions (data, n, s) { return transform([[1,0,0],[0,1,0],[0,0,1],[-1,0,0],[0,-1,0],[0,0,-1]], s, data.radius/2); }
  function getDodecahedronPositions (data, n, s) {
    const PHI=(1+Math.sqrt(5))/2, B=1/PHI, C=2-PHI, NB=-B, NC=-C;
    return transform([[-1,C,0],[-1,NC,0],[0,-1,C],[0,-1,NC],[0,1,C],[0,1,NC],[1,C,0],[1,NC,0],
      [B,B,B],[B,B,NB],[B,NB,B],[B,NB,NB],[C,0,1],[C,0,-1],[NB,B,B],[NB,B,NB],[NB,NB,B],[NB,NB,NB],[NC,0,1],[NC,0,-1]], s, data.radius/2);
  }
  function getPyramidPositions (data, n, s) {
    const SQRT_3=Math.sqrt(3), NEG_SQRT_1_3=-1/Math.sqrt(3), DBL_SQRT_2_3=2*Math.sqrt(2/3);
    return transform([[0,0,SQRT_3+NEG_SQRT_1_3],[-1,0,NEG_SQRT_1_3],[1,0,NEG_SQRT_1_3],[0,DBL_SQRT_2_3,0]], s, data.radius/2);
  }
  function transform (positions, t, scale) {
    const tr=[t.x||0,t.y||0,t.z||0];
    return positions.map(p=>p.map((v,i)=>v*scale+tr[i]));
  }
  function setPositions (els, positions) {
    els.forEach((el,i)=>{const p=positions[i]||positions[positions.length-1]||[0,0,0];
      el.setAttribute('position',{x:p[0]||0,y:p[1]||0,z:p[2]||0});});
  }
})();
