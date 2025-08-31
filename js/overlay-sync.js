// A-Frame 1.0.4 does not support DOM overlay in AR.
// Hide the DOM UI (#overlay) while in AR/VR; show it otherwise.
(function () {
  function bind() {
    const scene = document.querySelector('a-scene');
    const overlay = document.getElementById('overlay');
    if (!scene || !overlay) return;

    const sync = () => {
      const inXR = scene.is('vr-mode') || scene.is('ar-mode');
      overlay.style.display = inXR ? 'none' : '';
    };

    scene.addEventListener('enter-vr', sync);
    scene.addEventListener('exit-vr', sync);
    sync();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else bind();
})();
