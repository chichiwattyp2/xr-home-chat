// Build tiles from a public Google Sheet (optional). Requires jQuery.
(function () {
  if (typeof window.jQuery === 'undefined') {
    console.warn('[sheet-listings] jQuery not found; skipping sheet render.');
    return;
  }
  const $ = window.jQuery;

  // ---- CONFIG ----
  const SHEET_ID = "1fy-ZztZlhwgfz1wH8YGji2zuiiEfV88XyCRBDzLB1AA";
  const GID = 9; // target tab gid
  const gvizUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${GID}`;

  function encodeHtml(str) {
    var buf = [];
    for (var i = str.length - 1; i >= 0; i--) {
      buf.unshift(["&#", str[i].charCodeAt(), ";"].join(""));
    }
    return buf.join("");
  }

  $.get(gvizUrl).done(function (text) {
    try {
      const json = JSON.parse(text.substring(text.indexOf("{"), text.lastIndexOf(")")));
      const rows = json.table.rows || [];
      const listings = [];
      for (let r = 1; r < rows.length; r++) {
        const cells = rows[r].c || [];
        const title = cells[0]?.v ?? "";
        const image = cells[1]?.v ?? "";
        const link  = cells[2]?.v ?? "";
        if (title || image || link) {
          listings.push({
            title: encodeHtml(String(title)),
            image: String(image),
            link:  String(link)
          });
        }
      }

      const $container = $('#container');
      let r = 0, i = 0, p = 0, h = 0, pages = 0;

      listings.forEach(listing => {
        $container.append(`
          <a-image class="clickable"
                   position="${i * 2}.${i} ${r * 1.3} 0"
                   width="2" height="1"
                   src="${listing.image}"
                   link="href: ${listing.link}">
            <a-entity geometry="primitive: plane; width: 2; height: .2"
                      material="color: #111"
                      text="align:center; value: ${listing.title}"
                      position="0 -.6 0"></a-entity>
            <a-plane width="2.05" height="1.25"
                     material="shader: flat; color: white;"
                     position="0 -0.1 -0.01" visible="false"></a-plane>
          </a-image>
        `);
        i++; h++;
        if (i === 4) { r--; i = 0; p++; }
        if (p === 3) { r += 20; p = 0; pages++; }
      });

      // ensure new tiles are raycastable for both mouse & VR cursor
      document.querySelectorAll('#container [link]').forEach(el => {
        el.classList.add('clickable');
        el.setAttribute('data-raycastable', '');
      });
    } catch (e) {
      console.warn('[sheet-listings] parse failed:', e);
    }
  }).fail(function (xhr, status) {
    console.warn('[sheet-listings] request failed:', status);
  });
})();
