// sheets.js — GViz → A-Frame tiles + Lookbook-styled 3D panels (no duplicates)
// - Renders lookbook cards INSIDE the scene (3D)
// - Removes legacy DOM/table UI and old tiles before rendering
// - GitHub blob→raw + /assets fallback for images/models
(function () {
  // ---------- flags ----------
  const REMOVE_LEGACY_DOM = true;
  const SHOW_SCENE_LABEL = false;       // legacy small text under tiles
  const RENDER_IN_SCENE_PANELS = true;  // lookbook cards as 3D entities

  // ---------- colors to match your CSS themes (dark-glass defaults) ----------
  const C = {
    panelBg:    "#14161C",   // --panel-bg visual (we'll use opacity for the glass)
    panelOp:    0.68,
    panelBorder:"#FFFFFF",   // --panel-border visual
    borderOp:   0.14,
    ink:        "#EEF2F6",   // --ink
    inkMuted:   "#B6C0CA",   // --ink-muted
    accent:     "#D4A373",   // --accent
    accentInk:  "#111111"
  };

  // ---------- utils ----------
  function encodeHtml(str) {
    var buf = [];
    str = (str ?? "").toString();
    for (var i = str.length - 1; i >= 0; i--) buf.unshift(["&#", str[i].charCodeAt(), ";"].join(""));
    return buf.join("");
  }

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

  async function resolveURL(u) {
    if (!u) return u;
    let candidate = toRawGitHub(u);

    const isBare = !/^(https?:)?\/\//i.test(candidate) && !candidate.includes("/") && !candidate.startsWith("#");
    if (isBare) return `assets/${candidate}`;

    try {
      const res = await fetch(candidate, { method: "HEAD", mode: "cors" });
      if (res.ok) return candidate;
    } catch (_) {}

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

  // Build a lookbook card INSIDE the scene (planes + msdf text)
  function createScenePanel(parent, item, opts = {}) {
    // Layout metrics (in meters)
    const W = 1.6, H = 1.0, R = 0.08;            // card width/height, "rounded" simulated by slightly inset inner content
    const BORDER_PAD = 0.02;                     // fake border grow
    const PADS = { x: 0.10, y: 0.10 };
    const MEDIA_H = 0.48;                        // media plane height
    const TITLE_SIZE = 0.12;                     // msdf title size-ish via geometry plane
    const SUB_SIZE = 0.08;
    const CHIP_SIZE = 0.07;
    const BTN_W = 0.42, BTN_H = 0.16;

    const panel = document.createElement("a-entity");
    panel.setAttribute("class", "lookbook-card-3d");
    panel.setAttribute("position", opts.position || "0 0 0.02"); // slightly forward to avoid z-fighting
    parent.appendChild(panel);

    // Border plane (slightly larger, low opacity)
    const border = document.createElement("a-plane");
    border.setAttribute("width", (W + BORDER_PAD).toString());
    border.setAttribute("height", (H + BORDER_PAD).toString());
    border.setAttribute("material", `color: ${C.panelBorder}; opacity: ${C.borderOp}; transparent: true; shader: flat;`);
    border.setAttribute("position", "0 0 -0.002");
    panel.appendChild(border);

    // Background glass plane
    const bg = document.createElement("a-plane");
    bg.setAttribute("width", W.toString());
    bg.setAttribute("height", H.toString());
    bg.setAttribute("material", `color: ${C.panelBg}; opacity: ${C.panelOp}; transparent: true; shader: flat;`);
    bg.setAttribute("position", "0 0 0");
    panel.appendChild(bg);

    // Optional media
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

    // Title (MSDF text)
    const title = document.createElement("a-entity");
    title.setAttribute(
      "text",
      `align: center; value: ${encodeHtml(item.title)}; color: ${C.ink}; shader: msdf; font: https://cdn.aframe.io/fonts/Roboto-msdf.json;`
    );
    title.setAttribute("position", `0 ${isModel ? H/2 - PADS.y - 0.18 : (H/2 - PADS.y - MEDIA_H - 0.10)} 0.001`);
    panel.appendChild(title);

    // Subtitle/domain (muted)
    let domain = "";
    try { domain = new URL(item.link).hostname.replace(/^www\./,''); } catch {}
    if (domain) {
      const sub = document.createElement("a-entity");
      sub.setAttribute(
        "text",
        `align: center; value: ${encodeHtml(domain)}; color: ${C.inkMuted}; shader: msdf; font: https://cdn.aframe.io/fonts/Roboto-msdf.json;`
      );
      sub.setAttribute("position", `0 ${parseFloat(title.getAttribute("position").y) - 0.14} 0.001`);
      panel.appendChild(sub);
    }

    // Chips row
    const chips = document.createElement("a-entity");
    chips.setAttribute("position", `0 ${-H/2 + PADS.y + 0.18} 0.001`);
    panel.appendChild(chips);

    function addChip(txt, xOffset) {
      const g = document.createElement("a-entity");
      const chipW = 0.34, chipH = 0.14;

      const chipBg = document.createElement("a-plane");
      chipBg.setAttribute("width", chipW.toString());
      chipBg.setAttribute("height", chipH.toString());
      chipBg.setAttribute("material", `color: ${C.panelBorder}; opacity: 0.12; transparent: true; shader: flat;`);
      chipBg.setAttribute("position", `${xOffset} 0 0`);
      g.appendChild(chipBg);

      const t = document.createElement("a-entity");
      t.setAttribute("text", `align: center; value: ${encodeHtml(txt)}; color: ${C.ink}; shader: msdf; font: https://cdn.aframe.io/fonts/Roboto-msdf.json;`);
      t.setAttribute("position", `${xOffset} 0 0.001`);
      g.appendChild(t);

      chips.appendChild(g);
    }

    addChip(isModel ? "3D" : "Image", -0.18);
    if (item.link) addChip("Link", 0.18);

    // Button
    if (item.link) {
      const btn = document.createElement("a-entity");
      btn.setAttribute("position", `0 ${-H/2 + PADS.y + 0.02} 0.001`);

      const btnBg = document.createElement("a-plane");
      btnBg.setAttribute("width", BTN_W.toString());
      btnBg.setAttribute("height", BTN_H.toString());
      btnBg.setAttribute("material", `color: ${C.accent}; opacity: 1; shader: flat;`);
      btnBg.classList.add("interactive");
      btn.appendChild(btnBg);

      const btnTxt = document.createElement("a-entity");
      btnTxt.setAttribute("text", `align: center; value: Open; color: ${C.accentInk}; shader: msdf; font: https://cdn.aframe.io/fonts/Roboto-msdf.json;`);
      btnTxt.setAttribute("position", `0 0 0.001`);
      btn.appendChild(btnTxt);

      // use link component so it works in XR too
      btn.setAttribute("link", `href: ${item.link}`);
      panel.appendChild(btn);

      // simple hover feedback
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
      const MSDF_FONT     = "https://cdn.aframe.io/fonts/Roboto-msdf.json";

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

      // Build listings (Title | Image | Link) with normalization/fallback
      const listings = [];
      for (let r = 1; r < rows.length; r++) {
        const c = rows[r].c || [];
        const title = (c[0]?.v ?? "").toString();
        let   image = (c[1]?.v ?? "").toString();
        let   link  = (c[2]?.v ?? "").toString();

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

        const tile = document.createElement("a-image");
        tile.setAttribute("id", `tile-${h}`);
        tile.setAttribute("data-from-sheet", "1");
        tile.setAttribute("position", `${xStr} ${yStr} 0`);
        tile.setAttribute("width", "2");
        tile.setAttribute("height", "1");
        tile.setAttribute("crossorigin", "anonymous");
        if (!isModel && item.image) tile.setAttribute("src", item.image);
        if (item.link) tile.setAttribute("link", `href: ${item.link}`);
        container.appendChild(tile);

        if (SHOW_SCENE_LABEL) {
          const label = document.createElement("a-entity");
          label.setAttribute("geometry", "primitive: plane; width: 2; height: .2");
          label.setAttribute("material", "color: #111");
          label.setAttribute("text", `align: center; value: ${titleSafe}; color: #fff; shader: msdf; font: ${MSDF_FONT}`);
          label.setAttribute("position", "0 -.6 0");
          tile.appendChild(label);
        }

        if (isModel) {
          const model = document.createElement("a-entity");
          model.setAttribute("gltf-model", `url(${item.image})`);
          model.setAttribute("scale", MODEL_SCALE);
          model.setAttribute("position", MODEL_POS);
          model.setAttribute("rotation", MODEL_ROT);
          tile.appendChild(model);
        }

        // >>> NEW: in-scene lookbook card <<<
        if (RENDER_IN_SCENE_PANELS) {
          // Offset the card slightly forward so it's readable and not coplanar with the tile
          const panelOffset = "0 0 0.02";
          createScenePanel(tile, item, { position: panelOffset });
        }

        // step grid
        i++; h++;
        if (i === 4) { r--; i = 0; p++; }
        if (p === 3) { r += 20; p = 0; pages++; console.log(pages); }
      }

      window.__LOOKBOOK_RENDERED = true;
    })();
  });
})();
