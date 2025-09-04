// sheets.js — Load public Google Sheet (GViz) into A-Frame tiles

// Optional: keep your HTML encoder
function encodeHtml(str) {
  var buf = [];
  for (var i = str.length - 1; i >= 0; i--) {
    buf.unshift(["&#", str[i].charCodeAt(), ";"].join(""));
  }
  return buf.join("");
}

// Wait for DOM + <a-scene> loaded (A-Frame components ready)
function whenSceneReady() {
  return new Promise((resolve) => {
    const onDom = () => {
      const scene = document.querySelector('a-scene');
      if (!scene) return resolve();
      if (scene.hasLoaded) return resolve();
      scene.addEventListener('loaded', resolve, { once: true });
    };
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', onDom, { once: true });
    } else {
      onDom();
    }
  });
}

// Parse the GViz wrapper safely
function parseGViz(text) {
  // GViz returns: google.visualization.Query.setResponse(<JSON>);
  const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*?)\);\s*$/);
  if (!match) throw new Error('GViz: unexpected response format');
  return JSON.parse(match[1]);
}

(async function initSheetCatalog() {
  await whenSceneReady();

  const container = document.getElementById('container');
  if (!container) {
    console.warn('[sheets] #container not found; skipping render');
    return;
  }

  // ---- CONFIG ----
  const SHEET_ID = '1fy-ZztZlhwgfz1wH8YGji2zuiiEfV88XyCRBDzLB1AA';
  const GID = 9; // tab gid
  const gvizUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${GID}`;

  // Make sure your CSP allows:
  // - connect-src: https://docs.google.com https://www.googleapis.com
  // - img-src: whatever domains your sheet image URLs use (e.g. https://cdn.glitch.com, etc.)

  let json;
  try {
    const res = await fetch(gvizUrl, { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    json = parseGViz(text);
  } catch (err) {
    console.error('[sheets] fetch/parse error:', err);
    return;
  }

  const rows = json?.table?.rows || [];
  if (!rows.length) return;

  // Assume header row exists with: Title | Image | Link
  const listings = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r].c || [];
    const title = cells[0]?.v ?? '';
    const image = cells[1]?.v ?? '';
    const link  = cells[2]?.v ?? '';
    if (title || image || link) {
      listings.push({
        title: encodeHtml(String(title)),
        image: String(image),
        link:  String(link)
      });
    }
  }

  // Layout: 4 columns, spacing similar to your original
  const COLS = 4;
  const X_SPACING = 2.1;
  const Y_SPACING = 1.3;
  let highlightId = 0;

  // Build one big HTML string (fewer reflows)
  let html = '';
  listings.forEach((item, idx) => {
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);

    const x = (col * X_SPACING).toFixed(2);      // 0.00, 2.10, 4.20, 6.30
    const y = (-row * Y_SPACING).toFixed(2);     // 0.00, -1.30, -2.60, ...

    const hId = `highlight-${highlightId++}`;
    const safeTitle = item.title;
    const safeImg = item.image.replace(/\s/g, '%20'); // avoid spaces in URLs
    const safeHref = item.link || '#';

    html += `
      <a-image
        data-raycastable
        position="${x} ${y} 0"
        width="2" height="1"
        crossorigin="anonymous"
        src="${safeImg}"
        link="href: ${safeHref}"
        event-set__enter="_event: mouseenter; _target: #${hId}; visible: true"
        event-set__leave="_event: mouseleave; _target: #${hId}; visible: false">

        <a-entity
          geometry="primitive: plane; width: 2; height: 0.2"
          material="color: #111"
          text="align: center; value: ${safeTitle}"
          position="0 -0.6 0"></a-entity>

        <a-plane id="${hId}" width="2.05" height="1.25"
          material="shader: flat; color: white"
          position="0 -0.1 -0.01" visible="false"></a-plane>
      </a-image>
    `;
  });

  container.insertAdjacentHTML('beforeend', html);

  // Optional: log how many tiles we added
  console.log(`[sheets] rendered ${listings.length} tiles`);
})();
