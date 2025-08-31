// Reads a Google Sheet via GViz and builds tiles; clicking a tile can spawn a model.
// Columns expected: Title | Image | Link | Model | MScale | MPos | MRot
(function () {
  const SHEET_ID = "1fy-ZztZlhwgfz1wH8YGji2zuiiEfV88XyCRBDzLB1AA";
  const GID = 9; // tab gid
  const GVIZ = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${GID}`;

  const container = document.querySelector('#container'); // where the image tiles go
  const modelMount = document.querySelector('#modelMount');

  if (!container) {
    console.warn('[sheet-listings] #container not found — nothing to render.');
    return;
  }

  function encodeHtml(str) {
    // Keep your original encoder behavior
    const s = String(str || '');
    let out = '';
    for (let i = 0; i < s.length; i++) out += '&#' + s.charCodeAt(i) + ';';
    return out;
  }

  function parseVec3(str, def = [1,1,1]) {
    if (!str) return def;
    const parts = String(str).split(/[ ,x]+/).map(Number).filter(n => !isNaN(n));
    if (parts.length === 3) return parts;
    return def;
  }

  function placeModel(url, scale, pos, rot) {
    if (!modelMount) return;
    // wipe old
    while (modelMount.firstChild) modelMount.removeChild(modelMount.firstChild);
    if (!url) return;

    // Create a new entity with the model
    const e = document.createElement('a-entity');
    e.setAttribute('gltf-model', url);               // remote ok, see CSP + CORS on host
    e.setAttribute('crossorigin', 'anonymous');
    e.setAttribute('position', { x: pos[0], y: pos[1], z: pos[2] });
    e.setAttribute('rotation', { x: rot[0], y: rot[1], z: rot[2] });
    e.setAttribute('scale',    { x: scale[0], y: scale[1], z: scale[2] });
    // Optional: if your model includes animation
    // e.setAttribute('animation-mixer', '');
    modelMount.appendChild(e);
  }

  function addTile({title, image, link, model, mscale, mpos, mrot}, idx) {
    // Build a tile with click handlers. Ensure it's raycastable.
    const aimg = document.createElement('a-image');
    aimg.classList.add('clickable');
    aimg.setAttribute('width',  2);
    aimg.setAttribute('height', 1);
    if (image) aimg.setAttribute('src', image);
    if (link)  aimg.setAttribute('link', `href: ${link}`);
    // Layout like your existing grid (approximate positioning)
    const row = Math.floor(idx / 4);
    const col = idx % 4;
    const x = col * 2.1;
    const y = row * -1.3;
    aimg.setAttribute('position', `${x} ${y} 0`);
    aimg.setAttribute('material', 'shader: flat;'); // keeps it crisp

    // Title plane
    const label = document.createElement('a-entity');
    label.setAttribute('geometry', 'primitive: plane; width: 2; height: 0.2');
    label.setAttribute('material', 'color: #111');
    label.setAttribute('text', `align: center; value: ${encodeHtml(title || '')}`);
    label.setAttribute('position', '0 -0.6 0');
    aimg.appendChild(label);

    // Hover highlight
    const highlight = document.createElement('a-plane');
    highlight.setAttribute('id', `highlight-${idx}`);
    highlight.setAttribute('width',  '2.05');
    highlight.setAttribute('height', '1.25');
    highlight.setAttribute('material', 'shader: flat; color: white');
    highlight.setAttribute('position', '0 -0.1 -0.01');
    highlight.setAttribute('visible', false);
    aimg.appendChild(highlight);

    // Hover effects
    aimg.setAttribute('event-set__enter', `_event: mouseenter; _target: #highlight-${idx}; visible: true`);
    aimg.setAttribute('event-set__leave', `_event: mouseleave;  _target: #highlight-${idx}; visible: false`);

    // Click-to-spawn model (if provided)
    if (model) {
      aimg.addEventListener('click', (ev) => {
        // If you want link to open instead when no modifier, choose behavior:
        // Here we prioritize placing the model on click; hold Alt to open the link.
        if (link && ev && ev.altKey) {
          // Let the link component handle navigation
          return;
        }
        placeModel(model, mscale, mpos, mrot);
      });
    }

    container.appendChild(aimg);
  }

  async function load() {
    let text;
    try {
      const res = await fetch(GVIZ);
      text = await res.text();
    } catch (e) {
      console.error('[sheet-listings] fetch failed:', e);
      return;
    }

    // Parse GViz wrapper
    const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf(')'));
    let data;
    try {
      data = JSON.parse(jsonStr);
    } catch (e) {
      console.error('[sheet-listings] JSON parse failed:', e);
      return;
    }

    const rows = (data && data.table && data.table.rows) || [];
    if (!rows.length) return;

    // Header is first row
    for (let r = 1; r < rows.length; r++) {
      const c = rows[r].c || [];
      const title = c[0]?.v || '';
      const image = c[1]?.v || '';
      const link  = c[2]?.v || '';
      const model = c[3]?.v || ''; // GLB/GLTF URL (must be CORS-enabled)
      const mscale = parseVec3(c[4]?.v, [1,1,1]);
      const mpos   = parseVec3(c[5]?.v, [0,0,0]);
      const mrot   = parseVec3(c[6]?.v, [0,0,0]);

      addTile({ title, image, link, model, mscale, mpos, mrot }, r - 1);
    }
  }

  // Ensure mouse raycaster exists so clicks work in non-VR
  window.addEventListener('DOMContentLoaded', () => {
    const scene = document.querySelector('a-scene');
    if (scene && !document.querySelector('#mouseRay')) {
      const ray = document.createElement('a-entity');
      ray.setAttribute('id', 'mouseRay');
      ray.setAttribute('cursor', 'rayOrigin: mouse');
      ray.setAttribute('raycaster', 'objects: .clickable; far: 50');
      scene.appendChild(ray);
    }
  });

  load();
})();
