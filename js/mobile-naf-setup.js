/* js/mobile-naf-setup.js */
(function () {
  'use strict';

  function onReady(fn) {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(fn, 0);
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }
  }

  onReady(function () {
    // Remove #particles on mobile if present
    try {
      if (window.AFRAME && AFRAME.utils && AFRAME.utils.device.isMobile()) {
        var particles = document.getElementById('particles');
        if (particles && particles.parentNode) particles.parentNode.removeChild(particles);
      }
    } catch (e) {
      // no-op
    }

    // Networked-Aframe schema (if NAF present)
    if (window.NAF && NAF.schemas && typeof NAF.schemas.add === 'function') {
      NAF.schemas.add({
        template: "#avatar-template",
        components: [
          "position",
          "rotation",
          { selector: ".head", component: "material", property: "color" }
        ]
      });
    } else {
      console.warn('[mobile-naf-setup] NAF not detected; schema not registered.');
    }
  });
})();
