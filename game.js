class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.radius = Math.random() * 3 + 1;
    this.speedX = (Math.random() - 0.5) * 2;
    this.speedY = (Math.random() - 0.5) * 2;
    this.alpha = 1;
    this.lifetime = 30; // frames
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.alpha -= 1 / this.lifetime;
    this.radius *= 0.95;
  }

  draw(ctx, cameraX, cameraY) {
    ctx.beginPath();
    ctx.arc(this.x - cameraX, this.y - cameraY, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${this.color}, ${this.alpha})`;
    ctx.fill();
  }
}

// Particle system in game.js
class ParticleSystem {
  constructor() {
    this.particles = {};
    this.particleTemplates = [
      { color: "#99ff008c", size: 5 },
      { color: "#6118f277", size: 5 },
    ];
  }

  spawn(playerId, x, y) {
    // Create player particles array if not exists
    if (!this.particles[playerId]) {
      this.particles[playerId] = [];
    }

    // Spawn multiple particles with variation
    for (let i = 0; i < 3; i++) {
      let template = this.particleTemplates[0];

      if (players[playerId].color === "#9BFF00") {
        template = this.particleTemplates[1];
      } else if (players[playerId].color === "#6018F2") {
        template = this.particleTemplates[0];
      }

      this.particles[playerId].push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        color: template.color,
        size: template.size,
        lifetime: 30,
      });
    }
  }

  update() {
    // Update particles for all players
    for (const playerId in this.particles) {
      const playerParticles = this.particles[playerId];

      for (let i = playerParticles.length - 1; i >= 0; i--) {
        const particle = playerParticles[i];

        // Move
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Fade and shrink
        particle.lifetime--;

        // Remove dead particles
        if (particle.lifetime <= 0) {
          playerParticles.splice(i, 1);
        }
      }

      // Remove player's particle array if empty
      if (playerParticles.length === 0) {
        delete this.particles[playerId];
      }
    }
  }

  draw(ctx, camera) {
    // Draw particles for all players
    for (const playerId in this.particles) {
      this.particles[playerId].forEach((particle) => {
        // Calculate screen position
        const screenX = particle.x - camera.x;
        const screenY = particle.y - camera.y;

        // Draw particle
        ctx.beginPath();
        ctx.rect(screenX, screenY, particle.size, particle.size);
        ctx.fillStyle = particle.color;
        ctx.fill();
      });
    }
  }
}

const particleSystem = new ParticleSystem();

// Character Images
const characterImages = {
  1: new Image(),
  2: new Image(),
  3: new Image(),
  4: new Image(),
};

// Predefined character data
const characterData = [
  {
    id: 1,
    name: "Character 1",
    src: "characters/character1.png",
  },
  {
    id: 2,
    name: "Character 2",
    src: "characters/character2.png",
  },
  {
    id: 3,
    name: "Character 3",
    src: "characters/character3.png",
  },
  {
    id: 4,
    name: "Character 4",
    src: "characters/character4.png",
  },
];

// Preload images
characterData.forEach((charData) => {
  characterImages[charData.id].src = charData.src;
  characterImages[charData.id].imageSmoothingEnabled = false;
});

// Canvas setup
const ctx = gameCanvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

// Game state variables
let socket = null;
const players = {};
let localPlayer = null;
let selectedCharacterId = 1;

// Movement state
const movement = {
  up: false,
  down: false,
  left: false,
  right: false,
};

// Character selection
// characterOptions.forEach((option) => {
//   option.addEventListener("click", () => {
//     // Remove selected class from all options
//     characterOptions.forEach((opt) => opt.classList.remove("selected"));

//     // Add selected class to clicked option
//     option.classList.add("selected");

//     // Get selected character ID
//     selectedCharacterId = parseInt(option.dataset.characterId);
//   });
// });

// Create latency predictor
const latencyPredictor = new LatencyPredictor();

// Player class
class Player {
  constructor(id, name, color, x, y, characterId = 1) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.characterId = characterId;
    this.characterImage = characterImages[characterId] || characterImages[1];
  }

  update() {
    // Apply movement based on key presses
    if (movement.up)
      this.vy = Math.max(this.vy - CONFIG.acceleration, -CONFIG.maxVelocity);
    if (movement.down)
      this.vy = Math.min(this.vy + CONFIG.acceleration, CONFIG.maxVelocity);
    if (movement.left)
      this.vx = Math.max(this.vx - CONFIG.acceleration, -CONFIG.maxVelocity);
    if (movement.right)
      this.vx = Math.min(this.vx + CONFIG.acceleration, CONFIG.maxVelocity);

    // Apply friction when no key is pressed
    if (!movement.up && !movement.down) {
      this.vy *= CONFIG.friction;
      if (Math.abs(this.vy) < 0.1) this.vy = 0;
    }
    if (!movement.left && !movement.right) {
      this.vx *= CONFIG.friction;
      if (Math.abs(this.vx) < 0.1) this.vx = 0;
    }

    // Update position
    this.x += this.vx;
    this.y += this.vy;

    // Constrain to canvas
    this.x = Math.max(
      CONFIG.playerRadius,
      Math.min(CONFIG.canvasWidth - CONFIG.playerRadius, this.x)
    );
    this.y = Math.max(
      CONFIG.playerRadius,
      Math.min(CONFIG.canvasHeight - CONFIG.playerRadius, this.y)
    );

    if (this.id === localPlayer.id) {
      zonesManager.localPlayerMoveAt(localPlayer.id, this.x, this.y);
    }

    return this.vx !== 0 || this.vy !== 0;
  }
}

let drawZoneMiddleLeftData = [];

function drawPlayerSVG(ctx, x, y, fillColor, size = 64) {
  // Original SVG dimensions
  const originalWidth = 279;
  const originalHeight = 369;

  // Scale factor to resize the original SVG
  const scaleFactor = size / Math.max(originalWidth, originalHeight);

  ctx.save();

  // Translate to the center point
  ctx.translate(x, y);

  // Scale and adjust for center
  ctx.scale(scaleFactor, scaleFactor);
  // ctx.translate(-originalWidth/2, -originalHeight/2);

  // Fill color function
  ctx.fillStyle = fillColor;

  // Path drawing function
  const drawPath = (pathData) => {
    const path = new Path2D(pathData);
    ctx.fill(path);
  };

  // Paths from the SVG
  const paths = [
    "M170.92 353.421C170.92 361.982 158.265 368.922 142.653 368.922C127.042 368.922 114.387 361.982 114.387 353.421C114.387 344.86 127.042 337.92 142.653 337.92C158.265 337.92 170.92 344.86 170.92 353.421Z",
    "M52.388 242.026C52.388 196.124 91.9869 68.0066 140.835 68.0066C189.682 68.0066 229.281 196.124 229.281 242.026C229.281 287.929 189.682 325.14 140.835 325.14C91.9869 325.14 52.388 287.929 52.388 242.026Z",
    "M273.607 198.285C270.702 203.736 251.248 197.462 230.157 184.271C209.065 171.08 194.322 155.968 197.228 150.517C200.133 145.065 219.587 151.339 240.678 164.53C261.77 177.721 276.513 192.834 273.607 198.285Z",
    "M89.1601 157.169C88.9097 163.427 68.8491 168.501 44.3536 168.501C19.8581 168.501 0.203692 163.427 0.454175 157.169C0.704658 150.91 20.7652 145.837 45.2607 145.837C69.7562 145.837 89.4106 150.91 89.1601 157.169Z",
    "M153.867 31.545C153.867 48.6669 147.743 62.5469 140.189 62.5469C132.636 62.5469 126.512 48.6669 126.512 31.545C126.512 14.4231 132.636 0.54303 140.189 0.54303C147.743 0.54303 153.867 14.4231 153.867 31.545Z",
    "M131.132 32.6028C143.165 44.6362 148.855 58.4558 143.841 63.4697C138.828 68.4836 125.008 62.7932 112.975 50.7598C100.941 38.7264 95.2507 24.9068 100.265 19.8929C105.279 14.879 119.098 20.5694 131.132 32.6028Z",
    "M167.068 50.7506C155.034 62.784 141.215 68.4745 136.201 63.4605C131.187 58.4466 136.877 44.627 148.911 32.5936C160.944 20.5602 174.764 14.8698 179.778 19.8837C184.792 24.8976 179.101 38.7172 167.068 50.7506Z",
  ];

  // Draw each path
  paths.forEach(drawPath);

  ctx.restore();
}

function drawMiddleLeftZone(ctx, camera) {
  // Check if we have data to draw
  if (!drawZoneMiddleLeftData || drawZoneMiddleLeftData.length === 0) {
    return;
  }

  ctx.save();

  // Set line style for drawing connections
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 16;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Draw lines between points in chain
  ctx.beginPath();

  for (let i = 0; i < drawZoneMiddleLeftData.length; i++) {
    const point = drawZoneMiddleLeftData[i];

    // Convert world coordinates to screen coordinates
    const screenX = point.x - camera.x;
    const screenY = point.y - camera.y;

    if (i === 0) {
      // Move to first point
      ctx.moveTo(screenX, screenY);
    } else {
      // Draw line to current point
      ctx.lineTo(screenX, screenY);
    }
  }

  ctx.stroke();

  //   // Optional: Draw points as small circles for visibility
  //   ctx.fillStyle = "red";
  //   for (let i = 0; i < drawZoneMiddleLeftData.length; i++) {
  //     const point = drawZoneMiddleLeftData[i];
  //     const screenX = point.x - camera.x;
  //     const screenY = point.y - camera.y;

  //     ctx.beginPath();
  //     ctx.arc(screenX, screenY, 3, 0, Math.PI * 2);
  //     ctx.fill();
  //   }

  // Optional: Draw zone bounds for debugging
  if (CONFIG.debugMode) {
    ctx.strokeStyle = "rgba(255, 0, 0, 0.3)";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    // Zone bounds based on your calculations
    const zoneX = 0 - camera.x;
    const zoneY = (CONFIG.canvasHeight - 300) / 2 - camera.y;
    const zoneWidth = (CONFIG.canvasWidth - 300) / 2;
    const zoneHeight = 300;

    ctx.strokeRect(zoneX, zoneY, zoneWidth, zoneHeight);
    ctx.setLineDash([]); // Reset line dash
  }

  ctx.restore();
}

function drawWorldBorder(ctx, camera, config) {
  const borderX = -camera.x;
  const borderY = -camera.y;
  const borderWidth = config.canvasWidth;
  const borderHeight = config.canvasHeight;
  const lineWidth = config.worldBorderWidth * 2;

  // Save current context state
  ctx.save();

  // Set line properties
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "butt";

  // Create police-style pattern (alternating colors)
  const patternSize = 40; // Length of each colored segment
  const colors = ["#FFD700", "#000000"]; // Yellow and black like police tape

  // Function to draw a patterned line
  function drawPatternedLine(startX, startY, endX, endY) {
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.sqrt(dx * dx + dy * dy);
    const segments = Math.ceil(length / patternSize);

    for (let i = 0; i < segments; i++) {
      const progress1 = (i * patternSize) / length;
      const progress2 = Math.min(((i + 1) * patternSize) / length, 1);

      const x1 = startX + dx * progress1;
      const y1 = startY + dy * progress1;
      const x2 = startX + dx * progress2;
      const y2 = startY + dy * progress2;

      // Alternate colors
      ctx.strokeStyle = colors[i % 2];

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }

  // Draw all four borders with pattern
  // Top border
  drawPatternedLine(borderX, borderY, borderX + borderWidth, borderY);

  // Right border
  drawPatternedLine(
    borderX + borderWidth,
    borderY,
    borderX + borderWidth,
    borderY + borderHeight
  );

  // Bottom border
  drawPatternedLine(
    borderX + borderWidth,
    borderY + borderHeight,
    borderX,
    borderY + borderHeight
  );

  // Left border
  drawPatternedLine(borderX, borderY + borderHeight, borderX, borderY);

  // Restore context state
  ctx.restore();
}

// Alternative version with diagonal stripes (more police tape-like)
function drawWorldBorderWithStripes(ctx, camera, config) {
  const borderX = -camera.x;
  const borderY = -camera.y;
  const borderWidth = config.canvasWidth;
  const borderHeight = config.canvasHeight;
  const lineWidth = config.worldBorderWidth * 2;

  ctx.save();

  const halfWidth = lineWidth / 2;

  // Create a single clipping path that includes all border areas with overlapping corners
  ctx.beginPath();
  // Outer rectangle
  ctx.rect(
    borderX - halfWidth,
    borderY - halfWidth,
    borderWidth + lineWidth,
    borderHeight + lineWidth
  );
  // Inner rectangle (cut out the middle)
  ctx.rect(
    borderX + halfWidth,
    borderY + halfWidth,
    borderWidth - lineWidth,
    borderHeight - lineWidth
  );
  ctx.clip("evenodd"); // Use even-odd rule to create hollow rectangle

  // Draw diagonal stripes across the entire border area
  const stripeWidth = 20;
  const stripeSpacing = 40;

  // Calculate pattern bounds to cover entire border area including corners
  const patternBounds = {
    x: borderX - halfWidth - stripeSpacing,
    y: borderY - halfWidth - stripeSpacing,
    width: borderWidth + lineWidth + stripeSpacing * 2,
    height: borderHeight + lineWidth + stripeSpacing * 2,
  };

  // Draw diagonal stripes
  for (
    let i = -patternBounds.height;
    i < patternBounds.width + patternBounds.height;
    i += stripeSpacing
  ) {
    // Yellow stripe
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath();
    ctx.moveTo(patternBounds.x + i, patternBounds.y);
    ctx.lineTo(patternBounds.x + i + stripeWidth, patternBounds.y);
    ctx.lineTo(
      patternBounds.x + i + stripeWidth + patternBounds.height,
      patternBounds.y + patternBounds.height
    );
    ctx.lineTo(
      patternBounds.x + i + patternBounds.height,
      patternBounds.y + patternBounds.height
    );
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

// Render game function
function renderGame() {
  // Clear canvas
  ctx.clearRect(0, 0, CONFIG.screenWidth, CONFIG.screenHeight);

  // Calculate camera position (center on local player)
  if (localPlayer) {
    camera.set("x", localPlayer.x);
    camera.set("y", localPlayer.y);
  }

  // Draw world border
  drawWorldBorderWithStripes(ctx, camera, CONFIG);

  // Draw background grid
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;

  // Calculate grid offset
  const gridOffsetX = -(camera.x % 50);
  const gridOffsetY = -(camera.y % 50);

  // Vertical lines
  for (let x = gridOffsetX; x < CONFIG.screenWidth; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CONFIG.screenHeight);
    ctx.stroke();
  }

  // Horizontal lines
  for (let y = gridOffsetY; y < CONFIG.screenHeight; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CONFIG.screenWidth, y);
    ctx.stroke();
  }

  drawMiddleLeftZone(ctx, camera);

  // Draw multiplayer particles
  particleSystem.draw(ctx, camera);

  // Draw all players
  for (let id in players) {
    const player = players[id];

    if (player === localPlayer) continue;

    // Calculate screen position
    const screenX = player.x - camera.x;
    const screenY = player.y - camera.y;

    // Draw character image
    // ctx.drawImage(
    //     player.characterImage,
    //     screenX - CONFIG.playerRadius,
    //     screenY - CONFIG.playerRadius,
    //     CONFIG.playerRadius * 2,
    //     CONFIG.playerRadius * 2
    // );

    drawPlayerSVG(
      ctx,
      screenX - CONFIG.playerRadius,
      screenY - CONFIG.playerRadius,
      player.color
    );

    // Draw player name
    ctx.fillStyle = "white";
    ctx.font = "12px Default";
    ctx.textAlign = "center";
    ctx.fillText(player.name, screenX, screenY + 60);
  }

  // draw local player
  if (localPlayer) {
    const screenX = localPlayer.x - camera.x;
    const screenY = localPlayer.y - camera.y;

    // Draw character image
    // ctx.drawImage(
    //     localPlayer.characterImage,
    //     screenX - CONFIG.playerRadius,
    //     screenY - CONFIG.playerRadius,
    //     CONFIG.playerRadius * 2,
    //     CONFIG.playerRadius * 2
    // );
    drawPlayerSVG(
      ctx,
      screenX - CONFIG.playerRadius,
      screenY - CONFIG.playerRadius,
      localPlayer.color
    );

    // Draw player name
    ctx.fillStyle = "white";
    ctx.font = "18px Arial";
    ctx.textAlign = "center";
    ctx.fontWeight = "bold";
    ctx.textBaseline = "top";
    ctx.fillText(localPlayer.name, screenX, screenY + 60);
  }

  // Continue the update loop
  requestAnimationFrame(gameLoop);
}

let lastFrameTime = 0;
const FPS = 60;
const FRAME_MIN_TIME = 1000 / FPS;

// Game loop
function gameLoop(currentTime) {
  const t = Date.now();
  let shouldSkipMovement = false;

  if (currentTime - lastFrameTime < FRAME_MIN_TIME) {
    shouldSkipMovement = true;
  }
  lastFrameTime = currentTime;

  const maxAge = 5000; // 5 seconds in milliseconds

  drawZoneMiddleLeftData = drawZoneMiddleLeftData.filter((item) => {
    return t - item.timestamp <= maxAge;
  });

  if (localPlayer) {
    // Update player movement
    const hasMoved = localPlayer.update();

    particleSystem.spawn(socket.id, localPlayer.x, localPlayer.y);

    // Emit movement only if there's significant movement
    if (hasMoved && !shouldSkipMovement) {
      socket.emit("playerMove", {
        x: localPlayer.x,
        y: localPlayer.y,
        spawnParticles: true,
      });
    }

    // Update particle system
    particleSystem.update();

    // Render game
    renderGame();
  }
}

// Keyboard event listeners
window.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "ArrowUp":
      movement.up = true;
      movement.down = false;
      tutorialMovement.markKeyPressed("up");
      break;
    case "ArrowDown":
      movement.down = true;
      movement.up = false;
      tutorialMovement.markKeyPressed("down");
      break;
    case "ArrowLeft":
      movement.left = true;
      movement.right = false;
      tutorialMovement.markKeyPressed("left");
      break;
    case "ArrowRight":
      movement.right = true;
      movement.left = false;
      tutorialMovement.markKeyPressed("right");
      break;
  }

  switch (e.code) {
    case "KeyW":
      movement.up = true;
      movement.down = false;
      tutorialMovement.markKeyPressed("up");
      break;
    case "KeyS":
      movement.down = true;
      movement.up = false;
      tutorialMovement.markKeyPressed("down");
      break;
    case "KeyA":
      movement.left = true;
      movement.right = false;
      tutorialMovement.markKeyPressed("left");
      break;
    case "KeyD":
      movement.right = true;
      movement.left = false;
      tutorialMovement.markKeyPressed("right");
      break;
  }
});

window.addEventListener("keyup", (e) => {
  switch (e.key) {
    case "ArrowUp":
      movement.up = false;
      break;
    case "ArrowDown":
      movement.down = false;
      break;
    case "ArrowLeft":
      movement.left = false;
      break;
    case "ArrowRight":
      movement.right = false;
      break;
  }
  switch (e.code) {
    case "KeyW":
      movement.up = false;
      break;
    case "KeyS":
      movement.down = false;
      break;
    case "KeyA":
      movement.left = false;
      break;
    case "KeyD":
      movement.right = false;
      break;
  }
});

// Prediction toggle
gameCanvas.addEventListener("click", () => {
  const predictionState = latencyPredictor.togglePrediction();
  predictionDisplay.textContent = `Prediction: ${
    predictionState ? "On" : "Off"
  }`;
});

// Join game button handler
joinButton.addEventListener("click", () => {
  const serverUrl = serverUrlInput.value.trim();
  const playerName = nameInput.value.trim();

  // Validate inputs
  if (!serverUrl) {
    alert("Please enter a server URL");
    return;
  }
  if (!playerName) {
    alert("Please enter a name");
    return;
  }

  // Connect to socket
  try {
    // Disconnect existing socket if any
    if (socket) {
      socket.disconnect();
    }

    // Connect to specified server
    socket = io(serverUrl, {
      withCredentials: false,
      transports: ["websocket"], // Force websocket, bypassing polling
    });

    // Setup socket event listeners
    setupSocketListeners();

    // Hide setup, show game canvas and latency info
    playerSetup.style.display = "none";
    connectEl.style.display = "block";

    // Focus canvas for keyboard input
    gameCanvas.focus();

    // Emit player join event
    socket.emit("playerJoin", {
      name: playerName,
      characterId: selectedCharacterId,
      color: selectedColor,
    });
  } catch (error) {
    console.error("Connection error:", error);
    alert("Failed to connect to the server. Please check the URL.");
  }
});

// Socket event listeners
function setupSocketListeners() {
  // Latency ping handler
  // Initialize particle system

  socket.on("serverPong", (data) => {
    const now = Date.now();
    const latency = now - data.timestamp;

    // Update latency predictor
    latencyPredictor.addPing(latency);

    // Update latency display
    pingDisplay.textContent = `Ping: ${latency.toFixed(0)} ms`;
    jitterDisplay.textContent = `Jitter: ${latencyPredictor.jitter.toFixed(
      0
    )} ms`;
  });

  // Current players handler
  socket.on("currentPlayers", (currentPlayers) => {
    // Populate existing players
    for (let id in currentPlayers) {
      const playerData = currentPlayers[id];

      // Create player with velocity support
      players[id] = new Player(
        id,
        playerData.name,
        playerData.color,
        playerData.x,
        playerData.y,
        playerData.characterId
      );

      zonesManager.initPlayer(id);

      // Set local player
      if (id === socket.id) {
        localPlayer = players[id];

        // Initially center player in the world
        localPlayer.x = CONFIG.canvasWidth / 2;
        localPlayer.y = CONFIG.canvasHeight / 2;
        localPlayer.color = selectedColor;

        // console.log("Local player initialized:", localPlayer);

        requestAnimationFrame(() => {
          connectEl.style.display = "none";
          latencyInfo.style.display = "block";
          gameCanvas.style.display = "block";
          info.style.display = "flex";
          tutorialEl.classList.remove("hidden");
        });
      }
    }

    // Start game loop
    gameLoop();
  });

  // Player joined handler
  socket.on("playerJoined", (playerData) => {
    // Add new player to the game
    players[playerData.id] = new Player(
      playerData.id,
      playerData.name,
      playerData.color,
      playerData.x,
      playerData.y,
      playerData.characterId
    );

    zonesManager.initPlayer(playerData.id);
  });

  // Player movement handler
  socket.on("playerMoved", (playerData) => {
    if (players[playerData.id] && playerData.id !== socket.id) {
      const player = players[playerData.id];
      player.x = playerData.x;
      player.y = playerData.y;

      // Spawn particles for other players' movement
      if (playerData.spawnParticles) {
        particleSystem.spawn(playerData.id, player.x, player.y);
      }

      zonesManager.updatePlayer(playerData.id, player.x, player.y);
    }
  });

  socket.on("playerDraw", (drawData) => {
    // console.log("GET draw data", drawData);
    if (players[drawData.id]) {
      drawZoneMiddleLeftData.push({
        x: drawData.x,
        y: drawData.y,
        zone: drawData.zone,
        timestamp: drawData.timestamp,
      });
    }
  });

  // Player left handler
  socket.on("playerLeft", (playerId) => {
    // Remove disconnected player
    delete players[playerId];
    zonesManager.destroyPlayer(playerId);
  });

  // Connection error handler
  socket.on("connect_error", (error) => {
    console.error("Connection error:", error);
    alert("Failed to connect to the server. Please check the URL.");

    // Show setup screen again
    playerSetup.style.display = "block";
    gameCanvas.style.display = "none";
    latencyInfo.style.display = "none";
    info.style.display = "none";
  });
}

function handleResize() {
  // Update screen dimensions
  CONFIG.screenWidth = window.innerWidth;
  CONFIG.screenHeight = window.innerHeight;

  // Resize canvas
  gameCanvas.width = CONFIG.screenWidth;
  gameCanvas.height = CONFIG.screenHeight;
}

// Handle window resize
window.addEventListener("resize", () => {
  handleResize();
});

document.addEventListener("DOMContentLoaded", () => {
  handleResize();
});
