// --- Speech input (final-only; debounced) ---
AFRAME.registerComponent('speech-input', {
  init() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const statusText = document.getElementById('status-text');
    if (!SR) { statusText.setAttribute('text','value: SpeechRecognition not supported.'); return; }

    this.recognition = new SR();
    this.recognition.continuous = false;
    this.recognition.lang = 'en-US';
    this.recognition.interimResults = true;  // we show interims, act only on finals
    this.recognition.maxAlternatives = 1;

    this._running = false;
    const begin = () => {
      if (this._running) return;
      try { this.recognition.abort(); } catch(e) {}
      try {
        this._running = true;
        statusText.setAttribute('text','value: Listening…');
        this.el.emit('listening-started');
        this.recognition.start();
      } catch (e) {
        this._running = false;
        statusText.setAttribute('text','value: Mic error. Check permissions.');
        this.el.emit('listening-stopped');
      }
    };

    window.addEventListener('keydown', e => { if (e.key === ' ') begin(); });
    this.el.addEventListener('click', begin);

    this.recognition.onresult = (ev) => {
      let interim = '', final = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const str = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) final += str;
        else interim += str;
      }
      if (final) {
        const said = final.trim();
        statusText.setAttribute('text', `value: You said: ${said}`);
        this.el.sceneEl.emit('user-speech', { text: said });
        try { this.recognition.stop(); } catch(e) {}
      } else if (interim) {
        statusText.setAttribute('text', `value: ${interim.trim().slice(0, 80)}…`);
      }
    };
    this.recognition.onerror = () => {
      this._running = false;
      statusText.setAttribute('text','value: Speech error. Try again.');
      this.el.emit('listening-stopped');
    };
    this.recognition.onend = () => {
      this._running = false;
      statusText.setAttribute('text','value: Press SPACE or click assistant to talk!');
      this.el.emit('listening-stopped');
    };
  }
});

// --- TTS (queued) ---
AFRAME.registerComponent('speech-output', {
  init() {
    this.synth = window.speechSynthesis;
    this.queue = [];
    this.busy = false;

    const pump = () => {
      if (this.busy || !this.queue.length) return;
      const text = this.queue.shift();
      const u = new SpeechSynthesisUtterance(text);
      u.onstart = () => { this.busy = true; this.el.emit('speech-started'); };
      u.onend   = () => { this.busy = false; this.el.emit('speech-ended'); pump(); };
      u.onerror = () => { this.busy = false; this.el.emit('speech-ended'); pump(); };
      // Optional: pick ZA/GB voice if present
      const vs = this.synth.getVoices();
      const choice = vs.find(v => /en-ZA|en-GB/i.test(v.lang)) || vs[0];
      if (choice) u.voice = choice;
      this.synth.speak(u);
    };

    this.el.sceneEl.addEventListener('ai-response', (e) => { this.queue.push(e.detail.text); pump(); });
    if (this.synth && 'onvoiceschanged' in this.synth) {
      this.synth.onvoiceschanged = () => {}; // warm voices
    }
  }
});

// --- LLM brain (calls same-origin API) ---
AFRAME.registerComponent('ai-brain', {
  schema: { endpoint: { default: '/api/vr-assistant' } },
  init() {
    this.history = [];
    this.busy = false;
    const statusText = document.getElementById('status-text');
    const say = (t) => this.el.sceneEl.emit('ai-response', { text: t });

    this.el.sceneEl.addEventListener('user-speech', async (e) => {
      const userText = (e.detail?.text || '').trim();
      if (!userText || this.busy) return;
      this.busy = true;
      statusText.setAttribute('text','value: Assistant thinking…');

      try {
        const res = await fetch(this.data.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ history: this.history, userText })
        });
        if (!res.ok) {
          const t = await res.text();
          console.warn('LLM error:', t);
          say("I'm having trouble reaching my brain right now.");
          return;
        }
        const { reply } = await res.json();
        this.history.push({ role:'user', content:userText }, { role:'assistant', content:reply });
        if (this.history.length > 10) this.history.splice(0, this.history.length - 10);
        statusText.setAttribute('text', `value: ${reply}`);
        say(reply);
      } catch (err) {
        console.warn('LLM fetch failed:', err);
        statusText.setAttribute('text','value: Network issue. Try again.');
        say("Network issue—try me again in a moment.");
      } finally {
        this.busy = false;
      }
    });
  }
});

// --- Animator (maps to clips you actually have; falls back) ---
AFRAME.registerComponent('assistant-anim', {
  schema: { idle:{default:'Idle'}, speaking:{default:'Talking'}, listening:{default:'Listening'} },
  init() {
    this.ready=false; this.clips=[]; this.current=null; this.map={};
    const pick = (pref, fb=[]) => [pref, ...fb].find(n => this.clips.includes(n));
    const setClip = (name) => {
      if (!this.ready || !name || !this.clips.includes(name) || this.current === name) return;
      this.current = name;
      this.el.setAttribute('animation-mixer', `clip: ${name}; crossFadeDuration: 0.4`);
    };
    this.el.addEventListener('model-loaded',(e)=>{
      const m = (e.detail&&e.detail.model) || this.el.getObject3D('mesh');
      const names = [];
      if (Array.isArray(m?.animations)) names.push(...m.animations.map(c=>c.name));
      if (Array.isArray(m?.userData?.gltfAnimations)) names.push(...m.userData.gltfAnimations.map(c=>c.name));
      this.clips = [...new Set(names)];
      console.log('[assistant-anim] available clips:', this.clips);
      this.map = {
        idle:      pick(this.data.idle,      ['Idle','Breathing','Stand','Standing']),
        speaking:  pick(this.data.speaking,  ['Talking','Gestures','Walking','Walk','Idle']),
        listening: pick(this.data.listening, ['Listening','Thinking','Idle'])
      };
      if (!this.map.idle) this.map.idle = this.clips[0];
      this.ready = true;
      setClip(this.map.idle);
      this.el.sceneEl.addEventListener('listening-started', ()=> setClip(this.map.listening || this.map.idle));
      this.el.sceneEl.addEventListener('listening-stopped', ()=> setClip(this.map.idle));
      this.el.sceneEl.addEventListener('speech-started',     ()=> setClip(this.map.speaking || this.map.idle));
      this.el.sceneEl.addEventListener('speech-ended',       ()=> setClip(this.map.idle));
    });
  }
});

// Auto-attach animator on scene load
AFRAME.registerSystem('assistant-attach', {
  init() {
    this.el.addEventListener('loaded', ()=>{
      const npc = this.el.querySelector('#virtual-assistant');
      if (npc && !npc.hasAttribute('assistant-anim')) npc.setAttribute('assistant-anim','');
    });
  }
});

