// /js/sheet-listings.js
(() => {
  // ---- CONFIG ----
  const SHEET_ID = "1fy-ZztZlhwgfz1wH8YGji2zuiiEfV88XyCRBDzLB1AA"; // <— yours
  const GID = 9; // <— your tab
  const GVIZ = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${GID}`;

  const container = document.querySelector('#container');      // where tiles go
  const scene      = document.querySelector('a-scene');
  let   stageModel = document.querySelector('#stage-model');   // where model spawns

  if (!container) {
    console.warn('[sheet-listings] #container not found.');
    return;
  }
  if (!stageModel) {
    stageModel = document.createElement('a-entity');
    stageModel.setAttribute('id', 'stage-model');
    stageModel.setAttribute('position', '0 1.2 -1.5');
    scene.appendChild(stageModel);
  }

  // Helpers
  const parseVec3 = (s, dflt) => {
    if (!s || typeof s !== 'string') return dflt;
    const parts = s.trim().split(/\s+/).map(Number).filter(n => !isNaN(n));
    return parts.length === 3 ? parts.join(' ') : dflt;
  };

  const spawnModel = (opts) => {
    const { url, scale, rotation, position } = opts;
    if (!url) return;

    // Clear previous (optional small pop animation)
    stageModel.removeAttribute('gltf-model');
    stageModel.setAttribute('scale', '0.001 0.001 0.001');

    // Apply transform hints
    if (position) stageModel.setAttribute('position', position);
    if (rotation) stageModel.setAttribute('rotation', rotation);
    if (scale)    stageModel.setAttribute('scale',    scale);

    // Set model
    stageModel.setAttribute('gltf-model', url);
    stageModel.setAttribute('animation__pop', 'property: scale; to: 1 1 1; dur: 250; easing: easeOutCubic');

    // Basic shadow setup (works if you enable shadows on lights/renderer)
    stageModel.setAttribute('shadow', 'cast: true; receive: false');

    // Feedback
    stageModel.addEventListener('model-loaded', () => {
      console.log('[sheet-listings] model-loaded:', url);
    }, { once: true });
    stageModel.addEventListener('model-error', (e) => {
      console.warn('[sheet-listings] model-error', e.detail);
    }, { once: true });
  };

  // Ensure rays can hit tiles (mouse + VR)
  const mouseRay = document.querySelector('#mouseRay');
  const headCursor = document.querySelector('#player a-cursor');
  mouseRay?.setAttribute('raycaster', 'objects: [link], .clickable');
  headCursor?.setAttribute('raycaster', 'objects: [link], .clickable');

  // Fetch GViz JSON
  fetch(GVIZ)
    .then(r => r.text())
    .then(txt => {
      const json = JSON.parse(txt.substring(txt.indexOf('{'), txt.lastIndexOf(')')));
      const rows = json.table.rows || [];
      const header = (json.table.cols || []).map(c => (c.label || '').trim().toLowerCase());

      const idx = {
        title: header.indexOf('title'),
        image: header.indexOf('image'),
        link: header.indexOf('link'),
        model: header.indexOf('model'),
        modelScale: header.indexOf('modelscale'),
        modelRotation: header.indexOf('modelrotation'),
        modelPosition: header.indexOf('modelposition')
      };

      let gridX = 0, gridY = 0, rowCount = 0, colCount = 0;

      for (let r = 1; r < rows.length; r++) {
        const c = rows[r].c || [];
        const title = idx.title >= 0 ? (c[idx.title]?.v || '') : '';
        const image = idx.image >= 0 ? (c[idx.image]?.v || '') : '';
        const link  = idx.link  >= 0 ? (c[idx.link]?.v  || '') : '';
        const model = idx.model >= 0 ? (c[idx.model]?.v || '') : '';

        const modelScale    = parseVec3(idx.modelScale    >= 0 ? (c[idx.modelScale]?.v    || '') : '', '1 1 1');
        const modelRotation = parseVec3(idx.modelRotation >= 0 ? (c[idx.modelRotation]?.v || '') : '', '0 180 0');
        const modelPosition = parseVec3(idx.modelPosition >= 0 ? (c[idx.modelPosition]?.v || '') : '', '');

        // Layout (same spirit as your original)
        const posX = gridX * 2.1;
        const posY = -gridY * 1.3;

        const img = document.createElement('a-image');
        img.classList.add('clickable');
        img.setAttribute('width',  '2');
        img.setAttribute('height', '1');
        img.setAttribute('position', `${posX} ${posY} 0`);
        if (image) img.setAttribute('src', image);
        if (link)  img.setAttribute('link', `href: ${link}`);

        // Label under the tile
        const label = document.createElement('a-entity');
        label.setAttribute('geometry', 'primitive: plane; width: 2; height: 0.2');
        label.setAttribute('material', 'color: #111');
        label.setAttribute('position', '0 -0.6 0');
        label.setAttribute('text', `align: center; value: ${title || ''}`);
        img.appendChild(label);

        // Glow highlight on hover
        const glow = document.createElement('a-plane');
        glow.setAttribute('width', '2.05');
        glow.setAttribute('height', '1.25');
        glow.setAttribute('material', 'shader: flat; color: white');
        glow.setAttribute('position', '0 -0.1 -0.01');
        glow.setAttribute('visible', 'false');
        img.appendChild(glow);

        img.setAttribute('event-set__enter', '_event: mouseenter; _target: .; material.color: #ccc');
        img.setAttribute('event-set__leave', '_event: mouseleave; _target: .; material.color: #fff');

        // When clicked:
        img.addEventListener('click', () => {
          // First: follow the link if present (A-Frame link component handles it).
          // Second: if "Model" column exists, spawn/update the 3D model.
          if (model) {
            spawnModel({
              url: model,
              scale: modelScale,
              rotation: modelRotation,
              position: modelPosition
            });
          }
        });

        container.appendChild(img);

        // grid bookkeeping: 4 cols x 3 rows then new "page" spacing like your original
        gridX++; colCount++;
        if (gridX === 4) { gridX = 0; gridY++; rowCount++; }
        if (rowCount === 3) {
          gridY -= 20; // push next "page" far below (your pattern)
          rowCount = 0;
        }
      }
    })
    .catch(err => console.warn('[sheet-listings] fetch error', err));
})();
