// sheets.js — GViz → A-Frame tiles + Lookbook overlay panels (no duplicates)
// - Removes old table/list UI before rendering (legacy selectors)
// - Global guard: window.__LOOKBOOK_ACTIVE = true
// - Lookbook overlay panels only (in-scene label disabled by default)
// - GitHub blob→raw normalizer + local /assets fallback for images/models
(function () {
  // ---------- flags ----------
  const REMOVE_LEGACY = true;          // remove old table/list UI
  const SHOW_SCENE_LABEL = false;      // set true if you still want the MSDF text under each tile

  // ---------- utils ----------
  function encodeHtml(str) {
    var buf = [];
    str = (str ?? "").toString();
    for (var i = str.length - 1; i >= 0; i--) buf.unshift(["&#", str[i].charCodeAt(), ";"].join(""));
    return buf.join("");
  }

  // GitHub "blob" → raw
  function toRawGitHub(u) {
    try {
      if (!u) return u;
      const url = new URL(u, location.href);
      if (url.hostname === "github.com" && url.pathname.includes("/blob/")) {
        const parts = url.pathname.split("/"); // ["", user, repo, "blob", ref, ...rest]
        const user = parts[1], repo = parts[2], ref = parts[4];
        const rest = parts.slice(5).join("/");
        return `https://raw.githubusercontent.com/${user}/${repo}/${ref}/${rest}`;
      }
    } catch (_) {}
    return u;
  }

  // HEAD test + local /assets fallback
  async function resolveURL(u) {
    if (!u) return u;
    let candidate = toRawGitHub(u);

    // bare filename → local
    const isBare = !/^(https?:)?\/\//i.test(candidate) && !candidate.includes("/") && !candidate.startsWith("#");
    if (isBare) return `assets/${candidate}`;

    // try remote
    try {
      const res = await fetch(candidate, { method: "HEAD", mode: "cors" });
      if (res.ok) return candidate;
    } catch (_) {}

    // fallback to /assets/<basename>
    try {
      const base = candidate.split("?")[0].split("#")[0];
      const name = base.substring(base.lastIndexOf("/") + 1);
      if (!name) return candidate;
      const local = `assets/${name}`;
      const resLocal = await fetch(local, { method: "HEAD" });
      if (resLocal.ok) return local;
    } catch (_) {}
    return candidate;
  }

  const qp = (k, d) => (new URLSearchParams(location.search).get(k) ?? d);

  // world→screen helper
  function worldToScreen(obj3D, camera, renderer) {
    const vec = new THREE.Vector3();
    obj3D.getWorldPosition(vec);
    vec.project(camera);
    const x = (vec.x * 0.5 + 0.5) * renderer.domElement.clientWidth;
    const y = (vec.y * -0.5 + 0.5) * renderer.domElement.clientHeight;
    return { x, y, z: vec.z };
  }

  // Ensure overlay root
  function ensureOverlayRoot() {
    let root = document.querySelector(".xr-ui");
    if (!root) {
      root = document.createElement("div");
      root.className = "xr-ui parallax-stage";
      document.body.appendChild(root);
    }
    return root;
  }

  // Remove legacy UI containers (table/list, menus, etc.)
  function removeLegacyUI() {
    if (!REMOVE_LEGACY) return;
    const selectors = [
      "#list", "#lists", "#listings", "#menu", "#menu-root",
      ".sheet-listings", ".listing-table", ".legacy-table", ".legacy-list",
      ".menu", ".tables", "table.sheet-table"
    ];
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(n => n.remove());
    });
  }

  // Build a lookbook panel for an item, attach to overlay root, and bind to follow a target entity
  function attachPanelForEntity(targetEl, item) {
    const overlayRoot = ensureOverlayRoot();
    const panel = document.createElement("div");
    panel.className = "float-box float-anim reveal-rise tilt-hover parallax-layer parallax-d2";
    const isModel = /\.(glb|gltf)(\?|$)/i.test(item.image);
    const imgHTML = !isModel && item.image ? `<div class="media"><img src="${item.image}" alt=""></div>` : "";

    const domain = (() => { try { return new URL(item.link).hostname.replace(/^www\./,''); } catch { return ""; } })();

    panel.innerHTML = `
      ${imgHTML}
      <div class="title">${encodeHtml(item.title)}</div>
      ${domain ? `<div class="subtitle asimovian">${domain}</div>` : ""}
      <div class="chips">
        ${isModel ? `<span class="chip">3D</span>` : `<span class="chip">Image</span>`}
        ${item.link ? `<span class="chip">Link</span>` : ``}
      </div>
      ${item.link ? `<button class="btn">Open</button>` : ``}
    `;
    overlayRoot.appendChild(panel);

    if (item.link) {
      panel.querySelector(".btn")?.addEventListener("click", () => {
        window.open(item.link, "_blank", "noopener,noreferrer");
      });
    }

    const scene = document.querySelector("a-scene");
    const renderer = scene && scene.renderer;
    const cameraEl = scene && scene.camera && scene.camera.el;
    function tick() {
      if (!renderer || !cameraEl || !targetEl.object3D) return requestAnimationFrame(tick);
      const cam = cameraEl.getObject3D("camera");
      if (!cam) return requestAnimationFrame(tick);
      const { x, y } = worldToScreen(targetEl.object3D, cam, renderer);
      panel.style.position = "fixed";
      panel.style.left = `${x}px`;
      panel.style.top = `${y}px`;
      panel.style.transform = "translate(-50%, -50%)";
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    return panel;
  }

  document.addEventListener("DOMContentLoaded", () => {
    (async function main() {
      // Let any other scripts know we’ve taken over
      window.__LOOKBOOK_ACTIVE = true;

      // Clean out legacy UI first
      removeLegacyUI();

      // ===== CONFIG =====
      const SHEET_ID = "1fy-ZztZlhwgfz1wH8YGji2zuiiEfV88XyCRBDzLB1AA";
      const GID = Number(qp("gid", 9));
      const GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${GID}`;

      const CONTAINER_POS = "-3.33673 5 -6.12319";
      const MODEL_SCALE   = "0.03 0.03 0.03";
      const MODEL_POS     = "0 2.10635 2.61942";
      const MODEL_ROT     = "0 30 0";
      const MSDF_FONT     = "https://cdn.aframe.io/fonts/Roboto-msdf.json";

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

      // Clean prior A-Frame render
      Array.from(container.querySelectorAll('[data-from-sheet="1"]')).forEach(el => el.remove());

      // ===== Fetch sheet =====
      let rows = [];
      try {
        const text = await (await fetch(GVIZ_URL)).text();
        const json = JSON.parse(text.substring(text.indexOf("{"), text.lastIndexOf(")")));
        rows = (json.table && json.table.rows) || [];
      } catch (err) {
        console.error("GViz fetch/parse error:", err);
        return;
      }
      if (!rows.length) { console.warn("No rows in sheet."); return; }

      // Build listings (Title | Image | Link)
      const listings = [];
      for (let r = 1; r < rows.length; r++) {
        const c = rows[r].c || [];
        const title = (c[0]?.v ?? "").toString();
        let   image = (c[1]?.v ?? "").toString();
        let   link  = (c[2]?.v ?? "").toString();

        // Resolve URLs with normalization + fallback
        const [imageResolved, linkResolved] = await Promise.all([resolveURL(image), resolveURL(link)]);
        listings.push({ title, image: imageResolved, link: linkResolved });
      }

      // ===== Render exact grid =====
      let r = 0, i = 0, p = 0, h = 0, pages = 0;

      for (const item of listings) {
        const titleSafe = encodeHtml(item.title || "");
        const isModel   = /\.(glb|gltf)(\?|$)/i.test(item.image);
        const xStr = `${i * 2}.${i}`;
        const yStr = (r * 1.3).toString();

        // Tile (image plane + optional model, label optional by flag)
        const labelHTML = SHOW_SCENE_LABEL ? `
            <a-entity geometry="primitive: plane; width: 2; height: .2"
                      material="color: #111"
                      text="align: center; value: ${titleSafe}; color: #fff; shader: msdf; font: ${MSDF_FONT}"
                      position="0 -.6 0"></a-entity>` : ``;

        const html = `
          <a-image data-from-sheet="1"
                   id="tile-${h}"
                   position="${xStr} ${yStr} 0"
                   width="2" height="1"
                   crossorigin="anonymous"
                   ${item.link ? `link="href: ${item.link}"` : ""}
                   ${(!isModel && item.image) ? `src="${item.image}"` : ""}>
            ${labelHTML}
            ${isModel ? `
              <a-entity gltf-model="url(${item.image})"
                        scale="${MODEL_SCALE}"
                        position="${MODEL_POS}"
                        rotation="${MODEL_ROT}"></a-entity>
            ` : ``}
          </a-image>
        `;
        container.insertAdjacentHTML("beforeend", html);

        // Attach lookbook overlay panel to the created tile
        const tileEl = container.querySelector(`#tile-${h}`);
        if (tileEl) attachPanelForEntity(tileEl, item);

        // step grid
        i++; h++;
        if (i === 4) { r--; i = 0; p++; }
        if (p === 3) { r += 20; p = 0; pages++; console.log(pages); }
      }
    })();
  });
})();
