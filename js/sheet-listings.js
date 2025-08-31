 // js/sheet-listings.js
// Build tiles from a public Google Sheet and (optionally) preview a model from each row.
// Requires jQuery (already loaded in your <head>).

(function () {
  if (typeof window.jQuery === 'undefined') {
    console.warn('[sheet-listings] jQuery not found; skipping sheet render.');
    return;
  }
  const $ = window.jQuery;

  // ---- CONFIG ----
  const SHEET_ID = "1fy-ZztZlhwgfz1wH8YGji2zuiiEfV88XyCRBDzLB1AA"; // your existing sheet
  const GID = 9; // tab gid you're already using
  const gvizUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${GID}`;

  function encodeHtml(str) {
    var buf = [];
    for (var i = str.length - 1; i >= 0; i--) {
      buf.unshift(["&#", str[i].charCodeAt(), ";"].join(""));
    }
    return buf.join("");
  }

  // Utility: normalize a scale string -> "x y z"
  function normalizeScale(s) {
    if (!s) return "1 1 1";
    const parts = String(s).trim().split(/\s+/);
    if (parts.length === 1) {
      const n = parseFloat(parts[0]) || 1;
      return `${n} ${n} ${n}`;
    }
    if (parts.length >= 3) return `${parts[0]} ${parts[1]} ${parts[2]}`;
    return "1 1 1";
  }

  // Utility: normalize rotation string -> "x y z"
  function normalizeRotation(s) {
    if (!s) return "0 180 0";
    const parts = String(s).trim().split(/\s+/);
    if (parts.length >= 3) return `${parts[0]} ${parts[1]} ${parts[2]}`;
    return "0 180 0";
  }

  // Load a model into the stage entity
  function loadIntoStage({ src, scale, rotation }) {
    const stage = document.getElementById('stageModel');
    if (!stage) {
      console.warn('[sheet-listings] #stageModel not found in DOM.');
      return;
    }
    // Show stageModel and swap model
    stage.setAttribute('visible', true);
    // Clear previous to ensure a fresh load (helps with some old GLTFLoader edge cases)
    stage.removeAttribute('gltf-model');
    // Apply transform first
    if (scale)    stage.setAttribute('scale', normalizeScale(scale));
    if (rotation) stage.setAttribute('rotation', normalizeRotation(rotation));
    // Then set the glTF source (can be same-origin or CORS-enabled external)
    stage.setAttribute('gltf-model', src);
  }

  $.get(gvizUrl).done(function (text) {
    try {
      const json = JSON.parse(text.substring(text.indexOf("{"), text.lastIndexOf(")")));
      const rows = json.table.rows || [];
      const $container = $('#container');

      let r = 0, i = 0, p = 0, h = 0;

      for (let idx = 1; idx < rows.length; idx++) {
        const cells = rows[idx].c || [];

        const title    = cells[0]?.v ?? "";
        const image    = cells[1]?.v ?? "";
        const link     = cells[2]?.v ?? "";
        const modelUrl = cells[3]?.v ?? "";   // NEW
        const scale    = cells[4]?.v ?? "";   // NEW (e.g. "1 1 1" or "1.2")
        const rotation = cells[5]?.v ?? "";   // NEW (e.g. "0 180 0")

        // Build tile HTML
        const pos = `${i * 2}.${i} ${r * 1.3} 0`; // keep your existing layout logic
        const safeTitle = encodeHtml(String(title));

        $container.append(`
          <a-image
            class="clickable"
            position="${pos}"
            width="2" height="1"
            src="${String(image)}"
            ${link ? `link="href: ${String(link)}"` : ""}
            data-model-src="${modelUrl ? String(modelUrl) : ""}"
            data-model-scale="${scale ? String(scale) : ""}"
            data-model-rot="${rotation ? String(rotation) : ""}">
            <a-entity geometry="primitive: plane; width: 2; height: .2"
                      material="color: #111"
                      text="align:center; value: ${safeTitle}"
                      position="0 -.6 0"></a-entity>
            <a-plane width="2.05" height="1.25"
                     material="shader: flat; color: white;"
                     position="0 -0.1 -0.01" visible="false"></a-plane>
          </a-image>
        `);

        i++; h++;
        if (i === 4) { r--; i = 0; p++; }
        if (p === 3) { r += 20; p = 0; }
      }

      // Ensure tiles are raycastable for both mouse & VR cursor
      document.querySelectorAll('#container [link], #container a-image').forEach(el => {
        el.classList.add('clickable');
        el.setAttribute('data-raycastable', '');
      });

      // Hook click to preview model if the tile has one
      document.querySelectorAll('#container a-image').forEach(el => {
        el.addEventListener('click', (e) => {
          const src = el.getAttribute('data-model-src');
          if (!src) return; // no model; keep default link behavior

          // If user is holding a modifier key, allow the link navigation.
          if (e && (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey)) return;

          // Otherwise, preview the model and prevent navigation.
          e.preventDefault?.();
          e.stopPropagation?.();

          const scale = el.getAttribute('data-model-scale');
          const rot   = el.getAttribute('data-model-rot');
          loadIntoStage({ src, scale, rotation: rot });
        });
      });

    } catch (e) {
      console.warn('[sheet-listings] parse failed:', e);
    }
  }).fail(function (xhr, status) {
    console.warn('[sheet-listings] request failed:', status);
  });
})();
