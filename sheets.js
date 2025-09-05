// sheets.js — GViz → A-Frame menu (exact layout) + tiny GLTF preview (auto-make #container)
(function(){
  function encodeHtml(str){
    var buf=[]; for (var i=str.length-1;i>=0;i--) buf.unshift(["&#", str[i].charCodeAt(), ";"].join(""));
    return buf.join("");
  }
  function qp(name, dflt){ const v=new URLSearchParams(location.search).get(name); return v!==null?v:dflt; }

  document.addEventListener('DOMContentLoaded', () => {
    const SHEET_ID = "1fy-ZztZlhwgfz1wH8YGji2zuiiEfV88XyCRBDzLB1AA";
    const GID      = Number(qp("gid", 9));
    const GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${GID}`;

    // Your tiny preview transform (exact)
    const MODEL_SCALE = "1 1 1";
    const MODEL_POS   = "0 2.10635 2.61942";
    const MODEL_ROT   = "0 29.999999999999996 0";

    // Ensure a-scene exists before injecting
    const scene = document.querySelector('a-scene') || document.body;

    // Ensure #container exists at your requested position
    let container = document.getElementById('container');
    if (!container) {
      container = document.createElement('a-entity');
      container.id = 'container';
      container.setAttribute('position', '-3.33673 5 -6.12319');
      scene.appendChild(container);
      console.log('#container created at -3.33673 5 -6.12319');
    }

    // Clean previous run
    Array.from(container.querySelectorAll('[data-from-sheet="1"]')).forEach(el => el.remove());

    fetch(GVIZ_URL)
      .then(r => r.text())
      .then(text => {
        const json = JSON.parse(text.substring(text.indexOf("{"), text.lastIndexOf(")")));
        const rows = (json.table && json.table.rows) || [];
        if (!rows.length) { console.warn('No rows in sheet.'); return; }

        const items = [];
        // Expect header: Title | Image | Link
        for (let r=1; r<rows.length; r++){
          const c = rows[r].c || [];
          const title = c[0]?.v ?? "";
          let   image = c[1]?.v ?? "";
          const link  = c[2]?.v ?? "";

          // Bare filenames → assets/
          if (image && !/^https?:\/\//.test(image) && !image.includes('/') && !image.startsWith('#')){
            image = `assets/${image}`;
          }
          if (title || image || link){
            items.push({ title: encodeHtml(String(title)), image: String(image), link: String(link) });
          }
        }

        // Layout counters (exactly like your jQuery snippet)
        let r=0, i=0, p=0, h=0, pages=0;

        for (const it of items){
          const isModel = /\.(glb|gltf)(\?|$)/i.test(it.image);
          const xStr = `${i*2}.${i}`;        // 0.0, 2.1, 4.2, 6.3
          const yStr = (r*1.3).toString();   // 0, -1.3, -2.6, ...

          const html = `
            <a-image data-from-sheet="1"
                     position="${xStr} ${yStr} 0"
                     width="2" height="1"
                     crossorigin="anonymous"
                     ${it.link ? `link="href: ${it.link}"` : ""}
                     ${(!isModel && it.image) ? `src="${it.image}"` : ""}
                     event-set__enter="_event: mouseenter; _target: #highlight-${h}; visible: true"
                     event-set__leave="_event: mouseleave; _target: #highlight-${h}; visible: false">
              <a-entity geometry="primitive: plane; width: 2; height: .2"
                        material="color: #111"
                        text="align:center; value: ${it.title}"
                        position="0 -.6 0"></a-entity>
              <a-plane id="highlight-${h}" width="2.05" height="1.25"
                       material="shader: flat; color: white;"
                       position="0 -0.1 -0.01" visible="false"></a-plane>
              ${isModel ? `
                <a-entity gltf-model="url(${it.image})"
                          scale="${MODEL_SCALE}"
                          position="${MODEL_POS}"
                          rotation="${MODEL_ROT}"></a-entity>
              ` : ``}
            </a-image>
          `;
          container.insertAdjacentHTML('beforeend', html);

          // advance layout
          i++; h++;
          if (i === 4) { r--; i = 0; p++; }
          if (p === 3) { r += 20; p = 0; pages++; console.log(pages); }
        }
      })
      .catch(err => console.error('GViz fetch error:', err));
  });
})();
