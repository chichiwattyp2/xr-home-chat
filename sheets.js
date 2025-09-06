// sheets.js — GViz → A-Frame tiles + Lookbook 3D panels (all text in Asimovian via canvas)
// - Removes legacy DOM/tiles (no duplicates)
// - Local-first asset resolve (+ GitHub blob→raw)
// - HEAD-checks links/images with cache; only binds if they exist
// - ALL in-scene typography rendered with Google font "Asimovian" onto canvases

(function () {
  'use strict';

  // ---------- flags ----------
  const REMOVE_LEGACY_DOM = true;
  const SHOW_SCENE_LABEL = false;       // (legacy) tiny label under raw tiles
  const RENDER_IN_SCENE_PANELS = true;  // lookbook cards as 3D entities

  // ---------- lookbook palette ----------
  const C = {
    panelBg:    "#14161C",
    panelOp:    0.68,
    panelBorder:"#FFFFFF",
    borderOp:   0.14,
    ink:        "#EEF2F6",
    inkMuted:   "#B6C0CA",
    accent:     "#D4A373",
    accentInk:  "#111111"
  };

  // ---------- typography (ALL Asimovian) ----------
  const FONT_FAMILY = 'Asimovian';  // loaded via <link> in index.html
  const TITLE_PX    = 64;
  const SUB_PX      = 40;
  const CHIP_PX     = 36;
  const BTN_PX      = 40;

  // ---------- utils ----------
  function encodeHtml(str) {
    var buf = [];
    str = (str ?? "").toString();
    for (var i = str.length - 1; i >= 0; i--) buf.unshift(["&#", str[i].charCodeAt(), ";"].join(""));
    return buf.join("");
  }

  // cache HEAD lookups + warn once
  const _urlOkCache = new Map();
  const _urlWarned  = new Set();
  async function headOK(url) {
    if (!url) return false;
    if (_urlOkCache.has(url)) return _urlOkCache.get(url);
    try {
      const r = await fetch(url, { method: "HEAD" });
      const ok = !!r.ok;
      _urlOkCache.set(url, ok);
      if (!ok && !_urlWarned.has(url)) {
        console.warn("HEAD", url, r.status || "not ok");
        _urlWarned.add(url);
      }
      return ok;
    } catch {
      _urlOkCache.set(url, false);
      if (!_urlWarned.has(url)) {
        console.warn("HEAD", url, "network error");
        _urlWarned.add(url);
      }
      return false;
    }
  }

  function toRawGitHub(u) {
    try {
      if (!u) return u;
      const url = new URL(u, location.href);
      if (url.hostname === "github.com" && url.pathname.includes("/blob/")) {
        const parts = url.pathname.split("/");
        const user = parts[1], repo = parts[2], ref = parts[4];
        const rest = parts.slice(5).join("/");
        return `https://raw.githubusercontent.com/${user}/${repo}/${ref}/${rest}`;
      }
    } catch (_) {}
    return u;
  }

  // LOCAL-FIRST: try /assets/<basename> first, then remote candidate
  async function resolveURL(u) {
    if (!u) return "";
    let candidate = toRawGitHub(u);

    // Bare filename → /assets/<name>
    const isBare = !/^(https?:)?\/\//i.test(candidate) && !candidate.includes("/") && !candidate.startsWith("#");
    if (isBare) {
      const local = `assets/${candidate}`;
      return (await headOK(local)) ? local : "";
    }

    // Try /assets/<basename> first
    try {
      const base = candidate.split("?")[0].split("#")[0];
      const name = base.substring(base.lastIndexOf("/") + 1);
      if (name) {
        const local = `assets/${name}`;
        if (await headOK(local)) return local;
      }
    } catch {}

    // Then remote candidate
    if (await headOK(candidate)) return candidate;

    return "";
  }

  const qp = (k, d) => (new URLSearchParams(location.search).get(k) ?? d);

  // Remove legacy DOM UI (tables/menus)
  function removeLegacyDOM() {
    if (!REMOVE_LEGACY_DOM) return;
    const selectors = [
      "#list", "#lists", "#listings", "#menu", "#menu-root",
      ".sheet-listings", ".listing-table", ".legacy-table", ".legacy-list",
      ".menu", ".tables", "table.sheet-table"
    ];
    selectors.forEach(sel => document.querySelectorAll(sel).forEach(n => n.remove()));
  }

  // Remove legacy A-Frame tiles/models/highlights outside our container
  function removeLegacyTiles(scene, ourContainerId) {
    if (!scene) return;
    scene.querySelectorAll(`a-image[width="2"][height="1"]`).forEach(el => {
      if (!el.closest(`#${ourContainerId}`)) el.remove();
    });
    // match the old legacy tile model transform from your previous build
    const LEGACY_SCALE = "0.03 0.03 0.03";
    const LEGACY_POS   = "0 2.10635 2.61942";
    const LEGACY_ROT   = "0 30 0";
    scene.querySelectorAll(`a-entity[gltf-model]`).forEach(el => {
      const s = (el.getAttribute("scale") || "").toString().trim();
      const p = (el.getAttribute("position") || "").toString().trim();
      const r = (el.getAttribute("rotation") || "").toString().trim();
      if (!el.closest(`#${ourContainerId}`) && s === LEGACY_SCALE && p === LEGACY_POS && r === LEGACY_ROT) {
        el.remove();
      }
    });
    scene.querySelectorAll(`a-plane[id^="highlight-"]`).forEach(el => {
      if (!el.closest(`#${ourContainerId}`)) el.remove();
    });
  }

  // ---------- Canvas text (Asimovian everywhere) ----------
  function nextPow2(n) {
    let p = 1;
    while (p < n) p <<= 1;
    return p;
  }

  function drawTextToCanvas({ canvas, text, fontPx=48, color="#fff",
                              bg=null, padding=24, maxWidth=null,
                              align="center", lineHeight=1.22, weight="600" }) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width  || 1024;
    const H = canvas.height || 256;

    ctx.clearRect(0,0,W,H);
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0,0,W,H); }

    ctx.fillStyle = color;
    ctx.textBaseline = "top";
    ctx.font = `${weight} ${fontPx}px "${FONT_FAMILY}", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;

    const words = String(text ?? "").split(/\s+/);
    const lines = [];
    const max = (maxWidth ?? (W - padding*2));
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > max) { lines.push(line); line = w; }
      else { line = test; }
    }
    if (line) lines.push(line);

    let y = padding;
    for (const l of lines) {
      let x = padding;
      const lw = ctx.measureText(l).width;
      if (align === "center") x = (W - lw)/2;
      if (align === "right")  x = W - padding - lw;
      ctx.fillText(l, x, y);
      y += fontPx * lineHeight;
      if (y > H - padding - fontPx) break;
    }
  }

  function makeTextPlane({ id, text, w, h, fontPx, color, align="center", bg=null, maxWidthPx }) {
    // create or reuse a hidden canvas (power-of-two dimensions to avoid WebGL resize spam)
    let canvas = document.getElementById(id);
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = id;
      canvas.width = 1024; // fixed POT width
      // compute height proportional to plane aspect, then clamp to POT
      const rawH = Math.max(64, Math.round(1024 * (h / Math.max(0.01, w))));
      canvas.height = Math.min(1024, nextPow2(rawH));
      canvas.style.display = "none";
      document.body.appendChild(canvas);
    }

    const draw = () => drawTextToCanvas({
      canvas, text, fontPx, color, bg, align, maxWidth: maxWidthPx ?? (canvas.width - 64)
    });
    if (document.fonts?.ready) document.fonts.ready.then(draw); else draw();

    // return an a-plane that uses this canvas as its texture
    const plane = document.createElement("a-plane");
    plane.setAttribute("width", w.toString());
    plane.setAttribute("height", h.toString());
    plane.setAttribute("material", `src: #${id}; transparent: true; shader: flat;`);
    return plane;
  }

  // Build a lookbook card INSIDE the scene (planes + canvas text)
  function createScenePanel(parent, item, opts = {}) {
    // Layout (meters)
    const W = 1.6, H = 1.0;
    const BORDER_PAD = 0.02;
    const PADS = { x: 0.10, y: 0.10 };
    const MEDIA_H = 0.48;
    const BTN_W = 0.42, BTN_H = 0.16;

    const panel = document.createElement("a-entity");
    panel.setAttribute("class", "lookbook-card-3d");
    panel.setAttribute("position", opts.position || "0 0 0.02");
    parent.appendChild(panel);

    // Border
    const border = document.createElement("a-plane");
    border.setAttribute("width", (W + BORDER_PAD).toString());
    border.setAttribute("height", (H + BORDER_PAD).toString());
    border.setAttribute("material", `color: ${C.panelBorder}; opacity: ${C.borderOp}; transparent: true; shader: flat;`);
    border.setAttribute("position", "0 0 -0.002");
    panel.appendChild(border);

    // Background glass
    const bg = document.createElement("a-plane");
    bg.setAttribute("width", W.toString());
    bg.setAttribute("height", H.toString());
    bg.setAttribute("material", `color: ${C.panelBg}; opacity: ${C.panelOp}; transparent: true; shader: flat;`);
    bg.setAttribute("position", "0 0 0");
    panel.appendChild(bg);

    // Media (image only; models appear as separate glTF below)
    const isModel = /\.(glb|gltf)(\?|$)/i.test(item.image);
    if (!isModel && item.image) {
      const media = document.createElement("a-plane");
      const mediaW = W - PADS.x * 2;
      media.setAttribute("width", mediaW.toString());
      media.setAttribute("height", MEDIA_H.toString());
      media.setAttribute("src", item.image);
      media.setAttribute("position", `0 ${H/2 - PADS.y - MEDIA_H/2} 0.001`);
      panel.appendChild(media);
    }

    // Title (Asimovian via canvas)
    const titleY = isModel ? (H/2 - PADS.y - 0.18) : (H/2 - PADS.y - MEDIA_H - 0.10);
    const titlePlane = makeTextPlane({
      id: `title-${item.__uid}`,
      text: item.title || "",
      w: 1.34, h: 0.18,
      fontPx: TITLE_PX,
      color: C.ink,
      align: "center",
      maxWidthPx: 960
    });
    titlePlane.setAttribute("position", `0 ${titleY.toFixed(3)} 0.001`);
    panel.appendChild(titlePlane);

    // Subtitle/domain (muted)
    let domain = "";
    try { domain = new URL(item.link).hostname.replace(/^www\./,''); } catch {}
    if (domain) {
      const subPlane = makeTextPlane({
        id: `sub-${item.__uid}`,
        text: domain,
        w: 1.2, h: 0.14,
        fontPx: SUB_PX,
        color: C.inkMuted,
        align: "center"
      });
      subPlane.setAttribute("position", `0 ${(titleY - 0.14).toFixed(3)} 0.001`);
      panel.appendChild(subPlane);
    }

    // Chips row
    const chips = document.createElement("a-entity");
    chips.setAttribute("position", `0 ${-H/2 + PADS.y + 0.18} 0.001`);
    panel.appendChild(chips);

    function addChip(txt, xOffset) {
      const safeTxt = String(txt).replace(/[^\w-]+/g, '_');
      const g = document.createElement("a-entity");
      const chipW = 0.34, chipH = 0.14;

      const chipBg = document.createElement("a-plane");
      chipBg.setAttribute("width", chipW.toString());
      chipBg.setAttribute("height", chipH.toString());
      chipBg.setAttribute("material", `color: ${C.panelBorder}; opacity: 0.12; transparent: true; shader: flat;`);
      chipBg.setAttribute("position", `${xOffset} 0 0`);
      g.appendChild(chipBg);

      const chipTxt = makeTextPlane({
        id: `chip-${safeTxt}-${item.__uid}`,
        text: txt,
        w: chipW * 0.9, h: chipH * 0.75,
        fontPx: CHIP_PX,
        color: C.ink,
        align: "center"
      });
      chipTxt.setAttribute("position", `${xOffset} 0 0.001`);
      g.appendChild(chipTxt);

      chips.appendChild(g);
    }
    addChip(isModel ? "3D" : "Image", -0.18);
    if (item.linkOK) addChip("Link", 0.18);

    // Button (only if linkOK)
    if (item.linkOK) {
      const btn = document.createElement("a-entity");
      btn.setAttribute("position", `0 ${-H/2 + PADS.y + 0.02} 0.001`);

      const btnBg = document.createElement("a-plane");
      btnBg.setAttribute("width", BTN_W.toString());
      btnBg.setAttribute("height", BTN_H.toString());
      btnBg.setAttribute("material", `color: ${C.accent}; opacity: 1; shader: flat;`);
      btnBg.classList.add("interactive");
      btn.appendChild(btnBg);

      const btnTxt = makeTextPlane({
        id: `btn-${item.__uid}`,
        text: "Open",
        w: BTN_W * 0.9, h: BTN_H * 0.8,
        fontPx: BTN_PX,
        color: C.accentInk,
        align: "center"
      });
      btnTxt.setAttribute("position", `0 0 0.001`);
      btn.appendChild(btnTxt);

      btn.setAttribute("link", `href: ${item.link}`);
      panel.appendChild(btn);

      btn.addEventListener("mouseenter", () => btnBg.setAttribute("material", `color: ${C.accent}; opacity: 0.9; shader: flat;`));
      btn.addEventListener("mouseleave", () => btnBg.setAttribute("material", `color: ${C.accent}; opacity: 1; shader: flat;`));
    }

    return panel;
  }

  document.addEventListener("DOMContentLoaded", () => {
    (async function main() {
      if (window.__LOOKBOOK_RENDERED) {
        console.info("Lookbook already rendered — skipping duplicate run.");
        return;
      }
      window.__LOOKBOOK_ACTIVE = true;

      // ===== CONFIG =====
      const SHEET_ID = "1fy-ZztZlhwgfz1wH8YGji2zuiiEfV88XyCRBDzLB1AA";
      const GID = Number(qp("gid", 9));
      const GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${GID}`;

      const CONTAINER_ID = "container";
      const CONTAINER_POS = "-3.33673 5 -6.12319";
      const MODEL_SCALE   = "0.03 0.03 0.03";
      const MODEL_POS     = "0 2.10635 2.61942";
      const MODEL_ROT     = "0 30 0";
      const MSDF_FONT     = "https://cdn.aframe.io/fonts/Roboto-msdf.json"; // (unused now, kept for fallback)

      // ===== Remove legacy UIs & tiles first =====
      removeLegacyDOM();
      const scene = document.querySelector("a-scene") || document.body;

      scene.querySelectorAll(`#${CONTAINER_ID}`).forEach(n => n.remove());
      removeLegacyTiles(scene, CONTAINER_ID);

      // ===== Create fresh container =====
      let container = document.createElement("a-entity");
      container.id = CONTAINER_ID;
      container.setAttribute("position", CONTAINER_POS);
      scene.appendChild(container);
      console.log("#container created at", CONTAINER_POS);

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

        const [imageResolved, linkResolved] = await Promise.all([resolveURL(image), resolveURL(link)]);
        const [imageOK, linkOK] = await Promise.all([
          imageResolved ? headOK(imageResolved) : Promise.resolve(false),
          linkResolved  ? headOK(linkResolved)  : Promise.resolve(false)
        ]);

        listings.push({
          __uid: `${r}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
          title,
          image: imageOK ? imageResolved : "",
          link:  linkOK  ? linkResolved  : "",
          linkOK
        });
      }

      // ===== Render exact grid =====
      let r = 0, i = 0, p = 0, h = 0, pages = 0;
      for (const item of listings) {
        const isModel = /\.(glb|gltf)(\?|$)/i.test(item.image);
        const xStr = `${i * 2}.${i}`;
        const yStr = (r * 1.3).toString();

        const tile = document.createElement("a-image");
        tile.setAttribute("id", `tile-${h}`);
        tile.setAttribute("data-from-sheet", "1");
        tile.setAttribute("position", `${xStr} ${yStr} 0`);
        tile.setAttribute("width", "2");
        tile.setAttribute("height", "1");
        tile.setAttribute("crossorigin", "anonymous");

        if (!isModel && item.image) tile.setAttribute("src", item.image);
        if (item.linkOK && item.link) tile.setAttribute("link", `href: ${item.link}`);
        container.appendChild(tile);

        // Optional legacy label (disabled)
        if (SHOW_SCENE_LABEL) {
          const label = document.createElement("a-entity");
          label.setAttribute("geometry", "primitive: plane; width: 2; height: .2");
          label.setAttribute("material", "color: #111");
          label.setAttribute("text", `align: center; value: ${encodeHtml(item.title || "")}; color: #fff; shader: msdf; font: ${MSDF_FONT}`);
          label.setAttribute("position", "0 -.6 0");
          tile.appendChild(label);
        }

        // Attach model if needed
        if (isModel && item.image) {
          const model = document.createElement("a-entity");
          model.setAttribute("gltf-model", `url(${item.image})`);
          model.setAttribute("scale", MODEL_SCALE);
          model.setAttribute("position", MODEL_POS);
          model.setAttribute("rotation", MODEL_ROT);
          tile.appendChild(model);
        }

        // Lookbook card (Asimovian via canvases)
        if (RENDER_IN_SCENE_PANELS) {
          createScenePanel(tile, item, { position: "0 0 0.02" });
        }

        // grid stepping
        i++; h++;
        if (i === 4) { r--; i = 0; p++; }
        if (p === 3) { r += 20; p = 0; pages++; console.log(pages); }
      }

      window.__LOOKBOOK_RENDERED = true;
    })();
  });
})();
