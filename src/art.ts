// All artwork is drawn procedurally with canvas vector paths (original art).
export const W = 1040, H = 640;
export const GX = 130, GY = 120, CW = 88, CH = 100, ROWS = 5, COLS = 9;
export const OUT = '#2a1f3d';
const TAU = Math.PI * 2;

export type PlantKind = 'glowpetal' | 'seedslinger' | 'stonegourd' | 'frostfern' | 'boomberry';
export type AlienKind = 'grunt' | 'domehead' | 'zoomer' | 'bloop';

type C = CanvasRenderingContext2D;

function stroke(ctx: C, lw = 2.5) { ctx.lineWidth = lw; ctx.strokeStyle = OUT; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
function ell(ctx: C, x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient, outline = true, lw = 2.5, rot = 0) {
  ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU); ctx.fillStyle = fill; ctx.fill(); if (outline) stroke(ctx, lw);
}
function shadow(ctx: C, x: number, y: number, rx: number) { ell(ctx, x, y, rx, rx * 0.3, 'rgba(10,30,10,0.28)', false); }
function leaf(ctx: C, x: number, y: number, ang: number, len: number, col: string) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.5, -len * 0.45, len, 0); ctx.quadraticCurveTo(len * 0.5, len * 0.45, 0, 0);
  ctx.fillStyle = col; ctx.fill(); stroke(ctx, 2);
  ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(len * 0.8, 0); ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
}
function eye(ctx: C, x: number, y: number, r: number, lookX = 0, lookY = 0, blink = false) {
  if (blink) { ctx.beginPath(); ctx.moveTo(x - r, y); ctx.quadraticCurveTo(x, y + r * 0.6, x + r, y); stroke(ctx, 2); return; }
  ell(ctx, x, y, r, r * 1.15, '#fff', true, 2);
  ell(ctx, x + lookX * r * 0.35, y + lookY * r * 0.3, r * 0.55, r * 0.65, '#1d1430', false);
  ell(ctx, x + lookX * r * 0.35 - r * 0.2, y - r * 0.3, r * 0.2, r * 0.2, '#fff', false);
}
function cheeks(ctx: C, x1: number, x2: number, y: number) { ell(ctx, x1, y, 4.5, 3, 'rgba(255,110,140,0.55)', false); ell(ctx, x2, y, 4.5, 3, 'rgba(255,110,140,0.55)', false); }
function stem(ctx: C, x: number, y: number, x2: number, y2: number, col = '#3c8f33') {
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - 6, (y + y2) / 2, x2, y2);
  ctx.lineWidth = 9; ctx.strokeStyle = OUT; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineWidth = 5.5; ctx.strokeStyle = col; ctx.stroke();
}
function blinkAt(t: number, seed: number) { return ((t + seed * 1.7) % 4.2) < 0.13; }

// ---------------------------------------------------------------- background
export function makeBackground(): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const ctx = c.getContext('2d')!;
  let s = 12345; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#140a33'); g.addColorStop(0.5, '#2c1a5c'); g.addColorStop(1, '#4a2c6e');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // nebula
  for (let i = 0; i < 6; i++) {
    const x = rnd() * W, y = rnd() * 120, r = 80 + rnd() * 120;
    const ng = ctx.createRadialGradient(x, y, 0, x, y, r);
    ng.addColorStop(0, i % 2 ? 'rgba(255,90,200,0.18)' : 'rgba(90,160,255,0.18)'); ng.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ng; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 160; i++) { ctx.fillStyle = `rgba(255,255,255,${0.3 + rnd() * 0.7})`; const r = rnd() * 1.6 + 0.3; ctx.beginPath(); ctx.arc(rnd() * W, rnd() * 115, r, 0, TAU); ctx.fill(); }
  // ringed planet
  const px = 985, py = 52;
  const pg = ctx.createRadialGradient(px - 10, py - 12, 4, px, py, 30); pg.addColorStop(0, '#ffd27a'); pg.addColorStop(1, '#e0703a');
  ctx.save(); ctx.translate(px, py); ctx.rotate(-0.35);
  ctx.beginPath(); ctx.ellipse(0, 0, 50, 11, 0, Math.PI, TAU); ctx.strokeStyle = '#f7b3ff'; ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
  ell(ctx, px, py, 28, 28, pg, false);
  ctx.save(); ctx.translate(px, py); ctx.rotate(-0.35);
  ctx.beginPath(); ctx.ellipse(0, 0, 50, 11, 0, 0, Math.PI); ctx.strokeStyle = '#f7b3ff'; ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
  // left yard: stone path + fence
  const yg = ctx.createLinearGradient(0, GY, 0, H); yg.addColorStop(0, '#8b6b4a'); yg.addColorStop(1, '#6e5038');
  ctx.fillStyle = yg; ctx.fillRect(0, GY - 14, GX, H - GY + 14);
  for (let i = 0; i < 40; i++) { const x = 8 + rnd() * (GX - 30), y = GY + rnd() * (H - GY - 10); ell(ctx, x, y, 7 + rnd() * 8, 5 + rnd() * 4, `hsl(30,${15 + rnd() * 15}%,${55 + rnd() * 15}%)`, true, 1.5); }
  // fence posts
  for (let r = 0; r <= ROWS; r++) {
    const y = GY + r * CH - 6;
    ctx.fillStyle = '#e9d8b4'; ctx.beginPath(); ctx.roundRect(14, y - 30, 12, 40, 3); ctx.fill(); stroke(ctx, 2);
  }
  ctx.fillStyle = '#e9d8b4'; ctx.fillRect(14, GY + 2, 12, H - GY);
  // lawn
  ctx.save(); ctx.beginPath(); ctx.roundRect(GX - 6, GY - 6, COLS * CW + 12, ROWS * CH + 12, 14); ctx.fillStyle = '#2f6b22'; ctx.fill(); ctx.restore();
  for (let r = 0; r < ROWS; r++) for (let col = 0; col < COLS; col++) {
    const light = (r + col) % 2 === 0;
    ctx.fillStyle = light ? (r % 2 ? '#6cc24e' : '#73c955') : (r % 2 ? '#5cb043' : '#62b748');
    ctx.fillRect(GX + col * CW, GY + r * CH, CW, CH);
  }
  for (let i = 0; i < 900; i++) {
    const x = GX + rnd() * COLS * CW, y = GY + 6 + rnd() * (ROWS * CH - 6);
    ctx.strokeStyle = rnd() < 0.5 ? 'rgba(30,90,20,0.35)' : 'rgba(200,255,150,0.25)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rnd() - 0.5) * 4, y - 4 - rnd() * 5); ctx.stroke();
  }
  for (let i = 0; i < 22; i++) {
    const x = GX + 10 + rnd() * (COLS * CW - 20), y = GY + 10 + rnd() * (ROWS * CH - 20);
    const col = ['#fff', '#ffe066', '#ff9ad5'][i % 3];
    for (let k = 0; k < 5; k++) ell(ctx, x + Math.cos(k * 1.256) * 2.6, y + Math.sin(k * 1.256) * 2.6, 2, 2, col, false);
    ell(ctx, x, y, 1.5, 1.5, '#f5a623', false);
  }
  // row separators shading
  for (let r = 1; r < ROWS; r++) { ctx.fillStyle = 'rgba(0,40,0,0.10)'; ctx.fillRect(GX, GY + r * CH - 2, COLS * CW, 3); }
  // hedge above lawn
  for (let x = GX - 10; x < GX + COLS * CW + 10; x += 16) ell(ctx, x, GY - 8, 13, 11, x % 32 ? '#2f7d2a' : '#378a30', true, 1.5);
  // alien landing zone (right)
  const ax = GX + COLS * CW + 6;
  const ag = ctx.createLinearGradient(ax, 0, W, 0); ag.addColorStop(0, '#4a3a5e'); ag.addColorStop(1, '#2e2242');
  ctx.fillStyle = ag; ctx.fillRect(ax, GY - 14, W - ax, H - GY + 14);
  for (let i = 0; i < 30; i++) ell(ctx, ax + 6 + rnd() * (W - ax - 10), GY + rnd() * (H - GY), 3 + rnd() * 8, 2 + rnd() * 4, 'rgba(20,10,35,0.45)', false);
  for (let i = 0; i < 9; i++) {
    const x = ax + 12 + rnd() * (W - ax - 24), y = GY + 20 + rnd() * (H - GY - 30), h = 10 + rnd() * 14;
    ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x, y - h); ctx.lineTo(x + 5, y); ctx.closePath();
    ctx.fillStyle = i % 2 ? '#6dffcf' : '#c38bff'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0; stroke(ctx, 1.5);
  }
  // vignette
  const vg = ctx.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 720); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,0,30,0.45)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  return c;
}

// ---------------------------------------------------------------- plants
export interface PlantDrawOpts { fire?: number; hp?: number; fuse?: number; glow?: number; seed?: number; }

export function drawPlant(ctx: C, kind: PlantKind, x: number, y: number, t: number, o: PlantDrawOpts = {}) {
  const seed = o.seed ?? 0, fire = o.fire ?? 0;
  const bob = Math.sin(t * 3 + seed) * 2;
  const blink = blinkAt(t, seed);
  ctx.save();
  switch (kind) {
    case 'seedslinger':
    case 'frostfern': {
      const ice = kind === 'frostfern';
      const head = ice ? '#8fe3ff' : '#76d94e', dark = ice ? '#4fb3d9' : '#4fae34';
      shadow(ctx, x, y, 24);
      stem(ctx, x, y, x - 3, y - 36 + bob, ice ? '#3d9bb8' : '#3c8f33');
      leaf(ctx, x - 2, y - 3, Math.PI + 0.35, 22, ice ? '#7cd0ee' : '#4caf3a');
      leaf(ctx, x + 2, y - 3, -0.35, 22, ice ? '#7cd0ee' : '#4caf3a');
      const sq = fire > 0 ? Math.sin(fire * Math.PI) * 0.18 : 0;
      const hx = x - 2 - sq * 10, hy = y - 52 + bob;
      // back tuft
      if (ice) {
        for (let i = 0; i < 3; i++) { ctx.beginPath(); const a = -2.2 + i * 0.45; ctx.moveTo(hx + Math.cos(a) * 14, hy + Math.sin(a) * 14); ctx.lineTo(hx + Math.cos(a) * 32, hy + Math.sin(a) * 32); ctx.lineTo(hx + Math.cos(a + 0.25) * 14, hy + Math.sin(a + 0.25) * 14); ctx.closePath(); ctx.fillStyle = '#e4fbff'; ctx.fill(); stroke(ctx, 2); }
      } else leaf(ctx, hx - 14, hy - 8, Math.PI + 0.7, 18, '#5cc23f');
      // snout
      const sx = hx + 24 + sq * 14;
      ctx.beginPath(); ctx.roundRect(hx + 6, hy - 9, sx - hx - 6, 18, 6); ctx.fillStyle = head; ctx.fill(); stroke(ctx);
      ell(ctx, sx, hy, 8 + sq * 6, 11 + sq * 4, dark);
      ell(ctx, sx + 1, hy, 4 + sq * 3, 6 + sq * 2, '#1d3a18', false);
      ell(ctx, hx, hy, 21 * (1 + sq * 0.3), 20 * (1 - sq * 0.25), head);
      ell(ctx, hx - 7, hy - 8, 6, 4, 'rgba(255,255,255,0.45)', false, 0, -0.5);
      eye(ctx, hx + 5, hy - 5, 6, 1, 0, blink);
      if (ice) { ctx.beginPath(); ctx.moveTo(hx - 2, hy - 13); ctx.lineTo(hx + 10, hy - 11); stroke(ctx, 2.5); }
      cheeks(ctx, hx - 4, hx + 14, hy + 6);
      if (fire > 0.55) {
        ctx.save(); ctx.translate(sx + 12, hy); ctx.fillStyle = ice ? '#dffbff' : '#fff59a';
        ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = i * TAU / 10, r = i % 2 ? 6 : 15; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.restore();
      }
      break;
    }
    case 'glowpetal': {
      const glow = o.glow ?? 0;
      shadow(ctx, x, y, 22);
      stem(ctx, x, y, x, y - 38 + bob);
      leaf(ctx, x - 2, y - 6, Math.PI + 0.4, 22, '#4caf3a'); leaf(ctx, x + 2, y - 14, -0.5, 20, '#4caf3a');
      const cx = x, cy = y - 52 + bob;
      if (glow > 0) { const gg = ctx.createRadialGradient(cx, cy, 5, cx, cy, 50); gg.addColorStop(0, `rgba(255,240,140,${0.7 * glow})`); gg.addColorStop(1, 'rgba(255,240,140,0)'); ctx.fillStyle = gg; ctx.fillRect(cx - 50, cy - 50, 100, 100); }
      const rot = Math.sin(t * 1.5 + seed) * 0.15;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
      for (let i = 0; i < 5; i++) {
        ctx.save(); ctx.rotate(i * TAU / 5 - Math.PI / 2);
        const pg = ctx.createLinearGradient(0, 0, 34, 0); pg.addColorStop(0, '#ffd23f'); pg.addColorStop(1, '#ff7ac8');
        ctx.beginPath(); ctx.moveTo(8, -9); ctx.quadraticCurveTo(30, -14, 34, 0); ctx.quadraticCurveTo(30, 14, 8, 9); ctx.closePath(); ctx.fillStyle = pg; ctx.fill(); stroke(ctx, 2.2);
        ctx.restore();
      }
      ctx.restore();
      ell(ctx, cx, cy, 17, 16, '#ffe98a');
      eye(ctx, cx - 6, cy - 3, 4, 0, 0, blink); eye(ctx, cx + 6, cy - 3, 4, 0, 0, blink);
      ctx.beginPath(); ctx.arc(cx, cy + 3, 5, 0.2, Math.PI - 0.2); stroke(ctx, 2);
      cheeks(ctx, cx - 10, cx + 10, cy + 4);
      break;
    }
    case 'stonegourd': {
      const hp = o.hp ?? 1;
      const br = Math.sin(t * 2 + seed) * 0.02;
      shadow(ctx, x, y, 30);
      const cx = x, cy = y - 34;
      const rx = 30 * (1 + br), ry = 36 * (1 - br);
      const gg = ctx.createRadialGradient(cx - 10, cy - 14, 4, cx, cy, 40); gg.addColorStop(0, '#f2b35e'); gg.addColorStop(1, '#c4702b');
      ell(ctx, cx, cy, rx, ry, gg);
      ctx.strokeStyle = 'rgba(120,60,20,0.55)'; ctx.lineWidth = 2;
      for (const k of [-0.55, 0, 0.55]) { ctx.beginPath(); ctx.ellipse(cx, cy, rx * Math.abs(k) + 2, ry - 2, 0, -Math.PI / 2, Math.PI / 2, k < 0); if (k !== 0) ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(cx, cy - ry + 2); ctx.lineTo(cx, cy + ry - 2); ctx.stroke();
      // stem + curl
      ctx.beginPath(); ctx.roundRect(cx - 4, cy - ry - 10, 8, 13, 3); ctx.fillStyle = '#6b8f2a'; ctx.fill(); stroke(ctx, 2);
      leaf(ctx, cx + 3, cy - ry - 5, -0.4, 16, '#5cb043');
      // face
      const worried = hp < 0.5;
      eye(ctx, cx - 11, cy - 6, 5.5, -1, worried ? -0.5 : 0, blink); eye(ctx, cx + 7, cy - 6, 5.5, -1, worried ? -0.5 : 0, blink);
      ctx.beginPath(); ctx.moveTo(cx - 18, cy - 15 + (worried ? -2 : 2)); ctx.lineTo(cx - 6, cy - 15); ctx.moveTo(cx + 2, cy - 15); ctx.lineTo(cx + 14, cy - 15 + (worried ? -2 : 2)); stroke(ctx, 2.5);
      ctx.beginPath(); if (worried) ctx.arc(cx - 3, cy + 12, 5, Math.PI + 0.3, -0.3); else { ctx.moveTo(cx - 9, cy + 9); ctx.lineTo(cx + 4, cy + 9); } stroke(ctx, 2.5);
      if (hp < 0.66) { ctx.beginPath(); ctx.moveTo(cx + 18, cy - 22); ctx.lineTo(cx + 12, cy - 12); ctx.lineTo(cx + 20, cy - 4); ctx.lineTo(cx + 14, cy + 6); stroke(ctx, 2); }
      if (hp < 0.33) { ctx.beginPath(); ctx.moveTo(cx - 24, cy + 4); ctx.lineTo(cx - 14, cy + 12); ctx.lineTo(cx - 20, cy + 22); ctx.moveTo(cx + 6, cy + 30); ctx.lineTo(cx + 10, cy + 20); ctx.lineTo(cx + 2, cy + 16); stroke(ctx, 2); }
      break;
    }
    case 'boomberry': {
      const fuse = o.fuse ?? 0;
      const sc = 1 + fuse * 0.45 + (fuse > 0 ? Math.sin(t * 40) * 0.04 : 0);
      shadow(ctx, x, y, 26);
      ctx.translate(x, y - 30); ctx.scale(sc, sc);
      ctx.beginPath(); ctx.moveTo(-12, -14); ctx.quadraticCurveTo(-4, -34, 2, -36); ctx.moveTo(12, -12); ctx.quadraticCurveTo(8, -30, 2, -36); stroke(ctx, 6);
      ctx.beginPath(); ctx.moveTo(-12, -14); ctx.quadraticCurveTo(-4, -34, 2, -36); ctx.moveTo(12, -12); ctx.quadraticCurveTo(8, -30, 2, -36); ctx.strokeStyle = '#3c8f33'; ctx.lineWidth = 3; ctx.stroke();
      leaf(ctx, 2, -36, -0.3, 18, '#4caf3a'); leaf(ctx, 2, -36, Math.PI + 0.5, 14, '#4caf3a');
      const flash = fuse > 0 && Math.sin(t * 30) > 0;
      for (const [bx, by, r] of [[-13, 2, 18], [13, 6, 16]] as const) {
        const bg = ctx.createRadialGradient(bx - 5, by - 6, 2, bx, by, r); bg.addColorStop(0, flash ? '#fff' : '#ff6f7f'); bg.addColorStop(1, flash ? '#ffb0b0' : '#c41f3e');
        ell(ctx, bx, by, r, r, bg); ell(ctx, bx - 6, by - 7, 4, 3, 'rgba(255,255,255,0.6)', false);
        eye(ctx, bx - 5, by - 1, 3.5, 0, 0, false); eye(ctx, bx + 4, by - 1, 3.5, 0, 0, false);
        ctx.beginPath(); ctx.moveTo(bx - 10, by - 9); ctx.lineTo(bx - 2, by - 5); ctx.moveTo(bx + 9, by - 9); ctx.lineTo(bx + 1, by - 5); stroke(ctx, 2.2);
        ctx.beginPath(); ctx.arc(bx, by + 9, 3.5, Math.PI + 0.2, -0.2); stroke(ctx, 2);
      }
      break;
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- aliens
export interface AlienDrawOpts { walk: number; attack: boolean; flash: number; slow: boolean; armor: number; seed: number; }

function raygun(ctx: C, x: number, y: number, attack: boolean, t: number) {
  ctx.beginPath(); ctx.roundRect(x - 14, y - 4, 16, 8, 3); ctx.fillStyle = '#9aa7c7'; ctx.fill(); stroke(ctx, 2);
  ell(ctx, x - 15, y, 3.5, 3.5, '#ff4fd8', true, 1.5);
  if (attack && Math.sin(t * 25) > -0.2) {
    ctx.beginPath(); ctx.moveTo(x - 18, y); for (let i = 1; i <= 4; i++) ctx.lineTo(x - 18 - i * 6, y + (i % 2 ? -5 : 5));
    ctx.strokeStyle = '#ff7cf0'; ctx.lineWidth = 3; ctx.shadowColor = '#ff4fd8'; ctx.shadowBlur = 10; ctx.stroke(); ctx.shadowBlur = 0;
  }
}

function greyHead(ctx: C, hx: number, hy: number, skin: string, t: number, seed: number, attack: boolean) {
  const ab = Math.sin(t * 4 + seed) * 3;
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(hx + s * 8, hy - 18); ctx.quadraticCurveTo(hx + s * 14, hy - 34, hx + s * 12 + ab * 0.5, hy - 42); stroke(ctx, 2.5);
    ell(ctx, hx + s * 12 + ab * 0.5, hy - 43, 4.5, 4.5, '#7dffb3', true, 2);
  }
  ctx.beginPath(); ctx.moveTo(hx, hy + 22); ctx.bezierCurveTo(hx - 30, hy + 10, hx - 30, hy - 26, hx, hy - 24); ctx.bezierCurveTo(hx + 30, hy - 26, hx + 30, hy + 10, hx, hy + 22);
  const hg = ctx.createRadialGradient(hx - 8, hy - 10, 3, hx, hy, 32); hg.addColorStop(0, '#e9f0e6'); hg.addColorStop(1, skin);
  ctx.fillStyle = hg; ctx.fill(); stroke(ctx);
  const blink = blinkAt(t, seed);
  for (const s of [-1, 1]) {
    ctx.save(); ctx.translate(hx - 3 + s * 9, hy + 1); ctx.rotate(s * 0.5);
    if (blink) { ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); stroke(ctx, 2.5); }
    else { ell(ctx, 0, 0, 6.5, 10, '#120b22', false); ell(ctx, -2, -4, 2.2, 2.6, '#fff', false); ell(ctx, 2, 3, 1.2, 1.4, 'rgba(255,255,255,0.7)', false); }
    ctx.restore();
  }
  ctx.beginPath(); if (attack) ell(ctx, hx - 4, hy + 15, 3, 2.5, '#3a1d3d', false); else { ctx.arc(hx - 4, hy + 13, 3, 0.3, Math.PI - 0.3); stroke(ctx, 1.8); }
}

export function drawAlien(ctx: C, kind: AlienKind, x: number, y: number, t: number, o: AlienDrawOpts) {
  ctx.save();
  const w = o.walk;
  if (o.flash > 0) ctx.filter = 'brightness(1.8)';
  else if (o.slow) ctx.filter = 'sepia(0.7) hue-rotate(150deg) saturate(2)';
  switch (kind) {
    case 'grunt':
    case 'domehead': {
      shadow(ctx, x, y, 22);
      const step = Math.sin(w), bodyBob = Math.abs(Math.cos(w)) * 3;
      // legs
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + s * 5, y - 24); ctx.lineTo(x + s * 5 + step * s * 8, y - 2); ctx.lineWidth = 7; ctx.strokeStyle = OUT; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineWidth = 4; ctx.strokeStyle = '#8d9bb5'; ctx.stroke(); }
      const by = y - 36 - bodyBob;
      // back arm
      ctx.beginPath(); ctx.moveTo(x + 6, by - 4); ctx.lineTo(x + 14, by + 8 - step * 4); ctx.lineWidth = 6; ctx.strokeStyle = OUT; ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = '#b8c4d6'; ctx.stroke();
      const sg = ctx.createLinearGradient(x - 14, 0, x + 14, 0); sg.addColorStop(0, '#dfe7f5'); sg.addColorStop(1, '#8e9bb8');
      ell(ctx, x, by, 15, 17, sg);
      ell(ctx, x - 2, by + 2, 5, 5, kind === 'domehead' ? '#ffcf3f' : '#7dffb3', true, 1.5);
      // front arm + raygun
      const ay = o.attack ? by - 6 : by + 2 + step * 3;
      ctx.beginPath(); ctx.moveTo(x - 6, by - 6); ctx.lineTo(x - 18, ay); ctx.lineWidth = 6; ctx.strokeStyle = OUT; ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = '#b8c4d6'; ctx.stroke();
      raygun(ctx, x - 18, ay, o.attack, t);
      const hx = x - 2, hy = by - 36;
      greyHead(ctx, hx, hy, kind === 'domehead' ? '#9fb4c9' : '#a3b59c', t, o.seed, o.attack);
      if (kind === 'domehead' && o.armor > 0) {
        ell(ctx, hx, hy - 4, 33, 34, 'rgba(170,230,255,0.22)', false);
        ctx.beginPath(); ctx.ellipse(hx, hy - 4, 33, 34, 0, 0, TAU); ctx.strokeStyle = 'rgba(225,250,255,0.95)'; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.beginPath(); ctx.arc(hx, hy - 4, 26, -2.6, -1.7); ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 4; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(hx, hy + 28, 20, 6, 0, 0, TAU); ctx.fillStyle = '#ffcf3f'; ctx.fill(); stroke(ctx, 2);
        if (o.armor < 0.6) { ctx.beginPath(); ctx.moveTo(hx + 14, hy - 30); ctx.lineTo(hx + 8, hy - 18); ctx.lineTo(hx + 16, hy - 10); ctx.lineTo(hx + 10, hy); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
        if (o.armor < 0.3) { ctx.beginPath(); ctx.moveTo(hx - 24, hy - 18); ctx.lineTo(hx - 14, hy - 12); ctx.lineTo(hx - 20, hy - 2); ctx.lineTo(hx - 10, hy + 4); ctx.stroke(); }
      }
      break;
    }
    case 'zoomer': {
      const hover = Math.sin(t * 6 + o.seed) * 3;
      shadow(ctx, x + 4, y, 26);
      const by = y - 18 + hover;
      // flame jets
      const fl = 10 + Math.random() * 8;
      ctx.beginPath(); ctx.moveTo(x + 26, by - 3); ctx.lineTo(x + 26 + fl, by + 1); ctx.lineTo(x + 26, by + 5); ctx.fillStyle = '#ffb02e'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + 26, by - 1); ctx.lineTo(x + 26 + fl * 0.6, by + 1); ctx.lineTo(x + 26, by + 3); ctx.fillStyle = '#fff5b0'; ctx.fill();
      // glow under board
      const gg = ctx.createRadialGradient(x, by + 8, 2, x, by + 8, 24); gg.addColorStop(0, 'rgba(120,255,230,0.8)'); gg.addColorStop(1, 'rgba(120,255,230,0)'); ctx.fillStyle = gg; ctx.fillRect(x - 26, by - 10, 52, 40);
      ctx.beginPath(); ctx.roundRect(x - 28, by - 4, 56, 9, 5); ctx.fillStyle = '#ff7a3d'; ctx.fill(); stroke(ctx, 2.5);
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(x - 18, by - 1, 30, 3);
      // crouched body
      const sk = '#b98cff';
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + s * 8, by - 4); ctx.lineTo(x + s * 4, by - 16); ctx.lineWidth = 7; ctx.strokeStyle = OUT; ctx.stroke(); ctx.lineWidth = 4; ctx.strokeStyle = '#7a5bc4'; ctx.stroke(); }
      ell(ctx, x + 2, by - 24, 13, 12, '#6e4fc0');
      ctx.beginPath(); ctx.moveTo(x - 4, by - 26); ctx.lineTo(x - 18, o.attack ? by - 30 : by - 18); ctx.lineWidth = 6; ctx.strokeStyle = OUT; ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = sk; ctx.stroke();
      if (o.attack) raygun(ctx, x - 18, by - 30, true, t);
      const hx = x - 4, hy = by - 46;
      ell(ctx, hx, hy, 19, 17, sk);
      // scarf trail
      ctx.beginPath(); ctx.moveTo(hx + 10, hy + 14); ctx.quadraticCurveTo(hx + 30, hy + 10 + Math.sin(t * 12) * 4, hx + 42, hy + 16); ctx.lineWidth = 6; ctx.strokeStyle = '#ff4f6d'; ctx.stroke();
      // goggles
      ctx.beginPath(); ctx.moveTo(hx - 18, hy - 3); ctx.lineTo(hx + 18, hy - 3); ctx.lineWidth = 4; ctx.strokeStyle = '#3a2a55'; ctx.stroke();
      ell(ctx, hx - 8, hy - 3, 7, 6, '#7ef0ff'); ell(ctx, hx + 6, hy - 3, 6, 6, '#7ef0ff');
      ell(ctx, hx - 10, hy - 5, 2, 2, '#fff', false); ell(ctx, hx + 4, hy - 5, 2, 2, '#fff', false);
      ctx.beginPath(); ctx.arc(hx - 4, hy + 7, 4, 0.2, Math.PI - 0.2); stroke(ctx, 2);
      // antenna
      ctx.beginPath(); ctx.moveTo(hx + 4, hy - 16); ctx.quadraticCurveTo(hx + 14, hy - 30, hx + 22, hy - 28); stroke(ctx, 2.5); ell(ctx, hx + 22, hy - 28, 4, 4, '#ffe14f', true, 2);
      break;
    }
    case 'bloop': {
      const sq = Math.sin(w * 1.0) * 0.08;
      shadow(ctx, x, y, 44);
      const rx = 44 * (1 + sq), ry = 46 * (1 - sq), cy = y - ry + 2;
      const bg = ctx.createRadialGradient(x - 14, cy - 18, 6, x, cy, 56); bg.addColorStop(0, '#c9ff8a'); bg.addColorStop(1, '#4fbf3a');
      ctx.beginPath(); ctx.moveTo(x - rx, y - 2);
      ctx.bezierCurveTo(x - rx - 4, cy - ry * 0.9, x + rx + 4, cy - ry * 0.9, x + rx, y - 2);
      for (let i = 0; i < 4; i++) { const x1 = x + rx - (i + 0.5) * rx / 2; ctx.quadraticCurveTo(x1, y + 6, x + rx - (i + 1) * rx / 2, y - 2); }
      ctx.closePath(); ctx.fillStyle = bg; ctx.fill(); stroke(ctx, 3);
      ell(ctx, x - 18, cy - 20, 10, 6, 'rgba(255,255,255,0.45)', false, 0, -0.5);
      ell(ctx, x + 16, cy + 10, 5, 5, 'rgba(40,120,30,0.35)', false); ell(ctx, x + 24, cy - 6, 3, 3, 'rgba(40,120,30,0.35)', false);
      // antennae
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + s * 14, cy - ry + 8); ctx.quadraticCurveTo(x + s * 22, cy - ry - 12, x + s * 16 + Math.sin(t * 3) * 3, cy - ry - 20); stroke(ctx, 3); ell(ctx, x + s * 16 + Math.sin(t * 3) * 3, cy - ry - 21, 5, 5, '#ff7ac8', true, 2); }
      // eye
      const blink = blinkAt(t, o.seed);
      if (blink) { ctx.beginPath(); ctx.moveTo(x - 20, cy - 8); ctx.lineTo(x + 6, cy - 8); stroke(ctx, 3); }
      else { ell(ctx, x - 7, cy - 8, 15, 15, '#fff'); ell(ctx, x - 13, cy - 7, 7, 8, '#1d1430', false); ell(ctx, x - 15, cy - 10, 2.5, 2.5, '#fff', false); }
      ctx.beginPath(); ctx.moveTo(x - 24, cy - 26); ctx.lineTo(x + 8, cy - 22); stroke(ctx, 3.5);
      // mouth
      ctx.beginPath(); ctx.ellipse(x - 10, cy + 20, o.attack ? 14 : 12, o.attack ? 9 : 5, 0, 0, TAU); ctx.fillStyle = '#3a1030'; ctx.fill(); stroke(ctx, 2.5);
      ctx.fillStyle = '#fff'; for (const tx of [-18, -10, -2]) { ctx.beginPath(); ctx.moveTo(tx - 3, cy + 16); ctx.lineTo(tx + 3, cy + 16); ctx.lineTo(tx, cy + 21); ctx.fill(); }
      break;
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- misc
export function drawSun(ctx: C, x: number, y: number, t: number, alpha = 1, scale = 1) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.scale(scale, scale);
  const gg = ctx.createRadialGradient(0, 0, 4, 0, 0, 34); gg.addColorStop(0, 'rgba(255,240,120,0.8)'); gg.addColorStop(1, 'rgba(255,200,60,0)');
  ctx.fillStyle = gg; ctx.fillRect(-34, -34, 68, 68);
  ctx.save(); ctx.rotate(t * 1.2);
  ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = i * TAU / 16, r = i % 2 ? 15 : 24; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath();
  ctx.fillStyle = '#ffcc33'; ctx.fill(); stroke(ctx, 2); ctx.restore();
  const cg = ctx.createRadialGradient(-4, -5, 2, 0, 0, 15); cg.addColorStop(0, '#fffbd0'); cg.addColorStop(1, '#ffd84a');
  ell(ctx, 0, 0, 14, 14, cg, true, 2);
  ell(ctx, -4.5, -2, 1.8, 2.4, OUT, false); ell(ctx, 4.5, -2, 1.8, 2.4, OUT, false);
  ctx.beginPath(); ctx.arc(0, 2, 4, 0.3, Math.PI - 0.3); stroke(ctx, 1.6);
  cheeks(ctx, -8, 8, 3);
  ctx.restore();
}

export function drawGnome(ctx: C, x: number, y: number, t: number, firing: boolean) {
  ctx.save();
  shadow(ctx, x, y, 16);
  const b = firing ? Math.sin(t * 50) * 1.5 : Math.sin(t * 2) * 1;
  ell(ctx, x - 6, y - 3, 6, 4, '#5b3a22', true, 2); ell(ctx, x + 6, y - 3, 6, 4, '#5b3a22', true, 2);
  ctx.beginPath(); ctx.moveTo(x - 13, y - 4); ctx.lineTo(x + 13, y - 4); ctx.lineTo(x + 9, y - 26); ctx.lineTo(x - 9, y - 26); ctx.closePath(); ctx.fillStyle = '#3d7bd9'; ctx.fill(); stroke(ctx, 2);
  ctx.fillStyle = '#5b3a22'; ctx.fillRect(x - 12, y - 13, 24, 4);
  ell(ctx, x, y - 32 + b, 9, 9, '#ffd2b0', true, 2);
  ctx.beginPath(); ctx.moveTo(x - 9, y - 32 + b); ctx.quadraticCurveTo(x, y - 6, x + 9, y - 32 + b); ctx.quadraticCurveTo(x, y - 24, x - 9, y - 32 + b); ctx.fillStyle = '#fff'; ctx.fill(); stroke(ctx, 2);
  ell(ctx, x + 1, y - 31 + b, 3.5, 3, '#ff8f8f', true, 1.5);
  ell(ctx, x - 3, y - 35 + b, 1.4, 1.4, OUT, false); ell(ctx, x + 4, y - 35 + b, 1.4, 1.4, OUT, false);
  ctx.beginPath(); ctx.moveTo(x - 11, y - 38 + b); ctx.quadraticCurveTo(x - 2, y - 66 + b, x + 6, y - 62 + b); ctx.lineTo(x + 11, y - 38 + b); ctx.closePath(); ctx.fillStyle = '#e8344e'; ctx.fill(); stroke(ctx, 2);
  // laser blaster
  ctx.beginPath(); ctx.roundRect(x + 6, y - 22, 20, 8, 3); ctx.fillStyle = '#c0c8dd'; ctx.fill(); stroke(ctx, 2);
  ell(ctx, x + 27, y - 18, 3, 3, firing ? '#fff' : '#ff4f6d', true, 1.5);
  ctx.restore();
}

export function drawShovel(ctx: C, x: number, y: number, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-0.7);
  ctx.beginPath(); ctx.roundRect(-3, -26, 6, 30, 2); ctx.fillStyle = '#a0683a'; ctx.fill(); stroke(ctx, 2);
  ctx.beginPath(); ctx.roundRect(-8, -32, 16, 7, 3); ctx.fillStyle = '#a0683a'; ctx.fill(); stroke(ctx, 2);
  ctx.beginPath(); ctx.moveTo(-10, 4); ctx.lineTo(10, 4); ctx.lineTo(10, 16); ctx.quadraticCurveTo(0, 30, -10, 16); ctx.closePath();
  const g = ctx.createLinearGradient(-10, 0, 10, 0); g.addColorStop(0, '#e6eaf2'); g.addColorStop(1, '#8a93a8'); ctx.fillStyle = g; ctx.fill(); stroke(ctx, 2);
  ctx.restore();
}
