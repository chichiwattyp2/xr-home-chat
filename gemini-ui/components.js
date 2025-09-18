AFRAME.registerComponent('button-behavior', {
    init: function () {
        this.el.addEventListener('mouseenter', this.onEnter.bind(this));
        this.el.addEventListener('mouseleave', this.onLeave.bind(this));
        this.el.addEventListener('click', this.onClick.bind(this));
    },

    onEnter: function () {
        // Find the embedded HTML element and add 'focused' class for styling
        const htmlEmbedEl = this.el.components['html-embed'];
        if (htmlEmbedEl) {
            const htmlEl = htmlEmbedEl.renderer.renderElement;
            const buttonEl = htmlEl.querySelector('.ui-button');
            if (buttonEl) {
                buttonEl.classList.add('focused');
            }
        }
    },

    onLeave: function () {
        const htmlEmbedEl = this.el.components['html-embed'];
        if (htmlEmbedEl) {
            const htmlEl = htmlEmbedEl.renderer.renderElement;
            const buttonEl = htmlEl.querySelector('.ui-button');
            if (buttonEl) {
                buttonEl.classList.remove('focused');
            }
        }
    },

    onClick: function () {
        console.log('Button clicked!');
        // Add 'active' class briefly on click
        const htmlEmbedEl = this.el.components['html-embed'];
        if (htmlEmbedEl) {
            const htmlEl = htmlEmbedEl.renderer.renderElement;
            const buttonEl = htmlEl.querySelector('.ui-button');
            if (buttonEl) {
                buttonEl.classList.add('active');
                setTimeout(() => {
                    buttonEl.classList.remove('active');
                }, 200);
            }
        }
    }
});

AFRAME.registerComponent('orbiter', {
    schema: {
        parentEl: { type: 'selector' },
        radius: { type: 'number', default: 0.8 },
        speed: { type: 'number', default: 0.5 },
        elevation: { type: 'number', default: 0.2 }
    },
    tick: function (time, deltaTime) {
        if (!this.data.parentEl) return;

        const parentPos = this.data.parentEl.object3D.position;
        const orbitAngle = (time * this.data.speed) % 360;
        const x = parentPos.x + this.data.radius * Math.cos(orbitAngle * (Math.PI / 180));
        const z = parentPos.z + this.data.radius * Math.sin(orbitAngle * (Math.PI / 180));
        const y = parentPos.y + this.data.elevation;

        this.el.setAttribute('position', { x: x, y: y, z: z });
    }
});

AFRAME.registerComponent('panel-behavior', {
    init: function () {
        const el = this.el;
        el.setAttribute('elevation-transition', 'fromZ: -0.1; toZ: 0.3');
    }
});

AFRAME.registerComponent('elevation-transition', {
    schema: {
        fromZ: { type: 'number', default: -0.1 },
        toZ: { type: 'number', default: 0.3 },
        duration: { type: 'number', default: 500 } // in ms
    },
    init: function () {
        this.el.setAttribute('position', '0 1.6 ' + (this.data.fromZ - 1));
        setTimeout(() => {
            this.el.setAttribute('animation', {
                property: 'position',
                to: '0 1.6 ' + (this.data.toZ - 1),
                dur: this.data.duration,
                easing: 'easeOutQuad',
            });
        }, 100);
    }
});


AFRAME.registerComponent('gesture-handler', {
    schema: {
        target: { type: 'selector' }
    },
    init: function () {
        this.isPinched = false;
        this.initialDistance = null;
        this.initialScale = null;
        this.el.addEventListener('pinchend', this.onPinchEnd.bind(this));
        this.el.addEventListener('pinchstart', this.onPinchStart.bind(this));
        this.el.addEventListener('pinchmove', this.onPinchMove.bind(this));
    },

    onPinchStart: function (evt) {
        this.isPinched = true;
        this.initialDistance = this.getDistance(evt.detail.leftHand, evt.detail.rightHand);
        this.initialScale = this.data.target.object3D.scale.x;
    },

    onPinchEnd: function () {
        this.isPinched = false;
        this.initialDistance = null;
        this.initialScale = null;
    },

    onPinchMove: function (evt) {
        if (!this.isPinched || !this.initialDistance) return;

        const currentDistance = this.getDistance(evt.detail.leftHand, evt.detail.rightHand);
        if (currentDistance === 0) return;

        const scaleFactor = currentDistance / this.initialDistance;
        const newScale = this.initialScale * scaleFactor;

        this.data.target.object3D.scale.set(newScale, newScale, newScale);
    },

    getDistance: function (pos1, pos2) {
        return pos1.distanceTo(pos2);
    }
});