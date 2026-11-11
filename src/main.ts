import { W, H, GX, GY, CW, CH, ROWS, COLS, OUT, makeBackground, drawPlant, drawAlien, drawSun, drawGnome, drawShovel } from './art';
import type { PlantKind, AlienKind } from './art';
import { sfx, unlockAudio, toggleMute, isMuted } from './audio';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const FONT = '"Fredoka", "Trebuchet MS", "Arial Rounded MT Bold", sans-serif';
let bg = makeBackground();

// ---------------------------------------------------------------- data
interface PlantDef { name: string; cost: number; cd: number; hp: number; blurb: string; }
const PLANTS: Record<PlantKind, PlantDef> = {
  glowpetal: { name: 'Glowpetal', cost: 50, cd: 7.5, hp: 300, blurb: 'Makes sunlight' },
  seedslinger: { name: 'Seedslinger', cost: 100, cd: 7.5, hp: 300, blurb: 'Shoots seeds' },
  stonegourd: { name: 'Stonegourd', cost: 50, cd: 25, hp: 4000, blurb: 'Tough wall' },
  frostfern: { name: 'Frostfern', cost: 175, cd: 7.5, hp: 300, blurb: 'Freezing shots' },
  boomberry: { name: 'Boomberry', cost: 150, cd: 30, hp: 9999, blurb: 'Explodes!' },
};
const ORDER: PlantKind[] = ['glowpetal', 'seedslinger', 'stonegourd', 'frostfern', 'boomberry'];

interface AlienDef { name: string; hp: number; armor: number; speed: number; dps: number; }
const ALIENS: Record<AlienKind, AlienDef> = {
  grunt: { name: 'Zib Grunt', hp: 200, armor: 0, speed: 17, dps: 90 },
  domehead: { name: 'Bubblehelm', hp: 200, armor: 450, speed: 17, dps: 90 },
  zoomer: { name: 'Zoomzap', hp: 170, armor: 0, speed: 38, dps: 90 },
  bloop: { name: 'Big Bloop', hp: 1100, armor: 0, speed: 11, dps: 180 },
};

const g = 'grunt', d = 'domehead', z = 'zoomer', b = 'bloop';
const WAVES: { list: AlienKind[]; big?: boolean }[] = [
  { list: [g] }, { list: [g, g] }, { list: [g, z, g] }, { list: [g, d, g] },
  { list: [g, g, d, z, g, g, z], big: true },
  { list: [d, g, z, g] }, { list: [d, d, z, g, g] }, { list: [z, z, g, d, g, b] }, { list: [d, d, g, g, z, z, b] },
  { list: [g, g, g, d, d, d, z, z, z, b, b, g, d], big: true },
];

interface Plant { kind: PlantKind; row: number; col: number; x: number; y: number; hp: number; maxHp: number; timer: number; fire: number; fuse: number; seed: number; glow: number; }
interface Alien { kind: AlienKind; row: number; x: number; y: number; hp: number; armor: number; maxArmor: number; speed: number; dps: number; slow: number; flash: number; walk: number; eating: Plant | null; dead: number; seed: number; }
interface Shot { x: number; y: number; row: number; dmg: number; ice: boolean; }
interface Sun { x: number; y: number; ty: number; vy: number; vx: number; life: number; collecting: boolean; value: number; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; grav: number; ring?: boolean; text?: string; }
interface Gnome { state: 'idle' | 'firing' | 'used'; t: number; }

type State = 'title' | 'playing' | 'paused' | 'won' | 'lost';
let state: State = 'title';
let plants: Plant[] = [], aliens: Alien[] = [], shots: Shot[] = [], suns: Sun[] = [], parts: Particle[] = [], gnomes: Gnome[] = [];
let sun = 150, time = 0, skySunT = 4, waveIdx = 0, nextWaveAt = 20, spawnQueue: { kind: AlienKind; at: number }[] = [];
let banner = { text: '', t: 0 }, shake = 0, selected: PlantKind | null = null, shovel = false;
let cooldowns: Record<string, number> = {};
let mouse = { x: -100, y: -100 };
let gt = 0; // global anim time

function reset() {
  plants = []; aliens = []; shots = []; suns = []; parts = [];
  gnomes = Array.from({ length: ROWS }, () => ({ state: 'idle' as const, t: 0 }));
  sun = 150; time = 0; skySunT = 4; waveIdx = 0; nextWaveAt = 20; spawnQueue = [];
  banner = { text: 'Defend the garden!', t: 2.5 }; selected = null; shovel = false;
  cooldowns = {}; for (const k of ORDER) cooldowns[k] = k === 'boomberry' || k === 'stonegourd' ? 0.5 : 0;
}

// ---------------------------------------------------------------- helpers
const cellX = (c: number) => GX + c * CW + CW / 2;
const rowY = (r: number) => GY + r * CH + CH - 16;
function cellAt(x: number, y: number) {
  const c = Math.floor((x - GX) / CW), r = Math.floor((y - GY) / CH);
  return c >= 0 && c < COLS && r >= 0 && r < ROWS ? { r, c } : null;
}
function burst(x: number, y: number, color: string, n = 8, speed = 120, size = 4) {
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.8); parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: 0.5 + Math.random() * 0.3, max: 0.8, color, size: size * (0.6 + Math.random() * 0.7), grav: 300 }); }
}
function ring(x: number, y: number, color: string, size: number) { parts.push({ x, y, vx: 0, vy: 0, life: 0.45, max: 0.45, color, size, grav: 0, ring: true }); }
function floatText(x: number, y: number, text: string, color: string) { parts.push({ x, y, vx: 0, vy: -40, life: 1, max: 1, color, size: 18, grav: 0, text }); }

const SEED_X = 112, CARD_W = 66, CARD_H = 84, CARD_Y = 8;
const cardRect = (i: number) => ({ x: SEED_X + i * (CARD_W + 6), y: CARD_Y, w: CARD_W, h: CARD_H });
const shovelRect = () => ({ x: SEED_X + ORDER.length * (CARD_W + 6) + 6, y: CARD_Y + 6, w: 72, h: 72 });
const pauseRect = { x: W - 66, y: 12, w: 52, h: 44 };
const muteRect = { x: W - 126, y: 12, w: 52, h: 44 };
const inR = (p: { x: number; y: number }, r: { x: number; y: number; w: number; h: number }) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
const bigBtn = { x: W / 2 - 120, y: 400, w: 240, h: 66 };

// ---------------------------------------------------------------- update
function spawnAlien(kind: AlienKind, row?: number) {
  const def = ALIENS[kind];
  const r = row ?? Math.floor(Math.random() * ROWS);
  aliens.push({ kind, row: r, x: W + 30 + Math.random() * 20, y: rowY(r), hp: def.hp, armor: def.armor, maxArmor: def.armor, speed: def.speed * (0.9 + Math.random() * 0.2), dps: def.dps, slow: 0, flash: 0, walk: Math.random() * 6, eating: null, dead: 0, seed: Math.random() * 10 });
}

function damageAlien(a: Alien, dmg: number) {
  a.flash = 0.08;
  if (a.armor > 0) {
    a.armor -= dmg;
    if (a.armor <= 0) { burst(a.x - 2, a.y - 92, 'rgba(210,245,255,0.95)', 14, 160, 4); sfx.glass(); dmg = -a.armor; a.armor = 0; } else return;
  }
  a.hp -= dmg;
  if (a.hp <= 0 && !a.dead) { a.dead = 0.6; burst(a.x, a.y - 40, '#b6ffb0', 14, 150, 5); ring(a.x, a.y - 40, '#d9b3ff', 40); sfx.pop(); }
}

function update(dt: number) {
  time += dt;
  if (banner.t > 0) banner.t -= dt;
  if (shake > 0) shake -= dt;
  for (const k of ORDER) cooldowns[k] = Math.max(0, cooldowns[k] - dt);

  // sky sun
  skySunT -= dt;
  if (skySunT <= 0) { skySunT = 6.5 + Math.random() * 2.5; suns.push({ x: GX + 40 + Math.random() * (COLS * CW - 80), y: 60, ty: GY + 40 + Math.random() * (ROWS * CH - 80), vy: 45, vx: 0, life: 12, collecting: false, value: 25 }); }

  // waves
  const alive = aliens.filter(a => !a.dead).length;
  if (waveIdx < WAVES.length && (time >= nextWaveAt || (waveIdx > 0 && alive === 0 && spawnQueue.length === 0 && time > nextWaveAt - 16))) {
    const w = WAVES[waveIdx]; const last = waveIdx === WAVES.length - 1;
    const delay = w.big ? 3 : 0;
    if (w.big) { banner = { text: last ? 'FINAL WAVE!' : 'A huge alien swarm is approaching!', t: 3 }; sfx.siren(); }
    w.list.forEach((k, i) => spawnQueue.push({ kind: k, at: time + delay + i * (w.big ? 0.9 : 2.2) }));
    waveIdx++; nextWaveAt = time + 28;
  }
  for (let i = spawnQueue.length - 1; i >= 0; i--) if (time >= spawnQueue[i].at) { spawnAlien(spawnQueue[i].kind); spawnQueue.splice(i, 1); }

  // plants
  for (const p of plants) {
    p.fire = Math.max(0, p.fire - dt * 3);
    if (p.kind === 'glowpetal') {
      p.timer -= dt; p.glow = p.timer < 1.5 ? 1 - p.timer / 1.5 : 0;
      if (p.timer <= 0) { p.timer = 17; suns.push({ x: p.x, y: p.y - 50, ty: p.y - 10, vy: -120, vx: (Math.random() - 0.5) * 60, life: 12, collecting: false, value: 25 }); }
    } else if (p.kind === 'seedslinger' || p.kind === 'frostfern') {
      p.timer -= dt;
      const target = aliens.some(a => !a.dead && a.row === p.row && a.x > p.x - 10 && a.x < W - 20);
      if (target && p.timer <= 0) { p.timer = 1.35; p.fire = 1; shots.push({ x: p.x + 34, y: p.y - 52, row: p.row, dmg: 20, ice: p.kind === 'frostfern' }); sfx.shoot(); }
    } else if (p.kind === 'boomberry') {
      p.fuse += dt;
      if (p.fuse >= 1) {
        p.hp = 0; shake = 0.4; sfx.boom();
        for (const a of aliens) if (!a.dead && Math.abs(a.row - p.row) <= 1 && Math.abs(a.x - p.x) < CW * 1.6) { a.armor = 0; damageAlien(a, 1800); }
        ring(p.x, p.y - 30, '#ffdb4d', 140); ring(p.x, p.y - 30, '#ff5a3d', 100);
        burst(p.x, p.y - 30, '#ff7a3d', 30, 320, 7); burst(p.x, p.y - 30, '#ffe14f', 20, 260, 5); burst(p.x, p.y - 30, '#5a4a6a', 14, 200, 8);
      }
    }
  }
  plants = plants.filter(p => p.hp > 0);

  // shots
  for (const s of shots) {
    s.x += 460 * dt;
    if (s.ice && Math.random() < 0.5) parts.push({ x: s.x, y: s.y + (Math.random() - 0.5) * 8, vx: -30, vy: 0, life: 0.3, max: 0.3, color: 'rgba(220,250,255,0.9)', size: 2.5, grav: 0 });
    for (const a of aliens) {
      if (a.dead || a.row !== s.row || a.x > W - 5) continue;
      if (Math.abs(s.x - (a.x - 4)) < 18) {
        damageAlien(a, s.dmg); s.x = 99999;
        if (s.ice) { a.slow = 4; burst(a.x - 14, s.y, '#bff4ff', 7, 100, 3.5); }
        else burst(a.x - 14, s.y, '#9be36a', 7, 100, 3.5);
        sfx.hit(); break;
      }
    }
  }
  shots = shots.filter(s => s.x < W + 20);

  // aliens
  for (const a of aliens) {
    if (a.dead) { a.dead -= dt; continue; }
    a.flash -= dt; a.slow = Math.max(0, a.slow - dt);
    const mul = a.slow > 0 ? 0.5 : 1;
    const target = plants.find(p => p.row === a.row && p.kind !== 'boomberry' && a.x - 22 < p.x + 26 && a.x > p.x - 10);
    a.eating = target ?? null;
    if (target) { target.hp -= a.dps * mul * dt; a.walk += dt * 2 * mul; if (target.hp <= 0) { burst(target.x, target.y - 30, '#6fbf4a', 12, 140, 4); sfx.crunch(); } }
    else { a.x -= a.speed * mul * dt; a.walk += dt * 5 * mul * (a.speed / 17) ** 0.5; }
    const gn = gnomes[a.row];
    if (a.x < GX - 10 && gn.state === 'idle') { gn.state = 'firing'; gn.t = 0; sfx.laser(); }
    if (a.x < 34 && state === 'playing') { state = 'lost'; sfx.lose(); }
  }
  plants = plants.filter(p => p.hp > 0);
  aliens = aliens.filter(a => !a.dead || a.dead > 0);

  for (let r = 0; r < ROWS; r++) {
    const gn = gnomes[r];
    if (gn.state !== 'firing') continue;
    gn.t += dt;
    if (gn.t > 0.25) for (const a of aliens) if (!a.dead && a.row === r && a.x < W) { a.armor = 0; damageAlien(a, 99999); }
    if (gn.t > 1.1) gn.state = 'used';
  }

  // suns
  for (const s of suns) {
    if (s.collecting) {
      const tx = 56, ty = 40; s.x += (tx - s.x) * Math.min(1, dt * 7); s.y += (ty - s.y) * Math.min(1, dt * 7);
      if (Math.hypot(tx - s.x, ty - s.y) < 10) { s.life = -1; s.collecting = false; sun += s.value; }
    } else {
      if (s.vy < 0 || s.y < s.ty) { s.vy += (s.vy < 0 ? 300 : 0) * dt; s.y += s.vy * dt; s.x += s.vx * dt; if (s.y > s.ty && s.vy > 0) { s.y = s.ty; s.vy = 0; } }
      s.life -= dt;
    }
  }
  suns = suns.filter(s => s.life > 0 || s.collecting);

  for (const p of parts) { p.life -= dt; p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  parts = parts.filter(p => p.life > 0);

  if (state === 'playing' && waveIdx >= WAVES.length && spawnQueue.length === 0 && aliens.length === 0) { state = 'won'; sfx.win(); }
}

// ---------------------------------------------------------------- input
function toCanvas(e: PointerEvent) { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; }
canvas.addEventListener('pointermove', e => { mouse = toCanvas(e); });
canvas.addEventListener('contextmenu', e => { e.preventDefault(); selected = null; shovel = false; });
canvas.addEventListener('pointerdown', e => {
  unlockAudio();
  const p = toCanvas(e); mouse = p;
  if (e.button === 2) return;
  if (state === 'title' || state === 'won' || state === 'lost') { if (inR(p, bigBtn)) { reset(); state = 'playing'; sfx.click(); } return; }
  if (inR(p, pauseRect)) { state = state === 'paused' ? 'playing' : 'paused'; sfx.click(); return; }
  if (inR(p, muteRect)) { toggleMute(); return; }
  if (state === 'paused') { if (inR(p, bigBtn)) { state = 'playing'; sfx.click(); } return; }
  for (let i = suns.length - 1; i >= 0; i--) { const s = suns[i]; if (!s.collecting && Math.hypot(p.x - s.x, p.y - s.y) < 30) { s.collecting = true; sfx.collect(); return; } }
  for (let i = 0; i < ORDER.length; i++) if (inR(p, cardRect(i))) {
    const k = ORDER[i];
    if (selected === k) selected = null; else if (sun >= PLANTS[k].cost && cooldowns[k] <= 0) { selected = k; shovel = false; sfx.click(); } else sfx.deny();
    return;
  }
  if (inR(p, shovelRect())) { shovel = !shovel; selected = null; sfx.click(); return; }
  const c = cellAt(p.x, p.y);
  if (!c) { selected = null; shovel = false; return; }
  const existing = plants.find(pl => pl.row === c.r && pl.col === c.c);
  if (shovel) { if (existing) { existing.hp = 0; plants = plants.filter(pl => pl !== existing); burst(existing.x, existing.y - 20, '#8b6b4a', 10, 120, 4); sfx.dig(); } shovel = false; return; }
  if (selected && !existing) { placePlant(selected, c.r, c.c); selected = null; }
});
window.addEventListener('keydown', e => {
  if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { if (state === 'playing') state = 'paused'; else if (state === 'paused') state = 'playing'; }
  if (e.key === 'm' || e.key === 'M') toggleMute();
  if (state !== 'playing') return;
  const n = parseInt(e.key); if (n >= 1 && n <= ORDER.length) { const k = ORDER[n - 1]; if (sun >= PLANTS[k].cost && cooldowns[k] <= 0) { selected = k; shovel = false; } }
  if (e.key === 's' || e.key === 'S') { shovel = !shovel; selected = null; }
});

function placePlant(k: PlantKind, r: number, c: number) {
  const def = PLANTS[k];
  plants.push({ kind: k, row: r, col: c, x: cellX(c), y: rowY(r), hp: def.hp, maxHp: def.hp, timer: k === 'glowpetal' ? 7 : 0.6, fire: 0, fuse: 0, seed: Math.random() * 10, glow: 0 });
  sun -= def.cost; cooldowns[k] = def.cd; sfx.plant();
  burst(cellX(c), rowY(r), '#7a5a3a', 8, 90, 4);
}

// ---------------------------------------------------------------- render
function panel(x: number, y: number, w: number, h: number, fill: string, r = 12) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
}
function text(s: string, x: number, y: number, size: number, color = '#fff', align: CanvasTextAlign = 'center', outline = true) {
  ctx.font = `700 ${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (outline) { ctx.lineWidth = Math.max(3, size / 6); ctx.strokeStyle = OUT; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = color; ctx.fillText(s, x, y);
}

function drawHUD() {
  // seed bar
  const sr = shovelRect();
  const barW = sr.x + sr.w + 10 - 6;
  const wg = ctx.createLinearGradient(0, 2, 0, 100); wg.addColorStop(0, '#8a5a34'); wg.addColorStop(1, '#5e3a20');
  panel(6, 2, barW, 96, wg as unknown as string, 14);
  // sun counter
  panel(14, 10, 88, 80, '#f4e2b8', 10);
  drawSun(ctx, 58, 38, gt, 1, 0.85);
  panel(20, 64, 76, 22, '#fffaf0', 8);
  text(String(sun), 58, 76, 18, '#5e3a20', 'center', false);
  ORDER.forEach((k, i) => {
    const r = cardRect(i), def = PLANTS[k];
    const ready = cooldowns[k] <= 0, afford = sun >= def.cost, sel = selected === k;
    const yy = r.y + (sel ? -4 : 0);
    const cg = ctx.createLinearGradient(0, yy, 0, yy + r.h); cg.addColorStop(0, '#fff7dc'); cg.addColorStop(1, '#d9e8b0');
    panel(r.x, yy, r.w, r.h, cg as unknown as string, 9);
    ctx.save(); ctx.beginPath(); ctx.roundRect(r.x + 3, yy + 3, r.w - 6, r.h - 26, 6); ctx.clip();
    ctx.fillStyle = '#a7d98a'; ctx.fillRect(r.x, yy, r.w, r.h);
    ctx.translate(r.x + r.w / 2, yy + 58); ctx.scale(0.62, 0.62); drawPlant(ctx, k, k === 'seedslinger' || k === 'frostfern' ? -10 : 0, 0, gt * 0.5, { seed: i });
    ctx.restore();
    text(String(def.cost), r.x + r.w / 2, yy + r.h - 11, 16, '#3a2a10', 'center', false);
    if (!ready || !afford) {
      ctx.save(); ctx.beginPath(); ctx.roundRect(r.x, yy, r.w, r.h, 9); ctx.clip();
      ctx.fillStyle = 'rgba(30,20,40,0.45)'; ctx.fillRect(r.x, yy, r.w, r.h);
      if (!ready) { const f = cooldowns[k] / def.cd; ctx.fillStyle = 'rgba(20,10,30,0.45)'; ctx.fillRect(r.x, yy, r.w, r.h * f); }
      ctx.restore();
    }
    if (sel) { ctx.beginPath(); ctx.roundRect(r.x - 2, yy - 2, r.w + 4, r.h + 4, 11); ctx.lineWidth = 4; ctx.strokeStyle = '#ffe14f'; ctx.stroke(); }
    text(String(i + 1), r.x + 9, yy + 10, 11, '#fff');
  });
  panel(sr.x, sr.y, sr.w, sr.h, shovel ? '#ffe9a8' : '#c9b08a', 10);
  drawShovel(ctx, sr.x + sr.w / 2, sr.y + sr.h / 2 + 2, 1);

  // pause / mute
  panel(pauseRect.x, pauseRect.y, pauseRect.w, pauseRect.h, '#7d5bd6', 10);
  ctx.fillStyle = '#fff';
  if (state === 'paused') { ctx.beginPath(); ctx.moveTo(pauseRect.x + 20, pauseRect.y + 12); ctx.lineTo(pauseRect.x + 36, pauseRect.y + 22); ctx.lineTo(pauseRect.x + 20, pauseRect.y + 32); ctx.fill(); }
  else { ctx.fillRect(pauseRect.x + 17, pauseRect.y + 12, 6, 20); ctx.fillRect(pauseRect.x + 29, pauseRect.y + 12, 6, 20); }
  panel(muteRect.x, muteRect.y, muteRect.w, muteRect.h, '#7d5bd6', 10);
  text(isMuted() ? '🔇' : '🔊', muteRect.x + 26, muteRect.y + 23, 20, '#fff', 'center', false);

  // progress bar
  const px = W - 290, py = 66, pw = 270, ph = 22;
  panel(px, py, pw, ph, '#2a1f3d', 11);
  const prog = Math.min(1, (waveIdx - (spawnQueue.length > 0 ? 0.5 : 0)) / WAVES.length);
  if (prog > 0) { ctx.beginPath(); ctx.roundRect(px + 3, py + 3, Math.max(8, (pw - 6) * prog), ph - 6, 8); const pg = ctx.createLinearGradient(px, 0, px + pw, 0); pg.addColorStop(0, '#7dffb3'); pg.addColorStop(1, '#ff7ac8'); ctx.fillStyle = pg; ctx.fill(); }
  WAVES.forEach((w, i) => { if (w.big) { const fx = px + 3 + (pw - 6) * ((i + 1) / WAVES.length); ctx.fillStyle = '#ff4f6d'; ctx.beginPath(); ctx.moveTo(fx - 1, py - 10); ctx.lineTo(fx - 1, py + 4); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.fillRect(fx - 1, py - 10, 10, 7); } });
  // little alien head marker
  const mx = px + 3 + (pw - 6) * prog; ctx.beginPath(); ctx.ellipse(mx, py + ph / 2, 9, 10, 0, 0, Math.PI * 2); ctx.fillStyle = '#a3b59c'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
  ctx.fillStyle = '#120b22'; ctx.beginPath(); ctx.ellipse(mx - 3.5, py + ph / 2, 2.2, 3.5, 0.4, 0, 7); ctx.ellipse(mx + 3.5, py + ph / 2, 2.2, 3.5, -0.4, 0, 7); ctx.fill();
  text(`Wave ${Math.min(waveIdx, WAVES.length)} / ${WAVES.length}`, px - 10, py + ph / 2, 15, '#fff', 'right');
}

function drawWorld() {
  ctx.drawImage(bg, 0, 0);
  // hover highlight
  if (state === 'playing' && (selected || shovel)) {
    const c = cellAt(mouse.x, mouse.y);
    if (c) {
      ctx.fillStyle = shovel ? 'rgba(255,90,90,0.18)' : 'rgba(255,255,255,0.18)'; ctx.fillRect(GX + c.c * CW, GY + c.r * CH, CW, CH);
      if (selected && !plants.some(p => p.row === c.r && p.col === c.c)) { ctx.save(); ctx.globalAlpha = 0.45; drawPlant(ctx, selected, cellX(c.c), rowY(c.r), gt); ctx.restore(); }
    }
  }
  // gnomes
  for (let r = 0; r < ROWS; r++) {
    const gn = gnomes[r];
    if (!gn || gn.state === 'used') { ctx.fillStyle = 'rgba(30,20,20,0.35)'; ctx.beginPath(); ctx.ellipse(GX - 40, rowY(r) - 2, 16, 5, 0, 0, 7); ctx.fill(); continue; }
    drawGnome(ctx, GX - 46, rowY(r) + 2, gt + r, gn.state === 'firing');
    if (gn.state === 'firing' && gn.t > 0.2) {
      const y = rowY(r) - 16, a = Math.min(1, (1.1 - gn.t) * 3);
      ctx.save(); ctx.globalAlpha = a; ctx.shadowColor = '#ff2f5a'; ctx.shadowBlur = 20;
      ctx.fillStyle = '#ff4f6d'; ctx.fillRect(GX - 16, y - 7, W, 14); ctx.fillStyle = '#fff'; ctx.fillRect(GX - 16, y - 2.5, W, 5); ctx.restore();
    }
  }
  // entities sorted by row for overlap
  for (let r = 0; r < ROWS; r++) {
    for (const p of plants) if (p.row === r) drawPlant(ctx, p.kind, p.x, p.y, gt, { fire: p.fire, hp: p.hp / p.maxHp, fuse: p.fuse, glow: p.glow, seed: p.seed });
    const rowAliens = aliens.filter(a => a.row === r).sort((a, b) => b.x - a.x);
    for (const a of rowAliens) {
      ctx.save();
      if (a.dead) { const k = Math.max(0, a.dead / 0.6); ctx.globalAlpha = k; ctx.translate(a.x, a.y); ctx.scale(1 + (1 - k) * 0.3, k); ctx.translate(-a.x, -a.y); }
      drawAlien(ctx, a.kind, a.x, a.y, gt, { walk: a.walk, attack: !!a.eating, flash: a.flash, slow: a.slow > 0, armor: a.maxArmor ? a.armor / a.maxArmor : 0, seed: a.seed });
      ctx.restore();
    }
  }
  for (const s of shots) {
    if (s.ice) {
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(gt * 8);
      ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 4 : 10; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath();
      ctx.fillStyle = '#c8f6ff'; ctx.shadowColor = '#7fe6ff'; ctx.shadowBlur = 10; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#2a6f8f'; ctx.stroke(); ctx.restore();
    } else {
      ctx.beginPath(); ctx.arc(s.x, s.y, 8, 0, Math.PI * 2); const sg = ctx.createRadialGradient(s.x - 3, s.y - 3, 1, s.x, s.y, 8); sg.addColorStop(0, '#d8ff9e'); sg.addColorStop(1, '#5fbf2f'); ctx.fillStyle = sg; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
    }
  }
  for (const p of parts) {
    const a = Math.max(0, p.life / p.max);
    if (p.text) { ctx.globalAlpha = a; text(p.text, p.x, p.y, p.size, p.color); ctx.globalAlpha = 1; continue; }
    if (p.ring) { ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 - a) + 6, 0, Math.PI * 2); ctx.lineWidth = 6 * a + 1; ctx.strokeStyle = p.color; ctx.stroke(); ctx.globalAlpha = 1; continue; }
    ctx.globalAlpha = a; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  }
  for (const s of suns) drawSun(ctx, s.x, s.y, gt, !s.collecting && s.life < 3 ? 0.4 + 0.6 * Math.abs(Math.sin(gt * 8)) : 1, 1);
}

function button(label: string, r: typeof bigBtn) {
  const hover = inR(mouse, r);
  const bg2 = ctx.createLinearGradient(0, r.y, 0, r.y + r.h); bg2.addColorStop(0, hover ? '#9dff7a' : '#7fe35a'); bg2.addColorStop(1, '#3f9f2a');
  panel(r.x, r.y + (hover ? -2 : 0), r.w, r.h, bg2 as unknown as string, 18);
  text(label, r.x + r.w / 2, r.y + r.h / 2 + (hover ? -2 : 0), 30);
}
function overlay(alpha = 0.55) { ctx.fillStyle = `rgba(14,6,34,${alpha})`; ctx.fillRect(0, 0, W, H); }

function drawTitle() {
  ctx.drawImage(bg, 0, 0); overlay(0.45);
  // UFO with beam
  const ux = W / 2 + Math.sin(gt * 0.8) * 160, uy = 90 + Math.sin(gt * 1.7) * 8;
  ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#9dffdf'; ctx.beginPath(); ctx.moveTo(ux - 20, uy + 10); ctx.lineTo(ux + 20, uy + 10); ctx.lineTo(ux + 70, H); ctx.lineTo(ux - 70, H); ctx.fill(); ctx.restore();
  ctx.beginPath(); ctx.ellipse(ux, uy - 8, 22, 18, 0, Math.PI, 0); ctx.fillStyle = 'rgba(170,230,255,0.7)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(ux, uy, 60, 16, 0, 0, Math.PI * 2); ctx.fillStyle = '#b8c4d6'; ctx.fill(); ctx.stroke();
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(ux - 40 + i * 20, uy + 2, 4, 0, 7); ctx.fillStyle = Math.sin(gt * 6 + i) > 0 ? '#ffe14f' : '#ff7ac8'; ctx.fill(); }
  text('Plants', W / 2 - 150, 190, 84, '#8cf25f');
  text('vs', W / 2 + 40, 200, 44, '#ffe14f');
  text('Aliens', W / 2 + 190, 190, 84, '#c9a2ff');
  text('Defend your garden from the invasion!', W / 2, 260, 24, '#fff');
  drawPlant(ctx, 'seedslinger', 250, 380, gt, { seed: 1 }); drawPlant(ctx, 'glowpetal', 170, 380, gt, { seed: 2, glow: 0.5 }); drawPlant(ctx, 'stonegourd', 330, 380, gt, { seed: 3 });
  drawAlien(ctx, 'grunt', 720, 390, gt, { walk: gt * 4, attack: false, flash: 0, slow: false, armor: 0, seed: 1 });
  drawAlien(ctx, 'domehead', 810, 390, gt, { walk: gt * 4 + 1, attack: false, flash: 0, slow: false, armor: 1, seed: 2 });
  drawAlien(ctx, 'zoomer', 900, 380, gt, { walk: gt * 4, attack: false, flash: 0, slow: false, armor: 0, seed: 3 });
  button('Play!', bigBtn);
  text('Click suns to collect them, pick a plant card, plant it on the lawn.', W / 2, 510, 18, '#e8dcff');
  text('Keys: 1-5 pick plant · S shovel · P pause · M mute · right-click cancel', W / 2, 540, 16, '#bfaee8');
  text('An original fan game · all art drawn in code', W / 2, 610, 13, '#8f7fc0', 'center', false);
}

let last = performance.now();
function frame(now: number) {
  let dt = Math.min(0.05, (now - last) / 1000); last = now;
  gt += dt;
  if (state === 'playing') { update(dt); }
  else if (state === 'won' || state === 'lost') { for (const p of parts) { p.life -= dt; } }
  render();
  requestAnimationFrame(frame);
}

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (state === 'title') { drawTitle(); return; }
  if (shake > 0) ctx.setTransform(1, 0, 0, 1, (Math.random() - 0.5) * 12 * shake / 0.4, (Math.random() - 0.5) * 12 * shake / 0.4);
  drawWorld();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawHUD();
  if (banner.t > 0 && state === 'playing') { ctx.globalAlpha = Math.min(1, banner.t * 2); text(banner.text, W / 2, 330, banner.text === 'FINAL WAVE!' ? 64 : 40, banner.text === 'FINAL WAVE!' ? '#ff4f6d' : '#ffe14f'); ctx.globalAlpha = 1; }
  if (shovel && state === 'playing') drawShovel(ctx, mouse.x + 14, mouse.y - 14, 0.8);
  if (state === 'paused') { overlay(); text('Paused', W / 2, 290, 72); button('Resume', bigBtn); }
  if (state === 'won') {
    overlay(); text('Garden Saved!', W / 2, 200, 76, '#8cf25f'); text('The aliens retreat to their mothership.', W / 2, 262, 26);
    drawPlant(ctx, 'glowpetal', W / 2, 385, gt, { glow: 1, seed: 4 }); button('Play Again', bigBtn);
  }
  if (state === 'lost') {
    overlay(0.65); text('The Aliens Abducted', W / 2, 230, 62, '#c9a2ff'); text('Your Garden!', W / 2, 300, 62, '#c9a2ff');
    drawAlien(ctx, 'grunt', W / 2, 395, gt, { walk: gt * 2, attack: true, flash: 0, slow: false, armor: 0, seed: 5 }); button('Try Again', bigBtn);
  }
}

reset();
if (document.fonts) document.fonts.load(`700 20px Fredoka`).catch(() => {});
requestAnimationFrame(frame);

// debug/test hook (used by automated playtests & screenshots)
(window as any).__pva = {
  get state() { return state; }, set state(s: State) { state = s; },
  start() { reset(); state = 'playing'; },
  addSun(n: number) { sun += n; },
  plant(k: PlantKind, r: number, c: number) { sun += PLANTS[k].cost; placePlant(k, r, c); },
  spawn(k: AlienKind, r: number, x?: number) { spawnAlien(k, r); if (x !== undefined) aliens[aliens.length - 1].x = x; },
  step(sec: number) { for (let t = 0; t < sec; t += 1 / 60) update(1 / 60); },
  setTime(t: number) { time = t; },
  setWave(i: number) { waveIdx = i; banner.t = 0; },
  has(r: number, c: number) { return plants.some(p => p.row === r && p.col === c); },
  threatRows() { return [...new Set(aliens.filter(a => !a.dead && a.x < W).map(a => a.row))]; },
  bigThreat() { const a = aliens.find(a => !a.dead && (a.kind === 'bloop' || a.kind === 'domehead') && a.x < GX + 6 * CW && a.x > GX + CW); if (!a) return null; return { r: a.row, c: Math.max(0, Math.min(COLS - 1, Math.floor((a.x - GX) / CW) - 1)) }; },
  collectAll() { for (const s of suns) if (!s.collecting) { s.collecting = true; } },
  tryPlant(k: PlantKind, r: number, c: number) {
    if (sun < PLANTS[k].cost || cooldowns[k] > 0 || plants.some(p => p.row === r && p.col === c)) return false;
    placePlant(k, r, c); return true;
  },
  get info() { return { sun, time, waveIdx, plants: plants.length, aliens: aliens.length, state }; },
};
