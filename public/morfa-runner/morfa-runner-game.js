const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false; // Retro pixel look
const scoreDisplay = document.getElementById("score");
const fullscreenButton = document.getElementById("fullscreenButton");
const backButton = document.getElementById("backButton");
const muteButton = document.getElementById("muteButton");
const classPicker = document.getElementById("classPicker");
const classButtonsEl = document.getElementById("classButtons");
const changeClassButton = document.getElementById("changeClassButton");
const gameContainer = document.querySelector(".game-container");

const canvasWidth = canvas.width;
const canvasHeight = canvas.height;

// Preview Mode Check (the silent, non-interactive preview on the homepage)
const urlParams = new URLSearchParams(window.location.search);
const isPreview = urlParams.has('preview');
const isEmbedded = window.self !== window.top;

// The page around the game already has Back and Fullscreen buttons, so hide ours when embedded.
if (isEmbedded) {
  backButton.style.display = "none";
  fullscreenButton.style.display = "none";
}
if (isPreview) {
  muteButton.style.display = "none";
  document.body.classList.add("preview");
}

// Phones held upright see a "turn sideways" notice; the game waits until they do.
const portraitTouch = window.matchMedia("(orientation: portrait) and (pointer: coarse)");
const mustRotate = () => !isPreview && portraitTouch.matches;

// Screens: 'welcome' -> ('pickClass') -> 'playing' -> 'results'
let state = "welcome";
let score = 0;
let gameSpeed = 1; // multiplier for all speeds
const maxGameSpeed = 3; // cap at 3x speed
const speedIncreaseRate = 0.0002; // how fast the game speeds up, per 60fps frame
let resultsShownAt = 0;
const resultsInputDelay = 900; // ms, so a tap meant as a jump does not skip the results

// Background
const background = new Image();
background.src = "images/background.png";
let bgX = 0;
const bgWidth = 2700; // width of the image

// Ground
const groundImg = new Image();
groundImg.src = "images/ground.png";
const groundHeight = 100;
let groundX = 0;
const baseScrollSpeed = 4;
const baseBgScrollSpeed = 1;

// Player
const playerSprite = new Image();
playerSprite.src = "images/player-sprite.png";

const player = {
  x: 50,
  y: canvasHeight - groundHeight - 100,
  width: 70,  // slightly smaller than 93 for fairer collision
  height: 100, // slightly smaller than 117 for fairer collision
  frameWidth: 93,
  frameHeight: 117,
  frameIndex: 1, // start on standing frame
  frameSpeed: 8,
  tickCount: 0,
  jumping: false,
  jumpSpeed: 0,
  canDoubleJump: false,
  hasDoubleJumped: false
};

// Obstacles. Hitboxes sit inside the picture so empty corners never count as a hit.
const obstacleTypes = [
  { src: "images/books.png", width: 24, height: 25, hitboxWidth: 20, hitboxHeight: 21, hitboxOffsetX: 2, hitboxOffsetY: 4 },
  { src: "images/bag.png", width: 35, height: 40, hitboxWidth: 27, hitboxHeight: 33, hitboxOffsetX: 4, hitboxOffsetY: 7 },
  { src: "images/teacher.png", width: 42, height: 94, hitboxWidth: 28, hitboxHeight: 86, hitboxOffsetX: 7, hitboxOffsetY: 8 }
];
obstacleTypes.forEach(type => {
  type.img = new Image();
  type.img.src = type.src;
});
let obstacles = [];
const baseObstacleSpeed = 4;
const obstacleGap = 400;

// Values certificates (collectibles)
const valuesImg = new Image();
valuesImg.src = "images/values.png";
let values = [];
const valuesSpawnChance = 0.3; // 30% chance to spawn with each obstacle
const valuesPoints = 50; // bonus points for collecting

// Confetti particles
let confetti = [];
const confettiColors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
const confettiLifetime = 60; // frames

// Score popups
let scorePopups = [];

// ---------- Classes and the class league ----------
const CLASSES = [
  { id: "nursery", label: "Nursery", key: "n" },
  { id: "reception", label: "Reception", key: "r" },
  { id: "y1", label: "Year 1", key: "1" },
  { id: "y2", label: "Year 2", key: "2" },
  { id: "y3", label: "Year 3", key: "3" },
  { id: "y4", label: "Year 4", key: "4" },
  { id: "y5", label: "Year 5", key: "5" },
  { id: "y6", label: "Year 6", key: "6" }
];
const classLabel = id => (CLASSES.find(c => c.id === id) || {}).label || "";

CLASSES.forEach(c => {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = c.label;
  b.dataset.id = c.id;
  b.addEventListener("click", () => { unlockAudio(); chooseClass(c.id); });
  classButtonsEl.appendChild(b);
});

// Shows the HTML picker and the "Change class" button only on the screens that use them.
let shownFor = null;
function syncOverlays() {
  if (shownFor === state) return;
  shownFor = state;
  classPicker.hidden = state !== "pickClass";
  changeClassButton.hidden = isPreview || state !== "welcome" || !myClass;
  if (state === "pickClass") {
    classButtonsEl.querySelectorAll("button").forEach(b => b.classList.toggle("current", b.dataset.id === myClass));
  }
}

changeClassButton.addEventListener("click", () => { state = "pickClass"; });

function readStore(key, fallback) {
  try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
}
function writeStore(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode: fine */ }
}

let myClass = readStore("morfa-runner-class", null);
let myBest = readStore("morfa-runner-best", 0);
let league = null; // [{ classId, best, games }]
let leagueStatus = "idle"; // idle | saving | saved | offline
let lastRun = { score: 0, newClassRecord: false, newPersonalBest: false };

async function fetchLeague() {
  try {
    const res = await fetch("/api/morfa-runner/leaderboard", { cache: "no-store" });
    if (res.ok) league = (await res.json()).classes;
  } catch (e) { /* offline: the results screen says so */ }
}

async function submitScore(classId, runScore) {
  leagueStatus = "saving";
  try {
    const res = await fetch("/api/morfa-runner/leaderboard", {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId, score: runScore })
    });
    if (!res.ok) throw new Error("save failed");
    const data = await res.json();
    league = data.classes;
    lastRun.newClassRecord = !!data.newClassRecord;
    leagueStatus = "saved";
  } catch (e) {
    leagueStatus = "offline";
  }
}

if (!isPreview) fetchLeague();

// ---------- Sound ----------
let musicInitialized = false;
let backgroundMusic;
let collectSound;
let jumpSound;
let muted = readStore("morfa-runner-muted", false);

function renderMuteButton() {
  muteButton.setAttribute("aria-label", muted ? "Turn sound on" : "Turn sound off");
  muteButton.setAttribute("aria-pressed", String(muted));
  muteButton.querySelector(".icon-on").style.display = muted ? "none" : "block";
  muteButton.querySelector(".icon-off").style.display = muted ? "block" : "none";
}
renderMuteButton();

muteButton.addEventListener("click", () => {
  muted = !muted;
  writeStore("morfa-runner-muted", muted);
  if (window.Tone) Tone.Destination.mute = muted;
  renderMuteButton();
});

// Standalone page only: the page around the game handles fullscreen when embedded.
fullscreenButton.addEventListener("click", () => {
  if (!document.fullscreenElement) gameContainer.requestFullscreen().catch(() => {});
  else document.exitFullscreen();
});

// ---------- Input ----------
function unlockAudio() {
  if (isPreview || musicInitialized || !window.Tone) return;
  // Fire-and-forget: audio must be started inside a user gesture
  Tone.start().catch(() => {});
  initMusic();
}

// One pointerdown per tap or click, so one press is always one jump.
canvas.addEventListener("pointerdown", e => {
  if (isPreview || mustRotate()) return;
  e.preventDefault();
  unlockAudio();
  handlePress();
});

document.addEventListener("keydown", e => {
  if (isPreview || e.repeat || mustRotate()) return;
  const k = e.key.toLowerCase();
  if (state === "pickClass") {
    const c = CLASSES.find(c => c.key === k);
    if (c) { unlockAudio(); chooseClass(c.id); }
    return;
  }
  if (state === "welcome" && k === "c") { state = "pickClass"; return; }
  if (e.code === "Space" || e.key === "Enter") {
    e.preventDefault();
    unlockAudio();
    handlePress();
  }
});

function handlePress() {
  if (state === "welcome") {
    if (!myClass) { state = "pickClass"; return; }
    startGame();
  } else if (state === "playing") {
    performJump();
  } else if (state === "results") {
    if (performance.now() - resultsShownAt < resultsInputDelay) return;
    startGame();
  }
}

function chooseClass(id) {
  myClass = id;
  writeStore("morfa-runner-class", id);
  startGame();
}

function performJump() {
  if (!player.jumping) {
    player.jumping = true;
    player.jumpSpeed = -12;
    player.canDoubleJump = true;
    player.hasDoubleJumped = false;
    playJumpSound();
  } else if (player.canDoubleJump && !player.hasDoubleJumped) {
    player.jumpSpeed = -10;
    player.hasDoubleJumped = true;
    player.canDoubleJump = false;
    playJumpSound();
  }
}

function startGame() {
  state = "playing";
  score = 0;
  gameSpeed = 1;
  bgX = 0;
  groundX = 0;
  obstacles = [];
  values = [];
  confetti = [];
  scorePopups = [];
  player.frameIndex = 1;
  player.y = canvasHeight - groundHeight - player.height;
  player.jumping = false;
  player.canDoubleJump = false;
  player.hasDoubleJumped = false;
  scoreDisplay.style.display = "block";

  if (musicInitialized && backgroundMusic) {
    try {
      if (Tone.Transport.state !== "started") Tone.Transport.start();
      if (backgroundMusic.state !== "started") backgroundMusic.start();
    } catch (error) { /* play on without music */ }
  }
}

function gameOver() {
  if (state !== "playing") return; // only once, even if two obstacles touch in the same frame
  state = "results";
  resultsShownAt = performance.now();
  const finalScore = Math.floor(score);
  scoreDisplay.style.display = "none";

  if (musicInitialized && backgroundMusic && backgroundMusic.state === "started") {
    backgroundMusic.stop();
    Tone.Transport.stop();
  }

  lastRun = { score: finalScore, newClassRecord: false, newPersonalBest: finalScore > myBest };
  if (lastRun.newPersonalBest) {
    myBest = finalScore;
    writeStore("morfa-runner-best", myBest);
  }
  if (myClass) submitScore(myClass, finalScore);
}

// ---------- The one and only game loop ----------
// Movement is scaled by real time (dt = 1 at 60fps), so 120Hz screens run at the same speed.
let lastFrame = performance.now();
function loop(now) {
  let dt = (now - lastFrame) / (1000 / 60);
  lastFrame = now;
  if (dt > 3) dt = 3; // after a pause or a hidden tab, do not jump ahead

  if (state === "playing" && !mustRotate()) update(dt);
  else if (state === "welcome") updateWelcome(dt);
  draw();
  syncOverlays();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function animateRun(dt) {
  player.tickCount += dt;
  if (player.tickCount > player.frameSpeed) {
    player.tickCount = 0;
    player.frameIndex++;
    if (player.frameIndex > 3) player.frameIndex = 1; // running frames
  }
}

function scrollScenery(bgSpeed, groundSpeed) {
  bgX -= bgSpeed;
  if (bgX <= -bgWidth) bgX += bgWidth;
  groundX -= groundSpeed;
  if (groundX <= -canvasWidth) groundX += canvasWidth;
}

function updateWelcome(dt) {
  scrollScenery(0.5 * dt, baseScrollSpeed * dt);
  animateRun(dt);
  player.y = canvasHeight - groundHeight - player.height;
}

function update(dt) {
  score += dt;
  scoreDisplay.textContent = "Score: " + Math.floor(score);

  if (gameSpeed < maxGameSpeed) gameSpeed = Math.min(maxGameSpeed, gameSpeed + speedIncreaseRate * dt);

  const move = baseObstacleSpeed * gameSpeed * dt;
  scrollScenery(baseBgScrollSpeed * gameSpeed * dt, baseScrollSpeed * gameSpeed * dt);

  // Player
  if (!player.jumping) {
    animateRun(dt);
  } else {
    player.frameIndex = 4; // jump frame
    player.y += player.jumpSpeed * dt;
    player.jumpSpeed += 0.6 * dt;
    if (player.y >= canvasHeight - groundHeight - player.height) {
      player.y = canvasHeight - groundHeight - player.height;
      player.jumping = false;
      player.canDoubleJump = false;
      player.hasDoubleJumped = false;
    }
  }

  // Obstacles
  if (obstacles.length === 0 || obstacles[obstacles.length - 1].x < canvasWidth - obstacleGap) {
    const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
    obstacles.push({ type, x: canvasWidth, y: canvasHeight - groundHeight - type.height, width: type.width, height: type.height });

    if (Math.random() < valuesSpawnChance) {
      values.push({ x: canvasWidth + 100, y: canvasHeight - groundHeight - 160, width: 40, height: 32, collected: false });
    }
  }

  obstacles.forEach(ob => { ob.x -= move; });
  values.forEach(val => { val.x -= move; });

  confetti.forEach(p => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 0.2 * dt;
    p.life -= dt;
  });
  scorePopups.forEach(popup => {
    popup.y -= dt;
    popup.life -= dt;
  });

  obstacles = obstacles.filter(ob => ob.x + ob.width > 0);
  values = values.filter(val => val.x + val.width > 0 && !val.collected);
  confetti = confetti.filter(p => p.life > 0);
  scorePopups = scorePopups.filter(popup => popup.life > 0);

  // Values collection
  values.forEach(val => {
    if (!val.collected &&
      player.x < val.x + val.width &&
      player.x + player.width > val.x &&
      player.y < val.y + val.height &&
      player.y + player.height > val.y) {
      val.collected = true;
      score += valuesPoints;
      playCollectSound();
      for (let i = 0; i < 25; i++) {
        confetti.push({
          x: val.x + val.width / 2,
          y: val.y + val.height / 2,
          vx: (Math.random() - 0.5) * 12,
          vy: (Math.random() - 0.5) * 12 - 3,
          color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
          size: Math.random() * 4 + 1,
          life: confettiLifetime + Math.random() * 30
        });
      }
      scorePopups.push({ x: val.x + val.width / 2, y: val.y - 10, text: "+50", life: 90 });
    }
  });

  // Collisions (smaller player hitbox while jumping, so near misses feel fair)
  const pw = player.jumping ? 50 : player.width;
  const ph = player.jumping ? 85 : player.height;
  const px = player.jumping ? player.x + 10 : player.x;
  const py = player.jumping ? player.y + 5 : player.y;
  for (const ob of obstacles) {
    const hx = ob.x + ob.type.hitboxOffsetX;
    const hy = ob.y + ob.type.hitboxOffsetY;
    if (px < hx + ob.type.hitboxWidth && px + pw > hx && py < hy + ob.type.hitboxHeight && py + ph > hy) {
      gameOver();
      break;
    }
  }
}

// ---------- Drawing ----------
function drawScene() {
  const backgroundHeight = canvasHeight - groundHeight;
  ctx.drawImage(background, bgX, 0, bgWidth, backgroundHeight);
  ctx.drawImage(background, bgX + bgWidth, 0, bgWidth, backgroundHeight);
  ctx.drawImage(groundImg, groundX, canvasHeight - groundHeight, canvasWidth, groundHeight);
  ctx.drawImage(groundImg, groundX + canvasWidth, canvasHeight - groundHeight, canvasWidth, groundHeight);
  const spriteX = player.frameIndex * player.frameWidth;
  ctx.drawImage(playerSprite, spriteX, 0, player.frameWidth, player.frameHeight, player.x, player.y, player.width, player.height);
}

function draw() {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  if (state === "welcome") return drawWelcomeScreen();
  if (state === "pickClass") return drawClassPicker();

  drawScene();
  obstacles.forEach(ob => ctx.drawImage(ob.type.img, ob.x, ob.y, ob.width, ob.height));
  values.forEach(val => { if (!val.collected) ctx.drawImage(valuesImg, val.x, val.y, val.width, val.height); });
  confetti.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  });
  scorePopups.forEach(popup => {
    ctx.save();
    ctx.fillStyle = "#FFD700";
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 3;
    ctx.font = "bold 32px 'VT323', monospace";
    ctx.textAlign = "center";
    ctx.strokeText(popup.text, popup.x, popup.y);
    ctx.fillText(popup.text, popup.x, popup.y);
    ctx.restore();
  });

  if (state === "results") drawResults();
}

function blink() {
  return (Math.sin(Date.now() * 0.01) + 1) / 2;
}

function drawWelcomeScreen() {
  drawScene();
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.save();
  ctx.shadowColor = "#000";
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = "#FFC800";
  ctx.font = "80px 'VT323', monospace";
  ctx.textAlign = "center";
  ctx.fillText("MORFA RUNNER", canvasWidth / 2, 110);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "32px 'VT323', monospace";
  ctx.fillText("YSGOL MAES Y MORFA", canvasWidth / 2, 150);
  ctx.restore();

  if (isPreview) return;

  ctx.textAlign = "center";
  ctx.fillStyle = `rgba(255, 255, 255, ${blink()})`;
  ctx.font = "40px 'VT323', monospace";
  ctx.fillText("TAP TO START", canvasWidth / 2, 230);
  ctx.fillStyle = "#e0e0e0";
  ctx.font = "24px 'VT323', monospace";
  ctx.fillText("Tap or SPACE to jump. Tap again in the air for a double jump!", canvasWidth / 2, 268);

  if (myClass) {
    ctx.fillStyle = "#FFC800";
    ctx.font = "28px 'VT323', monospace";
    ctx.fillText(`Running for ${classLabel(myClass).toUpperCase()}`, canvasWidth / 2, 310);
  }
}

function drawClassPicker() {
  drawScene(); // the HTML picker sits on top
}

function drawResults() {
  // Blackboard
  ctx.fillStyle = "#1a3c1e";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.lineWidth = 20;
  ctx.strokeStyle = "#8b4513";
  ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

  // Left: this run
  const leftX = 230;
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "34px 'VT323', monospace";
  ctx.fillText("YOU SCORED", leftX, 85);
  ctx.fillStyle = "#FFC800";
  ctx.font = "80px 'VT323', monospace";
  ctx.fillText(String(lastRun.score), leftX, 150);
  ctx.fillStyle = "#ffffff";
  ctx.font = "28px 'VT323', monospace";
  ctx.fillText(`for ${classLabel(myClass).toUpperCase()}`, leftX, 185);
  ctx.fillStyle = "#cfe8d0";
  ctx.font = "24px 'VT323', monospace";
  ctx.fillText(`Your best: ${myBest}`, leftX, 225);

  ctx.font = "30px 'VT323', monospace";
  if (lastRun.newClassRecord) {
    ctx.fillStyle = `rgba(255, 215, 0, ${0.4 + blink() * 0.6})`;
    ctx.fillText("NEW CLASS RECORD!", leftX, 275);
  } else if (lastRun.newPersonalBest) {
    ctx.fillStyle = `rgba(255, 215, 0, ${0.4 + blink() * 0.6})`;
    ctx.fillText("NEW PERSONAL BEST!", leftX, 275);
  }

  // Right: the class league
  const tableX = 470, tableW = 380;
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.font = "40px 'VT323', monospace";
  ctx.fillText("CLASS LEAGUE", tableX, 70);

  ctx.font = "26px 'VT323', monospace";
  if (!league) {
    ctx.fillStyle = "#cfe8d0";
    ctx.fillText(leagueStatus === "offline" ? "Can't reach the league right now." : "Loading...", tableX, 115);
  } else {
    const rows = [...league].sort((a, b) => b.best - a.best);
    rows.forEach((row, i) => {
      const y = 108 + i * 30;
      const mine = row.classId === myClass;
      if (mine) {
        ctx.fillStyle = "rgba(255, 200, 0, 0.18)";
        ctx.fillRect(tableX - 8, y - 22, tableW, 28);
      }
      ctx.fillStyle = mine ? "#FFC800" : "#ffffff";
      ctx.textAlign = "left";
      ctx.fillText(`${String(i + 1).padStart(2, " ")}. ${classLabel(row.classId)}`, tableX, y);
      ctx.textAlign = "right";
      ctx.fillText(row.best > 0 ? String(row.best) : "-", tableX + tableW - 20, y);
    });
    if (leagueStatus === "offline") {
      ctx.textAlign = "left";
      ctx.fillStyle = "#f4b0a6";
      ctx.font = "20px 'VT323', monospace";
      ctx.fillText("Offline: this score was not added to the league.", tableX, 360);
    }
  }

  // Footer
  if (performance.now() - resultsShownAt > resultsInputDelay) {
    ctx.textAlign = "center";
    ctx.fillStyle = `rgba(224, 224, 224, ${0.5 + blink() * 0.5})`;
    ctx.font = "24px 'VT323', monospace";
    ctx.fillText("TAP OR PRESS SPACE TO PLAY AGAIN", canvasWidth / 2, 385);
  }
}

// ---------- Music ----------
async function initMusic() {
  if (isPreview || musicInitialized) return;
  musicInitialized = true; // set first, so two quick taps never build two synths

  try {
    await Tone.start();
    Tone.Destination.mute = muted;

    collectSound = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 },
      volume: -5
    }).toDestination();

    jumpSound = new Tone.Synth({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 },
      volume: -8
    }).toDestination();

    const musicSynth = new Tone.Synth({
      oscillator: { type: "square" },
      envelope: { attack: 0.1, decay: 0.3, sustain: 0.3, release: 0.8 },
      volume: -12
    }).toDestination();

    // Upbeat platformer-style melody (null = rest)
    const melody = [
      "E4", "G4", "B4", "D5", "C5", "B4", "A4", "G4",
      "F4", "E4", "D4", "E4", "F4", "G4", "A4", null,
      "C5", "B4", "A4", "B4", "C5", "D5", "E5", null,
      "D5", "C5", "B4", "A4", "G4", "F4", "E4", "D4",
      "G4", "A4", "B4", "C5", "D5", "E5", "F5", "G5",
      "F5", "E5", "D5", "C5", "B4", "A4", "G4", null,
      "E4", "E4", "G4", "G4", "B4", "B4", "D5", "C5",
      "A4", "F4", "D4", "E4", "F4", "G4", "E4", null
    ];
    let noteIndex = 0;

    backgroundMusic = new Tone.Loop((time) => {
      const note = melody[noteIndex];
      if (note) musicSynth.triggerAttackRelease(note, "8n", time);
      noteIndex = (noteIndex + 1) % melody.length;
    }, "8n");

    // The first tap may already have started a game before the music was ready
    if (state === "playing") {
      if (Tone.Transport.state !== "started") Tone.Transport.start();
      if (backgroundMusic.state !== "started") backgroundMusic.start();
    }
  } catch (error) {
    musicInitialized = false;
  }
}

function playCollectSound() {
  if (collectSound) collectSound.triggerAttackRelease("C5", "8n");
}

function playJumpSound() {
  if (jumpSound) jumpSound.triggerAttackRelease("A4", "16n");
}
