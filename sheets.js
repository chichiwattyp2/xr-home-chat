// sheets.js — GViz → A-Frame menu (exact layout) + tiny GLTF preview (CSP-safe, no jQuery)
(function () {
  // simple encoder to keep titles safe inside attributes
  function encodeHtml(str) {
    var buf = [];
    for (var i = str.length - 1; i >= 0; i--) buf.unshift(["&#", str[i].charCodeAt(), ";"].join(""));
    return buf.join("");
  }
  const qp = (k, d) => (new URLSearchParams(location.search).get(k) ?? d);

  document.addEventListener("DOMContentLoaded", () => {
    // ===== CONFIG =====
    const SHEET_ID = "1fy-ZztZlhwgfz1wH8YGji2zuiiEfV88XyCRBDzLB1AA";
    const GID = Number(qp("gid", 9)); // allow ?gid= override
    const GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${GID}`;

    // Container must be here (your exact position)
    const CONTAINER_POS = "-3.33673 5 -6.12319";

    // Tiny model preview (your exact transform)
    const MODEL_SCALE = "0.03 0.03 0.03";
    const MODEL_POS   = "0 2.10635 2.61942";
    const MODEL_ROT   = "0 29.999999999999996 0";

    // Local MSDF font to satisfy CSP (place files under assets/fonts/)
    const MSDF_FONT = "assets/fonts/Roboto-msdf.json";

    // ===== Ensure scene + container =====
    const scene = document.querySelector("a-scene") || document.body;

    let container = document.getElementById("container");
    if (!container) {
      container = document.createElement("a-entity");
      container.id = "container";
      container.setAttribute("position", CONTAINER_POS);
      scene.appendChild(container);
      console.log("#container created at", CONTAINER_POS);
    }

    // Clean prior render
    Array.from(container.querySelectorAll('[data-from-sheet="1"]')).forEach(el => el.remove());

    // ===== Fetch sheet via GViz (no jQuery) =====
    fetch(GVIZ_URL)
      .then(r => r.text())
      .then(text => {
        // Strip GViz wrapper
        const json = JSON.parse(text.substring(text.indexOf("{"), text.lastIndexOf(")")));
        const rows = (json.table && json.table.rows) || [];
        if (!rows.length) { console.warn("No rows in sheet."); return; }

        const listings = [];
        // Expect header row: Title | Image | Link
        for (let r = 1; r < rows.length; r++) {
          const c = rows[r].c || [];
          const title = c[0]?.v ?? "";
          let   image = c[1]?.v ?? "";
          const link  = c[2]?.v ?? "";

          // Normalize: bare filename → assets/<file>
          if (image && !/^https?:\/\//.test(image) && !image.includes("/") && !image.startsWith("#")) {
            image = `assets/${image}`;
          }
          listings.push({ title: String(title), image: String(image), link: String(link) });
        }

        // ===== Render with your exact layout math =====
        let r = 0, i = 0, p = 0, h = 0, pages = 0;

        for (const item of listings) {
          const titleSafe = encodeHtml(item.title || "");
          const isModel = /\.(glb|gltf)(\?|$)/i.test(item.image);
          const xStr = `${i * 2}.${i}`;      // 0.0, 2.1, 4.2, 6.3 ...
          const yStr = (r * 1.3).toString(); // 0, -1.3, -2.6 ...

          // Build one tile
          const html = `
            <a-image data-from-sheet="1"
                     position="${xStr} ${yStr} 0"
                     width="2" height="1"
                     crossorigin="anonymous"
                     ${item.link ? `link="href: ${item.link}"` : ""}
                     ${(!isModel && item.image) ? `src="${item.image}"` : ""}
                     event-set__enter="_event: mouseenter; _target: #highlight-${h}; visible: true"
                     event-set__leave="_event: mouseleave; _target: #highlight-${h}; visible: false">
              <a-entity geometry="primitive: plane; width: 2; height: .2"
                        material="color: #111"
                        text="align: center; value: ${titleSafe}; shader: msdf; font: ${MSDF_FONT}; color: #fff"
                        position="0 -.6 0"></a-entity>

              <a-plane id="highlight-${h}" width="2.05" height="1.25"
                       material="shader: flat; color: white;"
                       position="0 -0.1 -0.01" visible="false"></a-plane>

              ${isModel ? `
                <a-entity gltf-model="url(${item.image})"
                          scale="${MODEL_SCALE}"
                          position="${MODEL_POS}"
                          rotation="${MODEL_ROT}"></a-entity>
              ` : ``}
            </a-image>
          `;
          container.insertAdjacentHTML("beforeend", html);

          // advance grid counters (exactly like your example)
          i++; h++;
          if (i === 4) { r--; i = 0; p++; }
          if (p === 3) { r += 20; p = 0; pages++; console.log(pages); }
        }
      })
      .catch(err => console.error("GViz fetch error:", err));
  });
})();
