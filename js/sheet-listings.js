/* js/sheet-listings.js */
(function () {
  'use strict';

  // (Optional) keep your encoder
  function encodeHtml(str) {
    var buf = [];
    for (var i = str.length - 1; i >= 0; i--) {
      buf.unshift(["&#", str[i].charCodeAt(), ";"].join(""));
    }
    return buf.join("");
  }

  // Ensure jQuery exists (loaded before this file)
  if (typeof window.$ === 'undefined') {
    console.warn('[sheet-listings] jQuery not found; skipping sheet render.');
    return;
  }

  $(function () {
    // ---- CONFIG ----
    var SHEET_ID = "1fy-ZztZlhwgfz1wH8YGji2zuiiEfV88XyCRBDzLB1AA";
    var GID = 9; // tab gid
    var gvizUrl = "https://docs.google.com/spreadsheets/d/" + SHEET_ID + "/gviz/tq?tqx=out:json&gid=" + GID;

    // IMPORTANT: make the sheet “Anyone with the link → Viewer”
    $.get(gvizUrl, function (text) {
      try {
        // Strip the GViz wrapper -> parse JSON
        var json = JSON.parse(text.substring(text.indexOf("{"), text.lastIndexOf(")")));
        var rows = (json.table && json.table.rows) || [];
        var listings = [];

        // Assume first row is header: Title | Image | Link
        for (var r = 1; r < rows.length; r++) {
          var cells = rows[r].c || [];
          var title = (cells[0] && cells[0].v) || "";
          var image = (cells[1] && cells[1].v) || "";
          var link  = (cells[2] && cells[2].v) || "";

          if (title || image || link) {
            listings.push({
              title: encodeHtml(String(title)),
              image: String(image),
              link: String(link)
            });
          }
        }

        // --- render like your original ---
        var rI = 0, i = 0, p = 0, h = 0, pages = 0;

        listings.forEach(function (listing) {
          $("#container").append(
            '<a-image position="' + (i * 2) + '.' + i + ' ' + (rI * 1.3) + ' 0"' +
              ' width="2" height="1"' +
              ' link="href: ' + listing.link + '"' +
              ' src="' + listing.image + '"' +
              ' event-set__enter="_event: mouseenter; _target: #highlight-' + h + '; visible: true"' +
              ' event-set__leave="_event: mouseleave; _target: #highlight-' + h + '; visible: false">' +
                '<a-entity geometry="primitive: plane; width: 2; height: .2"' +
                          ' material="color: #111"' +
                          ' text="align:center; value: ' + listing.title + '"' +
                          ' position="0 -.6 0"></a-entity>' +
                '<a-plane id="highlight-' + h + '" width="2.05" height="1.25"' +
                         ' material="shader: flat; color: white;"' +
                         ' position="0 -0.1 -0.01" visible="false"></a-plane>' +
            '</a-image>'
          );

          i++; h++;
          if (i === 4) { rI--; i = 0; p++; }
          if (p === 3) { rI += 20; p = 0; pages++; }
        });
      } catch (e) {
        console.error('[sheet-listings] Failed to parse/render sheet:', e);
      }
    });
  });
})();
