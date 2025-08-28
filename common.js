// Configuration
const CONFIG = {
  defaultServerUrl: "http://localhost:3000",
  version: "1.0.0",
  pingInterval: 1000,
  canvasWidth: 3000,
  canvasHeight: 3000,
  screenWidth: window.innerWidth,
  screenHeight: window.innerHeight,
  playerRadius: 32,
  maxVelocity: 10,
  acceleration: 0.5,
  friction: 0.9,
  worldBorderWidth: 20,
};

// DOM Elements
const playerSetup = document.getElementById("playerSetup");
const gameCanvas = document.getElementById("gameCanvas");
const serverUrlInput = document.getElementById("serverUrlInput");
const nameInput = document.getElementById("nameInput");
const joinButton = document.getElementById("joinButton");
const latencyInfo = document.getElementById("latencyInfo");
const pingDisplay = document.getElementById("pingDisplay");
const jitterDisplay = document.getElementById("jitterDisplay");
const predictionDisplay = document.getElementById("predictionDisplay");
// const characterOptions = document.querySelectorAll(".character-option");
const info = document.getElementById("info");
const connectEl = document.getElementById("connection");
const tutorialEl = document.getElementById("tutorial-overlay-template");
const zoneTopLeft = document.getElementById("zone-top-left");
const zoneTopCenter = document.getElementById("zone-top-center");
const zoneTopRight = document.getElementById("zone-top-right");
const zoneMiddleLeft = document.getElementById("zone-middle-left");
const zoneMiddle = document.getElementById("zone-middle");
const zoneMiddleRight = document.getElementById("zone-middle-right");
const zoneBottomLeft = document.getElementById("zone-bottom-left");
const zoneBottomCenter = document.getElementById("zone-bottom-center");
const zoneBottomRight = document.getElementById("zone-bottom-right");

const camera = {
  _x: CONFIG.canvasWidth / 2,
  _y: CONFIG.canvasHeight / 2,
  _container: null,
  _rafId: null,
  _target: { x: 0, y: 0 },
  _smoothness: 0.1,

  get x() {
    return this._x;
  },

  get y() {
    return this._y;
  },

  init(container) {
    this._container = container;
    this._update();
  },

  _update() {
    // Smooth interpolation
    this._x += (this._target.x - this._x) * this._smoothness;
    this._y += (this._target.y - this._y) * this._smoothness;

    // Apply transform only if significant change
    if (
      Math.abs(this._target.x - this._x) > 0.1 ||
      Math.abs(this._target.y - this._y) > 0.1
    ) {
      this._container.style.transform = `translate(${-this._x}px, ${-this
        ._y}px)`;
    }

    // Continue update loop
    this._rafId = requestAnimationFrame(() => this._update());
  },

  // Setter method
  set(property, value) {
    if (property === "x") {
      // Correctly center the character
      this._target.x = value - window.innerWidth / 2;
    } else if (property === "y") {
      // Correctly center the character
      this._target.y = value - window.innerHeight / 2;
    }
  },
};

camera.init(info);

function animateBackgroundBlur(elementId, duration = 2000) {
  // const element = document.getElementById(elementId);
  // if (!element) {
  //   console.error(`Element with id ${elementId} not found`);
  //   return;
  // }
  // // Set initial state
  // element.style.transition = `filter ${duration}ms ease-out`;
  // element.style.filter = "blur(200px)";
  // // Trigger reflow
  // element.offsetWidth;
  // // Animate to 0 blur
  // requestAnimationFrame(() => {
  //   element.style.filter = "blur(0px)";
  // });
  // // Clean up transition
  // setTimeout(() => {
  //   element.style.transition = "";
  // }, duration);
}

// class TutorialOverlay {
//     constructor(options = {}) {
//         this.options = {
//             storageKey: 'game-tutorial-shown',
//             ...options
//         };
//         this.template = document.getElementById('tutorial-overlay-template');
//     }

//     show() {
//         // Check if tutorial has been shown before
//         if (localStorage.getItem(this.options.storageKey)) return;

//         // Clone template
//         const overlay = this.template.content.cloneNode(true);
//         const overlayElement = overlay.querySelector('.tutorial-overlay');
//         const closeButton = overlay.querySelector('.tutorial-close');

//         // Add to body
//         document.body.appendChild(overlay);

//         // Close functionality
//         const close = () => {
//             document.body.removeChild(overlayElement);
//             localStorage.setItem(this.options.storageKey, 'true');
//         };

//         // Close on button click
//         closeButton.addEventListener('click', close);

//         // Optional: Close on outside click
//         overlayElement.addEventListener('click', (e) => {
//             if (e.target === overlayElement) close();
//         });
//     }

//     // Method to reset tutorial (if needed)
//     reset() {
//         localStorage.removeItem(this.options.storageKey);
//     }
// }

let selectedColor = "#7700ffff"; // Default color

class TutorialMovement {
  constructor() {
    this.keyUPPressedOnce = false;
    this.keyDOWNPressedOnce = false;
    this.keyLEFTPressedOnce = false;
    this.keyRIGHTPressedOnce = false;
    this.upKeyEl = document.getElementById("tutorial-up-key");
    this.downKeyEl = document.getElementById("tutorial-down-key");
    this.leftKeyEl = document.getElementById("tutorial-left-key");
    this.rightKeyEl = document.getElementById("tutorial-right-key");
    this.hideTimeout = null;
  }

  markKeyPressed(key) {
    switch (key) {
      case "up":
        this.keyUPPressedOnce = true;
        this.upKeyEl.classList.add("activated");
        break;
      case "down":
        this.keyDOWNPressedOnce = true;
        this.downKeyEl.classList.add("activated");
        break;
      case "left":
        this.keyLEFTPressedOnce = true;
        this.leftKeyEl.classList.add("activated");
        break;
      case "right":
        this.keyRIGHTPressedOnce = true;
        this.rightKeyEl.classList.add("activated");
        break;
      default:
        break;
    }

    this.checkTutorialCompletion();
  }

  checkTutorialCompletion() {
    if (!this.isTutorialCompleted()) return;

    if (this.hideTimeout) return;

    this.hideTimeout = setTimeout(() => {
      tutorialEl.classList.add("hidden");
      this.hideTimeout = null;
    }, 1000);
  }

  isTutorialCompleted() {
    if (
      this.keyUPPressedOnce &&
      this.keyDOWNPressedOnce &&
      this.keyLEFTPressedOnce &&
      this.keyRIGHTPressedOnce
    ) {
      return true;
    }
    return false;
  }
}

const tutorialMovement = new TutorialMovement();

class ZonesManager {
  constructor() {
    this.prevZone = null;
    this.playersStates = {};
  }

  initPlayer(playerId) {
    if (this.playersStates[playerId]) return;

    this.playersStates[playerId] = {
      x: 0,
      y: 0,
      lastDrawTime: Date.now(),
      lastDrawX: 0,
      lastDrawY: 0,
    };
  }

  updatePlayer(playerId, x, y) {
    if (!this.playersStates[playerId]) {
      this.initPlayer(playerId);
    }

    if (
      this.playersStates[playerId].x === x &&
      this.playersStates[playerId].y === y
    )
      return;

    this.playersStates[playerId].x = x;
    this.playersStates[playerId].y = y;
    this.playersStates[playerId].lastDrawTime = Date.now();

    // console.log("Updating player:", playerId, x, y);

    // const zone = this.getZoneAt(x, y);

    // if (zone === zoneMiddleLeft) {
    //   // it's a draw zone
    //   if (
    //     Math.abs(this.playersStates[playerId].lastDrawX - x) > 40 ||
    //     Math.abs(this.playersStates[playerId].lastDrawY - y) > 40
    //   ) {
    //     // can draw
    //     this.playersStates[playerId].lastDrawX = x;
    //     this.playersStates[playerId].lastDrawY = y;
    //     this.playersStates[playerId].lastDrawTime = Date.now();

    //     if (socket) {
    //       socket?.emit("playerDraw", {
    //         zone: "middleLeft",
    //         id: playerId,
    //         x: x,
    //         y: y,
    //       });
    //     }
    //   }
    // }
  }

  destroyPlayer(playerId) {
    delete this.playersStates[playerId];
  }

  localPlayerMoveAt(playerId, x, y) {
    const zone = this.getZoneAt(x, y);

    this.updatePlayer(playerId, x, y);

    if (zone !== this.prevZone) {
      this.prevZone?.classList.remove("active");
      this.prevZone = zone;

      if (zone === zoneMiddle) return;
      if (zone === zoneTopCenter) return;
      if (zone === zoneBottomCenter) return;
      if (zone === zoneMiddleRight) return;
      if (zone === zoneMiddleLeft) return;

      zone.classList.add("active");
    }
  }

  drawAtZone(playerId, x, y) {}

  getZoneAt(x, y) {
    if (
      x >= 0 &&
      x <= (CONFIG.canvasWidth - 300) / 2 &&
      y >= 0 &&
      y <= (CONFIG.canvasHeight - 300) / 2
    ) {
      return zoneTopLeft;
    } else if (
      x >= (CONFIG.canvasWidth - 300) / 2 &&
      x <= (CONFIG.canvasWidth - 300) / 2 + 300 &&
      y >= 0 &&
      y <= (CONFIG.canvasHeight - 300) / 2
    ) {
      return zoneTopCenter;
    } else if (
      x >= (CONFIG.canvasWidth - 300) / 2 + 300 &&
      x <= CONFIG.canvasWidth &&
      y >= 0 &&
      y <= (CONFIG.canvasHeight - 300) / 2
    ) {
      return zoneTopRight;
    } else if (
      x >= 0 &&
      x <= (CONFIG.canvasWidth - 300) / 2 &&
      y >= (CONFIG.canvasHeight - 300) / 2 &&
      y <= (CONFIG.canvasHeight - 300) / 2 + 300
    ) {
      return zoneMiddleLeft;
    } else if (
      x >= (CONFIG.canvasWidth - 300) / 2 &&
      x <= (CONFIG.canvasWidth - 300) / 2 + 300 &&
      y >= (CONFIG.canvasHeight - 300) / 2 &&
      y <= (CONFIG.canvasHeight - 300) / 2 + 300
    ) {
      return zoneMiddle;
    } else if (
      x >= (CONFIG.canvasWidth - 300) / 2 + 300 &&
      x <= CONFIG.canvasWidth &&
      y >= (CONFIG.canvasHeight - 300) / 2 &&
      y <= (CONFIG.canvasHeight - 300) / 2 + 300
    ) {
      return zoneMiddleRight;
    } else if (
      x >= 0 &&
      x <= (CONFIG.canvasWidth - 300) / 2 &&
      y >= (CONFIG.canvasHeight - 300) / 2 + 300 &&
      y <= CONFIG.canvasHeight
    ) {
      return zoneBottomLeft;
    } else if (
      x >= (CONFIG.canvasWidth - 300) / 2 &&
      x <= (CONFIG.canvasWidth - 300) / 2 + 300 &&
      y >= (CONFIG.canvasHeight - 300) / 2 + 300 &&
      y <= CONFIG.canvasHeight
    ) {
      return zoneBottomCenter;
    } else if (
      x >= (CONFIG.canvasWidth - 300) / 2 + 300 &&
      x <= CONFIG.canvasWidth &&
      y >= (CONFIG.canvasHeight - 300) / 2 + 300 &&
      y <= CONFIG.canvasHeight
    ) {
      return zoneBottomRight;
    }
  }
}

const zonesManager = new ZonesManager();

document.addEventListener("DOMContentLoaded", () => {
  const md = new MobileDetect(window.navigator.userAgent, 1000);
  if (md.mobile() || window.innerWidth < 1000 || window.innerHeight < 600) {
    const el = document.getElementById("mobile-warning");

    if (el) {
      el.style.display = "flex";
    }
  }

  const colorOptions = document.querySelectorAll(".color-option");
  colorOptions.forEach((option) => {
    option.addEventListener("click", () => {
      // Remove selected from all
      colorOptions.forEach((opt) => opt.classList.remove("selected"));

      // Add selected to clicked
      option.classList.add("selected");

      // Get selected color
      selectedColor = option.dataset.color;

      // Optional: Trigger color change event
      const event = new CustomEvent("colorChanged", {
        detail: { color: selectedColor },
      });
      document.dispatchEvent(event);
    });

    // Select first color by default
    colorOptions[0].classList.add("selected");
  });

  // Expose selected color getter
  window.getSelectedColor = () => selectedColor;

  // const tutorial = new TutorialOverlay();
  // tutorial.show();

  animateBackgroundBlur("playerSetup");
});
