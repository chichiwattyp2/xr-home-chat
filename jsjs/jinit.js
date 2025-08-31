// /js/init.js
(function () {
  if (!window.AFRAME) return;

  // Optional mobile prune (only if you have #particles)
  var isMobile = AFRAME.utils.device.isMobile();
  var particles = document.getElementById('particles');
  if (isMobile && particles && particles.parentNode) {
    particles.parentNode.removeChild(particles);
  }

  // If you're using Networked-Aframe, register the avatar schema
  if (window.NAF && NAF.schemas) {
    NAF.schemas.add({
      template: '#avatar-template',
      components: [
        'position',
        'rotation',
        { selector: '.head', component: 'material', property: 'color' }
      ]
    });
  } else {
    // harmless if not using NAF
    // console.warn('[init] NAF not detected; schema not registered.');
  }
})();
