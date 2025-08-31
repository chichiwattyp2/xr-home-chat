// /js/init.js
(function () {
  function registerNAFSchema() {
    if (!(window.NAF && NAF.schemas)) return;
    const tmpl = document.getElementById('avatar-template');
    if (!tmpl) return; // wait until it exists

    // Only add once
    if (registerNAFSchema._added) return;
    registerNAFSchema._added = true;

    NAF.schemas.add({
      template: '#avatar-template',
      components: [
        'position',
        'rotation',
        { selector: '.head', component: 'material', property: 'color' }
      ]
    });
  }

  // Optional mobile prune
  if (window.AFRAME) {
    var isMobile = AFRAME.utils.device.isMobile();
    var particles = document.getElementById('particles');
    if (isMobile && particles && particles.parentNode) {
      particles.parentNode.removeChild(particles);
    }
  }

  // Run after DOM is parsed
  window.addEventListener('DOMContentLoaded', () => {
    // Try now…
    registerNAFSchema();

    // …and if the scene isn’t ready yet, wait for it.
    const scene = document.querySelector('a-scene');
    if (scene) scene.addEventListener('loaded', registerNAFSchema, { once: true });
  });
})();
