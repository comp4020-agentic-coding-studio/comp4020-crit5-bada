import { rectsOverlap, rescaleObstacleX, type Rect } from "./game-logic.ts";

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const ctx = canvas.getContext("2d")!;
const status = document.querySelector<HTMLElement>("#status")!;

const GROUND_RATIO = 0.72;
const GRAVITY = 2200;
const JUMP_VELOCITY = -760;
const PLAYER_SIZE = 30;
const BASE_SPEED = 300;
const SPEED_RAMP = 5;
const MIN_GAP = 240;
const MAX_GAP = 460;
const BEST_KEY = "jump-best-distance";
const IDLE_OBSTACLE_RATIO = 0.62;
const IDLE_OBSTACLE_HEIGHT = 46;

type Phase = "idle" | "running" | "over";

interface Obstacle {
  x: number;
  w: number;
  h: number;
}

let width = 0;
let height = 0;
let groundY = 0;

let phase: Phase = "idle";
let playerY = 0;
let velocityY = 0;
let obstacles: Obstacle[] = [];
let speed = BASE_SPEED;
let distance = 0;
let best = Number(localStorage.getItem(BEST_KEY) ?? 0);
let lastTime = 0;
let sinceLastSpawn = 0;
let nextGap = randomGap();
let fallRotation = 0;
let resetTimer = 0;

function randomGap(): number {
  return MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP);
}

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const oldWidth = width;
  width = rect.width;
  height = rect.height;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  groundY = height * GROUND_RATIO;
  if (phase === "idle") {
    playerY = groundY - PLAYER_SIZE;
  } else if (oldWidth > 0 && width !== oldWidth) {
    for (const o of obstacles) o.x = rescaleObstacleX(o.x, oldWidth, width);
  }
}

function playerRect(): Rect {
  return { x: Math.max(40, width * 0.12), y: playerY, w: PLAYER_SIZE, h: PLAYER_SIZE };
}

function obstacleRect(o: Obstacle): Rect {
  return { x: o.x, y: groundY - o.h, w: o.w, h: o.h };
}

function startRun(): void {
  phase = "running";
  playerY = groundY - PLAYER_SIZE;
  velocityY = JUMP_VELOCITY;
  obstacles = [];
  distance = 0;
  speed = BASE_SPEED;
  sinceLastSpawn = 0;
  nextGap = randomGap();
}

function resetToIdle(): void {
  phase = "idle";
  playerY = groundY - PLAYER_SIZE;
  velocityY = 0;
  obstacles = [];
  fallRotation = 0;
  distance = 0;
  status.textContent = "";
}

function endRun(): void {
  phase = "over";
  resetTimer = 0.6;
  best = Math.max(best, Math.floor(distance));
  localStorage.setItem(BEST_KEY, String(best));
  status.textContent = `${Math.floor(distance)}. Best ${best}.`;
}

function jump(): void {
  if (phase === "idle") {
    startRun();
    return;
  }
  if (phase === "over") {
    if (resetTimer <= 0) resetToIdle();
    return;
  }
  if (playerY >= groundY - PLAYER_SIZE - 0.5) {
    velocityY = JUMP_VELOCITY;
  }
}

function update(dt: number, now: number): void {
  if (phase === "running") {
    velocityY += GRAVITY * dt;
    playerY += velocityY * dt;
    if (playerY > groundY - PLAYER_SIZE) {
      playerY = groundY - PLAYER_SIZE;
      velocityY = 0;
    }
    speed += SPEED_RAMP * dt;
    distance += speed * dt * 0.05;
    sinceLastSpawn += dt;
    if (sinceLastSpawn * speed >= nextGap) {
      sinceLastSpawn = 0;
      nextGap = randomGap();
      const h = 26 + Math.random() * 28;
      obstacles.push({ x: width + 20, w: 22, h });
    }
    for (const o of obstacles) o.x -= speed * dt;
    obstacles = obstacles.filter((o) => o.x + o.w > -10);

    const p = playerRect();
    for (const o of obstacles) {
      if (rectsOverlap(p, obstacleRect(o))) {
        endRun();
        break;
      }
    }
  } else if (phase === "over") {
    resetTimer -= dt;
    fallRotation = Math.min(Math.PI / 2, fallRotation + dt * 6);
  } else {
    playerY = groundY - PLAYER_SIZE + Math.sin(now / 300) * 4;
  }
}

function draw(): void {
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = "#e8e4da";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#3a3a3a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(width, groundY);
  ctx.stroke();

  ctx.fillStyle = "#3a3a3a";
  for (const o of obstacles) {
    ctx.fillRect(o.x, groundY - o.h, o.w, o.h);
  }
  if (phase === "idle") {
    const iw = 22;
    ctx.fillRect(width * IDLE_OBSTACLE_RATIO, groundY - IDLE_OBSTACLE_HEIGHT, iw, IDLE_OBSTACLE_HEIGHT);
  }

  const p = playerRect();
  if (phase === "idle") {
    const pulse = 0.35 + 0.25 * Math.sin(lastTime / 260);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = "#d1495b";
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2, p.y + p.h / 2, p.w * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.save();
  ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
  if (phase === "over") ctx.rotate(fallRotation);
  ctx.fillStyle = "#d1495b";
  ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
  ctx.restore();

  ctx.fillStyle = "#3a3a3a";
  ctx.font = "16px ui-monospace, monospace";
  ctx.textAlign = "right";
  ctx.fillText(String(Math.floor(distance)), width - 16, 28);
  if (best > 0) {
    ctx.globalAlpha = 0.5;
    ctx.fillText(String(best), width - 16, 48);
    ctx.globalAlpha = 1;
  }
}

function loop(time: number): void {
  const dt = lastTime ? Math.min(0.05, (time - lastTime) / 1000) : 0;
  lastTime = time;
  update(dt, time);
  draw();
  requestAnimationFrame(loop);
}

function onInput(e: Event): void {
  e.preventDefault();
  jump();
}

window.addEventListener("keydown", (e) => {
  if (e.code !== "Space" && e.code !== "ArrowUp" && e.code !== "Enter") return;
  const active = document.activeElement;
  if (active instanceof HTMLElement && active !== canvas && active !== document.body) return;
  onInput(e);
});
canvas.addEventListener("pointerdown", onInput);
window.addEventListener("resize", resize);

resize();
requestAnimationFrame(loop);
