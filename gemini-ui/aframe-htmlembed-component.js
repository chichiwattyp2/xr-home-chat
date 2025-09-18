if (typeof AFRAME === 'undefined') {
  throw new Error('Component attempted to register before AFRAME was available.');
}

const HTMLCanvas = require('htmlcanvas.js');

const IDENTIFIER = "htmlembed";

AFRAME.registerSystem(IDENTIFIER, {
  init: function() {
    HTMLCanvas.generatePageCSS();
  },
  remove: function() {
    HTMLCanvas.cssgenerated = [];
    HTMLCanvas.cssembed = [];
    HTMLCanvas.cssEmbedEncodedCache = null;
  }
});
AFRAME.registerComponent(IDENTIFIER, {
  schema: {
    ppu: {
      type: 'number',
      default: 256
    }
  },
  init: function() {
    this._onRaycasterIntersected = AFRAME.utils.bind(this._onRaycasterIntersected, this);
    this._onRaycasterIntersectedCleared = AFRAME.utils.bind(this._onRaycasterIntersectedCleared, this);
    this._onMouseDown = AFRAME.utils.bind(this._onMouseDown, this);
    this._onMouseUp = AFRAME.utils.bind(this._onMouseUp, this);

    let htmlcanvas = new HTMLCanvas(this.el, () => {
      if (!!this.texture) {
        this.texture.needsUpdate = true;
      }
    }, (event, data) => {
      switch (event) {
        case 'resize':
          this.el.emit("resize");
          break;
        case 'rendered':
          this.el.emit("rendered");
          break;
        case 'focusableenter':
          this.el.emit("focusableenter", data);
          break;
        case 'focusableleave':
          this.el.emit("focusableleave", data);
          break;
        case 'inputrequired':
          this.el.emit("inputrequired", data);
          break;
      }
    });
    this.htmlcanvas = htmlcanvas;
    let texture = new THREE.CanvasTexture(this.htmlcanvas.canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true
    });
    this.texture = texture;
    let geometry = new THREE.PlaneGeometry();
    let screen = new THREE.Mesh(geometry, material);
    this.el.setObject3D('screen', screen);
    this.screen = screen;

    this.resize();
  },
  play: function () {
    this.el.addEventListener('raycaster-intersected', this._onRaycasterIntersected);
    this.el.addEventListener('raycaster-intersected-cleared', this._onRaycasterIntersectedCleared);
    this.el.addEventListener('mousedown', this._onMouseDown);
    this.el.addEventListener('mouseup', this._onMouseUp);
  },
  pause: function() {
    this.el.removeEventListener('raycaster-intersected', this._onRaycasterIntersected);
    this.el.removeEventListener('raycaster-intersected-cleared', this._onRaycasterIntersectedCleared);
    this.el.removeEventListener('mousedown', this._onMouseDown);
    this.el.removeEventListener('mouseup', this._onMouseUp);
  },
  _onRaycasterIntersected: function(evt) {
    this.raycaster = evt.detail.el;
  },
  _onRaycasterIntersectedCleared: function(evt) {
    this.htmlcanvas.clearHover();
    this.raycaster = null;
  },
  _onMouseDown: function(evt) {
    if (evt instanceof CustomEvent) {
      this._updateLastCanavasXY();
      this.htmlcanvas.mousedown(this.lastX, this.lastY);      
    } else {
      evt.stopPropagation();
    }
  },
  _onMouseUp: function(evt) {
    if (evt instanceof CustomEvent) {
      this._updateLastCanavasXY();
      this.htmlcanvas.mouseup(this.lastX, this.lastY);
    } else {
      evt.stopPropagation();
    }
  },
  resize() {
    this.width = this.htmlcanvas.width / this.data.ppu;
    this.height = this.htmlcanvas.height / this.data.ppu;
    this.screen.scale.x = Math.max(0.0001,this.width);
    this.screen.scale.y = Math.max(0.0001,this.height);
  },
  update() {
    this.resize();
  },
  forceRender() {
    this.htmlcanvas.forceRender();
  },
  tick: function() {
    this.resize();
    this._updateLastCanavasXY();
  },
  remove: function() {
    this.el.removeObject3D('screen');
    this.htmlcanvas.cleanUp();
    this.htmlcanvas = null;
  },
  _updateLastCanavasXY: function() {
    if (!this.raycaster) {
      return;
    }

    let intersection = this.raycaster.components.raycaster.getIntersection(this.el);
    if (!intersection) {
      if (this.htmlcanvas.overElements.length > 0) {
        this.htmlcanvas.clearHover();
      }
      return;
    }
    let localPoint = intersection.point;
    this.el.object3D.worldToLocal(localPoint);
    let w = this.width / 2;
    let h = this.height / 2;
    let x = Math.round((localPoint.x + w) / this.width * this.htmlcanvas.canvas.width);
    let y = Math.round((1 - (localPoint.y + h) / this.height) * this.htmlcanvas.canvas.height);
    if (this.lastX != x || this.lastY != y) {
      this.htmlcanvas.mousemove(x, y);
    }
    this.lastX = x;
    this.lastY = y;
  }
});
