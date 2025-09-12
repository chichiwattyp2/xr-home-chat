
// --- Iridescent shader (simple fresnel-based shimmer) ---
AFRAME.registerShader('iridescent', {
  schema: {
    color1:   {type:'color', default:'#7be2ff'}, // cyan
    color2:   {type:'color', default:'#ff6bd6'}, // magenta
    intensity:{type:'number', default:0.6},
    power:    {type:'number', default:2.0},
    opacity:  {type:'number', default:0.5},
    time:     {type:'number', default:0}
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main(){
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewDir = normalize(-mvPosition.xyz);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform vec3 color1;
    uniform vec3 color2;
    uniform float intensity;
    uniform float power;
    uniform float opacity;
    uniform float time;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main(){
      float fres = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0), power);
      // gentle time shimmer
      float wave = 0.5 + 0.5 * sin(time*0.8 + fres*6.2831);
      vec3 mixCol = mix(color1, color2, wave);
      vec3 finalCol = mixCol * (0.3 + fres) * intensity;
      gl_FragColor = vec4(finalCol, opacity * (0.4 + 0.6*fres));
    }
  `,
  init (data) {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        color1:   {value: new THREE.Color(data.color1)},
        color2:   {value: new THREE.Color(data.color2)},
        intensity:{value: data.intensity},
        power:    {value: data.power},
        opacity:  {value: data.opacity},
        time:     {value: 0}
      },
      transparent: true,
      depthWrite: false
    });
  },
  update (data) {
    this.material.uniforms.color1.value.set(data.color1);
    this.material.uniforms.color2.value.set(data.color2);
    this.material.uniforms.intensity.value = data.intensity;
    this.material.uniforms.power.value = data.power;
    this.material.uniforms.opacity.value = data.opacity;
  },
  tick (t) {
    this.material.uniforms.time.value = t/1000;
  }
});

// --- Product card (glassy + iridescent + hover) ---
AFRAME.registerComponent('product-card', {
  schema: {
    id:     {type:'string', default:''},
    src:    {type:'string', default:''},        // image path e.g. assets/awaken15.png
    name:   {type:'string', default:'Product'},
    price:  {type:'number', default: 0},
    width:  {type:'number', default: 0.5},
    height: {type:'number', default: 0.7},
    opacity:{type:'number', default: 0.7},      // glass opacity
    shimmer:{type:'number', default: 0.6},      // base iridescent intensity
    shimmerHover:{type:'number', default: 0.95} // on-hover intensity
  },

  init () {
    const d = this.data;
    const zImg = 0.01, zText = 0.015, zIri = 0.005;
    const pad = 0.06;

    // Raycaster whitelist + base scale
    this.el.classList.add('ray','shop-card');
    this.el.setAttribute('scale','1 1 1');

    // GLASS PANEL (base)
    const glass = document.createElement('a-entity');
    glass.setAttribute('geometry', `primitive: plane; width: ${d.width}; height: ${d.height}`);
    glass.setAttribute('material', `
      shader: standard; color: #ffffff; metalness: 0.25; roughness: 0.15;
      transparent: true; opacity: ${d.opacity};
    `);
    glass.setAttribute('position', `0 0 0`);
    this.el.appendChild(glass);

    // IRIDESCENT OVERLAY
    const iri = document.createElement('a-entity');
    iri.setAttribute('geometry', `primitive: plane; width: ${d.width}; height: ${d.height}`);
    iri.setAttribute('material', `shader: iridescent; intensity: ${d.shimmer}; opacity: 0.6;`);
    iri.setAttribute('position', `0 0 ${zIri}`);
    this.el.appendChild(iri);
    this._iri = iri;

    // IMAGE
    if (d.src) {
      const imgW = d.width - pad*2;
      const imgH = d.height * 0.58;
      const img = document.createElement('a-image');
      img.setAttribute('src', d.src);
      img.setAttribute('width', `${imgW}`);
      img.setAttribute('height', `${imgH}`);
      img.setAttribute('position', `0 ${d.height*0.08} ${zImg}`);
      img.setAttribute('transparent', true);
      this.el.appendChild(img);
    }

    // NAME
    const name = document.createElement('a-entity');
    name.setAttribute('text', `value: ${d.name}; align: center; color: #e9edf3; width: 2`);
    name.setAttribute('position', `0 ${-d.height*0.26} ${zText}`);
    this.el.appendChild(name);

    // PRICE TAG
    const priceTag = document.createElement('a-entity');
    priceTag.setAttribute('geometry', `primitive: plane; width: ${d.width*0.36}; height: 0.1`);
    priceTag.setAttribute('material', 'color: #0e1218; opacity: 0.85; shader: flat;');
    priceTag.setAttribute('position', `${d.width*0.24 - d.width/2 + 0.02} ${-d.height*0.26} ${zText - 0.001}`);
    const priceText = document.createElement('a-entity');
    priceText.setAttribute('text', `value: $${d.price.toFixed(2)}; align: center; color: #7be2ff; width: 1.6`);
    priceText.setAttribute('position', `0 0 0.001`);
    priceTag.appendChild(priceText);
    this.el.appendChild(priceTag);

    // HOVER ANIMATIONS
    this.el.addEventListener('mouseenter', ()=> {
      this.el.setAttribute('animation__scale', 'property: scale; to: 1.06 1.06 1; dur: 180; easing: easeOutQuad');
      this._iri.setAttribute('material', `shader: iridescent; intensity: ${this.data.shimmerHover}; opacity: 0.7;`);
    });
    this.el.addEventListener('mouseleave', ()=> {
      this.el.setAttribute('animation__scale', 'property: scale; to: 1 1 1; dur: 160; easing: easeOutQuad');
      this._iri.setAttribute('material', `shader: iridescent; intensity: ${this.data.shimmer}; opacity: 0.6;`);
    });

    // CLICK → add to cart
    this.el.addEventListener('click', ()=>{
      const product = {
        id:   this.data.id || this.data.name.toLowerCase().replace(/\s+/g,'-'),
        name: this.data.name,
        price:this.data.price,
        image:this.data.src
      };
      this.el.sceneEl.emit('shop:add', { product });
    });
  }
});

