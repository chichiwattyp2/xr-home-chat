/* js/typer-component.js */
(function () {
  'use strict';

  if (!window.AFRAME) {
    console.warn('[typer-component] A-Frame not found; skipping.');
    return;
  }

  AFRAME.registerComponent("typer", {
    dependencies: ["text", "sound__typer", "sound__beep"],
    schema: {
      message: { type: "string" },
      speed: { type: "int", default: 50 },
      prefix: { type: "string" },
      cursorChar: { type: "string", default: "|" },
      cursorSpeed: { type: "int", default: 500 },
      wrapChar: { type: "string", default: "\\" },
      on: { type: "string", default: "loaded" }
    },

    init: function () {
      this.cursorVisible = true;
      this.output = "";
      this.char = 0;
      this.timer = null;

      this.el.addEventListener(this.data.on, function () {
        if (this.timer) {
          clearInterval(this.timer);
          this.timer = null;
          this.char = 0;
          this.output = "";
          this.el.components.sound__typer.stopSound();
          return;
        }

        this.timer = setInterval(this.printMessage.bind(this), this.data.speed);
      }.bind(this));
    },

    printMessage: function () {
      if (this.char < this.data.message.length) {
        if (this.char === 0) this.el.components.sound__typer.playSound();

        if (this.data.message.charAt(this.char) === this.data.wrapChar) {
          this.el.components.sound__typer.stopSound();
          this.el.components.sound__typer.playSound();
        }

        this.output += this.data.message.charAt(this.char);
        this.el.setAttribute(
          "text",
          "value",
          (this.data.prefix || "") + this.output + this.data.cursorChar
        );
      } else if (this.char >= this.data.message.length) {
        if (this.char === this.data.message.length) {
          this.el.components.sound__typer.stopSound();
          this.el.components.sound__beep.playSound();
        }

        if (this.char % (this.data.cursorSpeed / this.data.speed) === 0) {
          this.cursorVisible = !this.cursorVisible;
          this.el.setAttribute(
            "text",
            "value",
            this.output + (this.cursorVisible ? " " : this.data.cursorChar)
          );
        }
      }
      this.char++;
    }
  });
})();
