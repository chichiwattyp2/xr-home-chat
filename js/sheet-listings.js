// public/js/sheet-listings.js
(() => {
  // ---- CONFIG ----
  const SHEET_ID = "1fy-ZztZlhwgfz1wH8YGji2zuiiEfV88XyCRBDzLB1AA"; // <- your sheet
  const GID = 9; // <- tab gid to read (images + optional model columns)
  const GVIZ = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${GID}`;

  const container = document.querySelector('#container');
  if (!container) {
    console.warn('[sheet-listings] #container not found, skipping.');
    return;
  }

  // tiny encoder (same as your old one)
  const encodeHtml = (str) => String(str ?? '')
    .replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));

  fetch(GVIZ)
    .then(r => r.text())
    .then(txt => {
      // strip GViz wrapper
      const json = JSON.parse(txt.substring(txt.indexOf('{'), txt.lastIndexOf(')')));
      const rows = json.table?.rows || [];
      if (!rows.length) return;

      // Assume header in first row
      for (let i = 1; i < rows.length; i++) {
        const c = (rows[i].c || []);
        const title = encodeHtml(c[0]?.v ?? '');
        const image = c[1]?.v ?? '';
        const link  = c[2]?.v ?? '';
        const model = c[3]?.v ?? ''; // optional
        const scale = (c[4]?.v ?? '1 1 1');
        const rot   = (c[5]?.v ?? '0 0 0');
        const pos   = (c[6]?.v ?? '0 1 -1');

        // Build a tile
        const img = document.createElement('a-image');
        img.setAttribute('width', '2');
        img.setAttribute('height', '1');
        img.setAttribute('class', 'clickable');
        img.setAttribute('data-raycastable', ''); // so your raycaster sees it
        if (image) img.setAttribute('src', image);
        if (link)  img.setAttribute('link', `href: ${link}`);

        // label
        const label = document.createElement('a-entity');
        label.setAttribute('geometry', 'primitive: plane; width: 2; height: 0.2');
        label.setAttribute('material', 'color: #111');
        label.setAttribute('text', `align: center; value: ${title}`);
        label.setAttribute('position', '0 -0.6 0');
        img.appendChild(label);

        // highlight plane (hover)
        const hi = document.createElement('a-plane');
        hi.setAttribute('width', '2.05');
        hi.setAttribute('height', '1.25');
        hi.setAttribute('material', 'shader: flat; color: white; opacity: 0.0'); // start hidden
        hi.setAttribute('position', '0 -0.1 -0.01');
        img.appendChild(hi);

        // simple hover feedback (works with mouse + cursor raycaster)
        img.addEventListener('mouseenter', () => hi.setAttribute('material', 'shader: flat; color: white; opacity: 0.2'));
        img.addEventListener('mouseleave', () => hi.setAttribute('material', 'shader: flat; color: white; opacity: 0.0'));

        // If the row has a Model URL, clicking this tile loads it
        if (model) {
          img.addEventListener('click', () => {
            const anchor = document.querySelector('#modelAnchor');
            if (!anchor) return;
            // Load/replace model
            anchor.setAttribute('gltf-model', `url(${model})`);
            anchor.setAttribute('scale', scale);
            anchor.setAttribute('rotation', rot);
            anchor.setAttribute('position', pos);
            anchor.setAttribute('visible', 'true');
          });
        }

        container.appendChild(img);

        // layout (similar to your previous grid)
        // 4 per row, 3 rows per page → then jump downwards a bit
        // compute based on number already present
        const idx = container.children.length - 1;
        const col = idx % 4;
        const row = Math.floor(idx / 4) % 3;
        const page = Math.floor(idx / 12);

        const x = (col * 2.1);
        const y = -(row * 1.3) + (page * 20); // Y goes down, page jumps up by 20
        img.setAttribute('position', `${x} ${y} 0`);
      }
    })
    .catch(err => console.error('[sheet-listings] fetch error', err));
})();
