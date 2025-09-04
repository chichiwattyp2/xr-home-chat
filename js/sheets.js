 
// (Optional) keep your encoder
function encodeHtml(str) {
  var buf = [];
  for (var i = str.length - 1; i >= 0; i--) {
    buf.unshift(["&#", str[i].charCodeAt(), ";"].join(""));
  }
  return buf.join("");
}

$(function () {
  // ---- CONFIG ----
  const SHEET_ID = "1fy-ZztZlhwgfz1wH8YGji2zuiiEfV88XyCRBDzLB1AA";
  const GID = 9; // set this to the tab’s gid (check your sheet URL)
  const gvizUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${GID}`;

  // IMPORTANT: make the sheet “Anyone with the link → Viewer” so this works
  $.get(gvizUrl, function (text) {
    // Strip the GViz wrapper -> parse JSON
    const json = JSON.parse(text.substring(text.indexOf("{"), text.lastIndexOf(")") ));
    const rows = json.table.rows || [];

    const listings = [];
    // Assume first row is header: Title | Image | Link
    for (let r = 1; r < rows.length; r++) {
      const cells = rows[r].c || [];
      const title = cells[0]?.v ?? "";
      const image = cells[1]?.v ?? "";
      const link  = cells[2]?.v ?? "";

      if (title || image || link) {
        listings.push({
          title: encodeHtml(String(title)),
          image: String(image),
          link: String(link)
        });
      }
    }

    // --- render like your original ---
    let r = 0, i = 0, p = 0, h = 0, pages = 0;

    for (const listing of listings) {
      $("#container").append(`
        <a-image position="${i * 2}.${i} ${r * 1.3} 0"
                 width="2" height="1"
                 link="href: ${listing.link}"
                 src="${listing.image}"
                 event-set__enter="_event: mouseenter; _target: #highlight-${h}; visible: true"
                 event-set__leave="_event: mouseleave; _target: #highlight-${h}; visible: false">
          <a-entity
            geometry="primitive: plane; width: 2; height: .2"
            material="color: #111"
            text="align:center; value: ${listing.title}"
            position="0 -.6 0"></a-entity>
          <a-plane id="highlight-${h}" width="2.05" height="1.25"
                   material="shader: flat; color: white;"
                   position="0 -0.1 -0.01" visible="false"></a-plane>
        </a-image>
      `);

      i++; h++;
      if (i === 4) { r--; i = 0; p++; }
      if (p === 3) { r += 20; p = 0; pages++; console.log(pages); }
    }
  });
});
