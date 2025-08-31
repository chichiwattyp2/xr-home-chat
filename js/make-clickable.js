// Make anything with a [link] component clickable by mouse (non-VR) and VR cursors.
(function () {
  function tagClickable() {
    // A-Frame parses components after DOMContentLoaded; give a tick for safety.
    setTimeout(() => {
      const withLink = document.querySelectorAll('[link]:not(.clickable)');
      withLink.forEach(el => {
        el.classList.add('clickable');
        el.setAttribute('data-raycastable', ''); // also hits the VR <a-cursor> raycaster
      });
    }, 0);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tagClickable);
  } else tagClickable();
})();
