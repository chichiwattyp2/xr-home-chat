// Shims to keep older components happy on A-Frame 1.7+
(function () {
  if (typeof AFRAME === 'undefined') return;

  // Legacy alias some older libs expect.
  const proto = (AFRAME.Entity && AFRAME.Entity.prototype) || HTMLElement.prototype;

  // getComputedAttribute -> getAttribute (old code sometimes calls the former)
  if (proto && !proto.getComputedAttribute) {
    proto.getComputedAttribute = proto.getAttribute;
  }

  // Old layout code calls getChildEntities(); re-add it using modern DOM.
  if (proto && !proto.getChildEntities) {
    proto.getChildEntities = function () {
      return Array.from(this.children || []).filter(function (c) { return c.isEntity; });
    };
  }
})();
