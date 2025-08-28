const CONFIG = {
    canvasWidth: 3000,
    canvasHeight: 3000,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    worldBorderWidth: 20
};

// DOM Elements
const infoCanvas = document.getElementById('infoCanvas');

// Canvas setup
const ctx = infoCanvas.getContext('2d');
ctx.imageSmoothingEnabled = false;