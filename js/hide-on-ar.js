if (window.AFRAME) {
  AFRAME.registerComponent('hide-on-ar', {
    init() {
      this.wasVisible = this.el.getAttribute('visible') !== false;
      this.onEnterVR = this.onEnterVR.bind(this);
      this.onExitVR  = this.onExitVR.bind(this);
      this.el.sceneEl.addEventListener('enter-vr', this.onEnterVR);
      this.el.sceneEl.addEventListener('exit-vr',  this.onExitVR);
    },
    onEnterVR() {
      if (this.el.sceneEl.is('ar-mode')) {
        this.prevVisible = this.el.getAttribute('visible');
        this.el.setAttribute('visible', false);
      }
    },
    onExitVR() {
      this.el.setAttribute('visible',
        this.prevVisible !== undefined ? this.prevVisible : this.wasVisible);
    },
    remove() {
      const s = this.el.sceneEl;
      s.removeEventListener('enter-vr', this.onEnterVR);
      s.removeEventListener('exit-vr',  this.onExitVR);
    }
  });
}
