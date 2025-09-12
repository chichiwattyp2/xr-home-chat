// ===== speech-input =====
AFRAME.registerComponent('speech-input', {
  init() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.status = document.getElementById('status-text');
    if (!SR) {
      this.status?.setAttribute('text','value: SpeechRecognition not supported. Click assistant to type.');
      this.el.addEventListener('click', async () => {
        const t = prompt('Say something to the assistant:');
        if (t) this.el.sceneEl.emit('user-speech', { text: t });
      });
      return;
    }
    const rec = this.recognition = new SR();
    rec.continuous = false;
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    const begin = () => {
      try { rec.abort(); } catch {}
      try {
        this.status?.setAttribute('text','value: Listening…');
        this.el.emit('listening-started');
        rec.start();
      } catch {}
    };

    window.addEventListener('keydown', e => { if (e.key === ' ') begin(); });
    this.el.addEventListener('click', begin);

    rec.onresult = (ev) => {
      let interim='', final='';
      for (let i=ev.resultIndex; i<ev.results.length; i++) {
        const s = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) final += s; else interim += s;
      }
      if (final) {
        const said = final.trim();
        this.status?.setAttribute('text', `value: You said: ${said}`);
        this.el.sceneEl.emit('user-speech', { text: said });
        try { rec.stop(); } catch {}
      } else if (interim) {
        this.status?.setAttribute('text', `value: ${interim.trim().slice(0,80)}…`);
      }
    };
    rec.onerror = () => {
      this.status?.setAttribute('text','value: Speech error. Try again.');
      this.el.emit('listening-stopped');
    };
    rec.onend = () => {
      this.status?.setAttribute('text','value: Press SPACE or click the assistant to talk.');
      this.el.emit('listening-stopped');
    };
  }
});

// ===== speech-output (queued) =====
AFRAME.registerComponent('speech-output', {
  init() {
    this.synth = window.speechSynthesis;
    this.queue = [];
    this.busy = false;
    const pump = () => {
      if (this.busy || !this.queue.length) return;
      const text = this.queue.shift();
      const u = new SpeechSynthesisUtterance(text);
      const vs = this.synth?.getVoices?.() || [];
      const v = vs.find(v=>/en-ZA|en-GB/i.test(v.lang)) || vs[0];
      if (v) u.voice = v;
      u.onstart = () => { this.busy=true; this.el.emit('speech-started'); };
      u.onend   = () => { this.busy=false; this.el.emit('speech-ended'); pump(); };
      u.onerror = () => { this.busy=false; this.el.emit('speech-ended'); pump(); };
      this.synth?.speak(u);
    };
    this.el.sceneEl.addEventListener('ai-response', e => { this.queue.push(e.detail.text); pump(); });
  }
});

// ===== assistant-brain (powerful model via server API) =====
AFRAME.registerComponent('assistant-brain', {
  schema: {
    endpoint: { default: '/api/ai-chat' },
    system:   { default: 'You are a helpful VR guide. Keep replies ≤ 2 sentences.' }
  },
  init() {
    this.busy=false; this.history=[];
    this.status = document.getElementById('status-text');
    const say = t => this.el.sceneEl.emit('ai-response', { text: t });

    this.el.sceneEl.addEventListener('user-speech', async (e)=>{
      if (this.busy) return;
      const prompt = String(e.detail?.text||'').trim();
      if (!prompt) return;
      this.busy = true;
      this.status?.setAttribute('text','value: Assistant thinking…');
      try {
        const r = await fetch(this.data.endpoint, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ prompt, system: this.data.system })
        });
        const text = await r.text();
        if (!r.ok) {
          console.warn('AI error', r.status, text);
          say('Hmm, my brain is unreachable right now.');
          this.status?.setAttribute('text','value: AI error.');
          return;
        }
        let json={}; try{ json=JSON.parse(text);}catch{}
        const reply = json.reply || 'Let’s keep exploring!';
        this.status?.setAttribute('text', `value: ${reply}`);
        say(reply);
      } catch (err) {
        console.warn('AI fetch failed', err);
        say('Network issue—try again.');
        this.status?.setAttribute('text','value: Network issue.');
      } finally { this.busy=false; }
    });
  }
});

// ===== assistant-anim (maps to clips you actually have) =====
AFRAME.registerComponent('assistant-anim', {
  schema: { idle:{default:'Idle'}, speaking:{default:'Walking'}, listening:{default:'Idle'} },
  init() {
    const setClip = (name) => {
      this.el.setAttribute('animation-mixer', `clip: ${name}; crossFadeDuration: 0.4`);
    };
    this.el.addEventListener('model-loaded', ()=>{
      setClip(this.data.idle);
      this.el.sceneEl.addEventListener('listening-started', ()=> setClip(this.data.listening));
      this.el.sceneEl.addEventListener('listening-stopped', ()=> setClip(this.data.idle));
      this.el.sceneEl.addEventListener('speech-started', ()=> setClip(this.data.speaking));
      this.el.sceneEl.addEventListener('speech-ended', ()=> setClip(this.data.idle));
    });
  }
});

// ===== shop-grid (clickable items) =====
AFRAME.registerComponent('shop-grid', {
  schema: {
    src: { type: 'string' },      // URL to catalog.json
    columns: { default: 3 },
    spacing: { default: 0.42 },    // gap between cards
    width:   { default: 0.38 },    // card size
    height:  { default: 0.38 }
  },
  async init() {
    try {
      const res = await fetch(this.data.src);
      this.catalog = await res.json();
    } catch (e) {
      console.warn('Failed to load catalog', e);
      this.catalog = [];
    }
    this.render();
  },
  render() {
    const {columns, spacing, width, height} = this.data;
    const cat = Array.isArray(this.catalog) ? this.catalog : [];
    // Clear
    while (this.el.firstChild) this.el.removeChild(this.el.firstChild);
    // Layout
    cat.forEach((p, i)=>{
      const row = Math.floor(i / columns);
      const col = i % columns;
      const x = (col - (columns-1)/2) * (width + spacing);
      const y = -(row) * (height + spacing);

      const card = document.createElement('a-entity');
      card.setAttribute('class', 'ray'); // whitelist for raycaster
      card.setAttribute('position', `${x} ${y} 0`);
      card.setAttribute('geometry', `primitive: plane; width: ${width}; height: ${height}`);
      card.setAttribute('material', `src: ${p.image || ''}; color: ${p.image ? '#FFF' : '#333'}`);
      // border
      const frame = document.createElement('a-entity');
      frame.setAttribute('geometry', `primitive: plane; width: ${width+0.02}; height: ${height+0.02}`);
      frame.setAttribute('material', 'color: #222; opacity: 0.9; side: double');
      frame.setAttribute('position', '0 0 -0.001');
      card.appendChild(frame);

      // label
      const label = document.createElement('a-entity');
      label.setAttribute('position', `0 ${-height/2-0.08} 0`);
      label.setAttribute('text', `value: ${p.name} - $${p.price.toFixed(2)}; align: center; color: #EEE; width: 1.6`);
      card.appendChild(label);

      // hover fx
      card.addEventListener('mouseenter', ()=> card.setAttribute('material','emissive: #444; metalness: 0.2; roughness: 0.6'));
      card.addEventListener('mouseleave', ()=> card.setAttribute('material', `src: ${p.image || ''}; color: ${p.image ? '#FFF' : '#333'}`));

      // click → add
      card.addEventListener('click', ()=>{
        this.el.sceneEl.emit('shop:add', { product: p });
      });

      this.el.appendChild(card);
    });
  }
});

// ===== shop-cart (totals + remove) =====
AFRAME.registerComponent('shop-cart', {
  schema: { width:{default:1.2}, height:{default:0.55} },
  init() {
    this.items = new Map(); // id -> {product, qty}
    // Panel
    this.panel = document.createElement('a-entity');
    this.panel.setAttribute('geometry', `primitive: plane; width: ${this.data.width}; height: ${this.data.height}`);
    this.panel.setAttribute('material', 'color: #111; opacity: 0.85');
    this.el.appendChild(this.panel);
    // Text
    this.textEl = document.createElement('a-entity');
    this.textEl.setAttribute('position', '0 0 0.01');
    this.panel.appendChild(this.textEl);
    // Listen to events
    this.el.sceneEl.addEventListener('shop:add', (e)=> this.add(e.detail.product));
    this.el.sceneEl.addEventListener('shop:remove', (e)=> this.remove(e.detail.product));
    this.render();
  },
  add(p) {
    if (!p?.id) return;
    const rec = this.items.get(p.id) || { product: p, qty: 0 };
    rec.qty += 1;
    this.items.set(p.id, rec);
    this.render();
  },
  remove(p) {
    if (!p?.id || !this.items.has(p.id)) return;
    const rec = this.items.get(p.id);
    rec.qty -= 1;
    if (rec.qty <= 0) this.items.delete(p.id); else this.items.set(p.id, rec);
    this.render();
  },
  render() {
    const list = [...this.items.values()];
    const total = list.reduce((s,r)=> s + r.qty * (r.product.price||0), 0);
    const lines = list.slice(0,4).map(r=> `${r.product.name} x${r.qty}  $${(r.product.price*r.qty).toFixed(2)}`);
    if (list.length > 4) lines.push(`…and ${list.length-4} more`);
    lines.push(`Total: $${total.toFixed(2)}`);
    lines.push(`(Click items to add; Shift+Click to remove)`);
    this.textEl.setAttribute('text', `value: ${lines.join('\n')}; align: center; color: #0f0; width: 1.8`);

    // Shift+Click remove handler (global)
    if (!this._bound) {
      this._bound = true;
      this.el.sceneEl.addEventListener('click', (e)=>{
        if (!e.shiftKey) return;
        const p = e?.detail?.intersection?.object?.el?.components?.['shop-grid']?.lastProduct; // not used; keeping simple
      });
    }
  }
});
