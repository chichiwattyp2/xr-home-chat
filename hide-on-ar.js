AFRAME.registerComponent('hide-on-ar', {
  init() {
    this.wasVisible = this.el.getAttribute('visible') !== false;
    this.onEnterVR = this.onEnterVR.bind(this);
    this.onExitVR  = this.onExitVR.bind(this);
    this.el.sceneEl.addEventListener('enter-vr', this.onEnterVR);
    this.el.sceneEl.addEventListener('exit-vr',  this.onExitVR);
  },
  onEnterVR() {
    const scene = this.el.sceneEl;
    if (scene.is('ar-mode')) {
      this.prevVisible = this.el.getAttribute('visible');
      this.el.setAttribute('visible', false);
    }
  },
  onExitVR() {
    this.el.setAttribute('visible',
      this.prevVisible !== undefined ? this.prevVisible : this.wasVisible);
  },
  remove() {
    const scene = this.el.sceneEl;
    scene.removeEventListener('enter-vr', this.onEnterVR);
    scene.removeEventListener('exit-vr',  this.onExitVR);
  }
});
