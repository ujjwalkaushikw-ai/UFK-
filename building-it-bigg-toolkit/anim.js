/* Jensen Huang: The Boss Rush — deterministic canvas animation.
   render(t) draws the frame at time t (seconds). Everything is a pure function of t. */
'use strict';
const W = 1080, H = 1920;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const TL = window.TL, A = TL.anc;
const HEAD = new Image(); HEAD.src = window.HEAD_SRC;
const INK = '#151515', YEL = '#FFD60A', GREEN = '#2fd27a';
const FONT = 'Inter', MONO = "'DejaVu Sans Mono'", SERIF = "'DejaVu Serif'";

/* ---------------- utils ---------------- */
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const eOut = k => 1 - Math.pow(1 - k, 3);
const eIn = k => k * k * k;
const eIO = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const eBack = k => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
const eElastic = k => k === 0 ? 0 : k === 1 ? 1 : Math.pow(2, -10 * k) * Math.sin((k * 10 - .75) * (2 * Math.PI / 3)) + 1;
function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
let BOIL = 0;
function jit(x, y, amt = 2.0) {
  const h1 = hash(x * 0.0131 + y * 0.0711 + BOIL * 1.71), h2 = hash(x * 0.0313 - y * 0.0173 + BOIL * 2.33 + 5.1);
  return [x + (h1 - .5) * amt * 2, y + (h2 - .5) * amt * 2];
}
function pop(t, t0, d = .28) { if (t < t0) return 0; return eBack(prog(t, t0, t0 + d)); }
function fade(t, t0, t1, d = .2) { return clamp(Math.min((t - t0) / d, (t1 - t) / d)); }

/* ---------------- drawing primitives (hand-drawn wobble) ---------------- */
function pathPts(pts, close, amt) {
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) { const [x, y] = jit(pts[i][0], pts[i][1], amt); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  if (close) ctx.closePath();
}
function stroke(lw = 7, col = INK) { ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
function poly(pts, fill, lw = 7, col = INK, amt = 2) {
  pathPts(pts, true, amt);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (lw) stroke(lw, col);
}
function seg(x1, y1, x2, y2, lw = 7, col = INK) {
  const pts = []; const n = 3;
  for (let i = 0; i <= n; i++) pts.push([lerp(x1, x2, i / n), lerp(y1, y2, i / n)]);
  pathPts(pts, false, 1.4); stroke(lw, col);
}
function circ(cx, cy, r, fill, lw = 7, col = INK) {
  const n = Math.max(14, Math.min(40, Math.round(r / 3))); const pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  poly(pts, fill, lw, col, Math.min(2.2, r * .06 + .4));
}
function ell(cx, cy, rx, ry, fill, lw = 7, rot = 0, col = INK) {
  const n = 28, pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]); }
  poly(pts, fill, lw, col, 1.6);
}
function rr(x, y, w, h, r, fill, lw = 7, col = INK) {
  r = Math.min(r, w / 2, h / 2); const pts = []; const k = 5;
  const corner = (cx, cy, a0) => { for (let i = 0; i <= k; i++) { const a = a0 + i / k * Math.PI / 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  corner(x + w - r, y + r, -Math.PI / 2); corner(x + w - r, y + h - r, 0); corner(x + r, y + h - r, Math.PI / 2); corner(x + r, y + r, Math.PI);
  poly(pts, fill, lw, col, 1.5);
}
function bg(col) { ctx.fillStyle = col; ctx.fillRect(-400, -400, W + 800, H + 800); }
function vgrad(c1, c2, y1 = 0, y2 = H) { const g = ctx.createLinearGradient(0, y1, 0, y2); g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.fillRect(-400, -400, W + 800, H + 800); }
function glow(x, y, r, col, a = .45) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col.replace('A', a)); g.addColorStop(1, col.replace('A', 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}
function txt(s, x, y, o = {}) {
  const size = o.size || 60, wt = o.weight || 900, fam = o.font || FONT;
  ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); if (o.scale) ctx.scale(o.scale, o.scale);
  ctx.globalAlpha *= (o.alpha == null ? 1 : o.alpha);
  ctx.font = `${wt} ${size}px ${fam}`; ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.base || 'middle';
  if (o.maxW) { const m = ctx.measureText(s).width; if (m > o.maxW) { const k = o.maxW / m; ctx.scale(k, k); } }
  if (o.sw !== 0) { ctx.lineWidth = o.sw || size * .16; ctx.strokeStyle = o.stroke || INK; ctx.lineJoin = 'round'; ctx.strokeText(s, 0, 0); }
  ctx.fillStyle = o.fill || '#fff'; ctx.fillText(s, 0, 0); ctx.restore();
}
function measure(s, size, wt = 900, fam = FONT) { ctx.save(); ctx.font = `${wt} ${size}px ${fam}`; const m = ctx.measureText(s).width; ctx.restore(); return m; }

/* sticker card (supers) */
function card(s, x, y, t, t0, o = {}) {
  if (t < t0 || (o.t1 && t > o.t1 + .2)) return;
  let k = pop(t, t0, .3); if (o.t1) k *= clamp((o.t1 + .2 - t) / .2);
  const size = o.size || 40, lines = s.split('\n');
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot == null ? -.025 : o.rot); ctx.scale(k, k);
  const w = Math.min(o.maxW || 960, Math.max(...lines.map(l => measure(l, size, 900))) + 56);
  const h = lines.length * size * 1.18 + 34;
  rr(-w / 2 + 8, -h / 2 + 10, w, h, 16, 'rgba(0,0,0,.35)', 0);
  rr(-w / 2, -h / 2, w, h, 16, o.bg || '#fff6d5', 6);
  if (o.tape) { ctx.save(); ctx.rotate(.05); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(-60, -h / 2 - 16, 120, 30); ctx.restore(); }
  lines.forEach((l, i) => txt(l, 0, -h / 2 + 17 + size * .62 + i * size * 1.18, { size, fill: o.fg || INK, sw: 0, maxW: w - 40 }));
  ctx.restore();
}
function stamp(s, x, y, t, t0, o = {}) {
  if (t < t0) return; const k = prog(t, t0, t0 + .16); const sc = lerp(2.4, 1, eOut(k));
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot == null ? -.12 : o.rot); ctx.scale(sc, sc); ctx.globalAlpha = k;
  const size = o.size || 74; const w = measure(s, size, 900) + 50, h = size * 1.35; const col = o.col || '#e5383b';
  ctx.fillStyle = o.bg || 'rgba(255,255,255,.18)'; ctx.fillRect(-w / 2, -h / 2, w, h);
  rr(-w / 2, -h / 2, w, h, 12, null, 9, col); txt(s, 0, 4, { size, fill: col, sw: 0 });
  ctx.restore();
}
function levelCard(s, t, t0, d = .95) {
  if (t < t0 || t > t0 + d) return;
  const k = prog(t, t0, t0 + .14), out = prog(t, t0 + d - .14, t0 + d);
  const x = lerp(-W, 0, eOut(k)) + lerp(0, W, eIn(out));
  ctx.save(); ctx.translate(x, 0);
  ctx.fillStyle = INK; ctx.fillRect(0, 700, W, 190);
  ctx.fillStyle = YEL; ctx.fillRect(0, 700, W, 12); ctx.fillRect(0, 878, W, 12);
  const blink = Math.floor((t - t0) * 8) % 2 === 0;
  txt(s, W / 2, 796, { size: 70, font: MONO, weight: 700, fill: blink ? YEL : '#fff', stroke: '#000', sw: 10, maxW: 980 });
  ctx.restore();
}

/* ---------------- props ---------------- */
function chipShape(x, y, w, h, col = '#2fbf71', label, rot = 0, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  const pins = Math.max(3, Math.round(w / 26));
  for (let i = 0; i < pins; i++) { const px = -w / 2 + (i + .5) * w / pins;
    seg(px, -h / 2 - 12, px, -h / 2, 5, '#c9a227'); seg(px, h / 2, px, h / 2 + 12, 5, '#c9a227'); }
  rr(-w / 2, -h / 2, w, h, 9, col, 6);
  if (!o.noDie) rr(-w * .24, -h * .26, w * .48, h * .52, 5, o.die || 'rgba(0,0,0,.22)', 4);
  if (label) txt(label, 0, o.labelDy || 0, { size: o.size || Math.min(h * .34, w * .16), fill: '#fff', sw: 7, maxW: w * .9 });
  ctx.restore();
}
function greenEye(x, y, r, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  const pts = []; for (let i = 0; i <= 30; i++) { const a = i / 30 * Math.PI; pts.push([Math.cos(a) * r * 1.35, -Math.sin(a) * r * .8]); }
  for (let i = 0; i <= 30; i++) { const a = i / 30 * Math.PI; pts.push([-Math.cos(a) * r * 1.35, Math.sin(a) * r * .8]); }
  poly(pts, '#5fd068', 7);
  circ(0, 0, r * .5, '#fff', 6); circ(r * .08, 0, r * .26, '#1b4d2b', 0); circ(r * .16, -r * .1, r * .08, '#fff', 0);
  ctx.restore();
}
function coin(x, y, r, rot) {
  ctx.save(); ctx.translate(x, y); ctx.scale(Math.abs(Math.cos(rot)) * .8 + .2, 1);
  circ(0, 0, r, '#ffc300', 5); txt('$', 0, 2, { size: r * 1.1, fill: '#b07d00', sw: 0 }); ctx.restore();
}
function cloud(x, y, s, col = '#fff', lw = 6) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ell(0, 0, 90, 46, col, lw); ell(-60, 10, 55, 36, col, lw); ell(60, 12, 58, 34, col, lw); ell(0, 22, 100, 30, col, 0);
  ctx.restore();
}
function plane(x, y, s, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  poly([[-30, -10], [40, -60], [70, -60], [30, -8]], '#d9e2ec', 6);
  ell(0, 0, 150, 32, '#fff', 7);
  poly([[-135, -8], [-170, -70], [-140, -70], [-105, -12]], '#e63946', 6);
  ctx.fillStyle = '#e63946'; ctx.fillRect(-120, 8, 230, 9);
  for (let i = 0; i < 6; i++) circ(-70 + i * 30, -8, 7, '#8ecae6', 3);
  poly([[-30, 10], [40, 70], [70, 70], [30, 12]], '#d9e2ec', 6);
  ctx.restore();
}
function gpuCard(x, y, w, t, label = 'GPU', rot = 0, col = '#2b2d42') {
  const h = w * .42;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  rr(-w / 2, -h / 2, w, h, 12, col, 7);
  ctx.fillStyle = '#76b900'; ctx.fillRect(-w / 2 + 10, h / 2 - 16, w - 20, 8);
  for (const fx of [-w * .24, w * .24]) {
    circ(fx, -4, h * .33, '#111', 5);
    ctx.save(); ctx.translate(fx, -4); ctx.rotate(t * 14);
    for (let b = 0; b < 5; b++) { ctx.rotate(Math.PI * 2 / 5); ell(h * .15, 0, h * .14, h * .05, '#555', 0); }
    ctx.restore(); circ(fx, -4, h * .07, '#888', 3);
  }
  for (let i = 0; i < 8; i++) { const px = -w * .3 + i * w * .06; seg(px, h / 2, px, h / 2 + 12, 5, '#c9a227'); }
  if (label) txt(label, 0, -h / 2 - 30, { size: Math.max(26, w * .1), fill: '#fff', sw: 8 });
  ctx.restore();
}
function brain(x, y, r, t) {
  ctx.save(); ctx.translate(x, y); const p = 1 + Math.sin(t * 6) * .03; ctx.scale(p, p);
  const pts = []; for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2; const rr2 = r * (1 + .08 * Math.sin(a * 7)); pts.push([Math.cos(a) * rr2 * 1.2, Math.sin(a) * rr2 * .85]); }
  poly(pts, '#ff8fab', 7);
  ctx.beginPath(); ctx.moveTo(0, -r * .8); ctx.bezierCurveTo(r * .2, -r * .3, -r * .2, r * .2, 0, r * .8); stroke(5, '#c9184a');
  for (let i = 0; i < 6; i++) { const a = i * 1.1; ctx.beginPath(); ctx.arc(Math.cos(a) * r * .55, Math.sin(a) * r * .4, r * .22, a, a + 2.2); stroke(4, '#c9184a'); }
  ctx.restore();
}
function robot(x, y, s, label, col, t, run = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const ph = t * 16; const lg = run ? Math.sin(ph) * 22 : 0;
  seg(-22, -60, -22 - lg, 0, 12); seg(22, -60, 22 + lg, 0, 12);
  rr(-60, -190, 120, 130, 18, col, 7);
  rr(-45, -270, 90, 72, 14, col, 7); rr(-34, -250, 68, 26, 10, '#111', 0);
  circ(-14, -237, 6, '#7cf', 0); circ(14, -237, 6, '#7cf', 0);
  seg(0, -270, 0, -300, 5); circ(0, -305, 9, '#ff595e', 5);
  seg(-60, -170, -92, -120 + (run ? Math.sin(ph + 3) * 20 : 0), 11); seg(60, -170, 92, -120 + (run ? Math.sin(ph) * 20 : 0), 11);
  if (label) txt(label, 0, -125, { size: 26, fill: '#fff', sw: 6, maxW: 110 });
  ctx.restore();
}
function toilet(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  rr(-40, -190, 80, 70, 10, '#f8f9fa', 6); ell(0, -95, 70, 22, '#f8f9fa', 6);
  poly([[-60, -95], [60, -95], [36, -30], [-36, -30]], '#f8f9fa', 6); rr(-30, -32, 60, 32, 6, '#f8f9fa', 6);
  ctx.restore();
}
function bubbleTxt(x, y, s, label, col = '#fff') {
  const w = measure(label, 34, 800) + 50;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  rr(-w / 2, -36, w, 72, 30, col, 6); poly([[-14, 34], [6, 34], [-22, 62]], col, 6);
  ctx.fillStyle = col; ctx.fillRect(-16, 26, 24, 12);
  txt(label, 0, 2, { size: 34, weight: 800, fill: INK, sw: 0 }); ctx.restore();
}
function lightning(x1, y1, x2, y2, seed) {
  const pts = [[x1, y1]]; const n = 7;
  for (let i = 1; i < n; i++) { const k = i / n; pts.push([lerp(x1, x2, k) + (hash(seed + i) - .5) * 120, lerp(y1, y2, k)]); }
  pts.push([x2, y2]);
  ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
  stroke(26, INK); stroke(14, '#fff36b');
}
function confetti(t, t0, n, area, seed = 1) {
  if (t < t0) return; const d = t - t0;
  const cols = ['#ffd60a', '#ff595e', '#8ac926', '#1982c4', '#ff9f1c', '#fff'];
  for (let i = 0; i < n; i++) {
    const x = area[0] + hash(i * 3.1 + seed) * area[2] + Math.sin(d * 2 + i) * 30;
    const y = area[1] + ((hash(i * 7.7 + seed) * area[3] + d * (180 + hash(i) * 220)) % area[3]);
    ctx.save(); ctx.translate(x, y); ctx.rotate(d * 4 + i); ctx.fillStyle = cols[i % cols.length];
    ctx.fillRect(-9, -5, 18, 10); ctx.restore();
  }
}
function coinRain(t, t0, dur, n, seed = 2) {
  if (t < t0 || t > t0 + dur + 1.5) return;
  for (let i = 0; i < n; i++) {
    const st = t0 + hash(i + seed) * dur; if (t < st) continue; const d = t - st;
    const x = 120 + hash(i * 5.3 + seed) * 840; const y = -60 + d * 900 + d * d * 300;
    if (y > 1350) continue; coin(x, y, 30, d * 9 + i);
  }
}
function speedLines(alpha = .5, seed = 0) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = '#fff';
  for (let i = 0; i < 26; i++) { const y = hash(i + seed * 3 + BOIL) * H; ctx.lineWidth = 3 + hash(i * 2) * 8;
    ctx.beginPath(); ctx.moveTo(-50, y); ctx.lineTo(W + 50, y); ctx.stroke(); }
  ctx.restore();
}
function burst(x, y, r, col = '#fff36b', n = 12, t = 0) {
  const pts = []; for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2 + t; const rr2 = i % 2 ? r * .55 : r; pts.push([x + Math.cos(a) * rr2, y + Math.sin(a) * rr2]); }
  poly(pts, col, 7);
}
function rays(cx, cy, col1, col2, t, n = 16) {
  bg(col1); ctx.fillStyle = col2;
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + t * .15;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 2500, cy + Math.sin(a) * 2500);
    ctx.lineTo(cx + Math.cos(a + Math.PI / n) * 2500, cy + Math.sin(a + Math.PI / n) * 2500); ctx.fill(); }
}
function lineChart(x, y, w, h, k, col = '#fff', data) {
  rr(x, y, w, h, 14, 'rgba(0,0,0,.25)', 6);
  const pts = data || [0, .05, .03, .1, .2, .35, .6, 1];
  const n = Math.max(2, Math.ceil(k * (pts.length - 1)) + 1);
  ctx.beginPath();
  for (let i = 0; i < n; i++) { const kk = Math.min(i, k * (pts.length - 1)); const i0 = Math.floor(kk), f = kk - i0;
    const v = lerp(pts[i0], pts[Math.min(i0 + 1, pts.length - 1)], f);
    const px = x + 30 + kk / (pts.length - 1) * (w - 60), py = y + h - 30 - v * (h - 60); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  stroke(18, INK); stroke(9, col);
}

/* ---------------- stick-figure rig ---------------- */
const POSE = {
  idle: t => ({ lean: 0, aL: [.22 + .03 * Math.sin(t * 2), .1], aR: [.22 + .03 * Math.sin(t * 2 + 1), .1], lL: [.1, 0], lR: [.1, 0], bounce: 2 * Math.sin(t * 4) }),
  walk: (t, sp = 1.8) => { const p = t * sp * Math.PI * 2;
    return { lean: .04, aL: [.2 - .45 * Math.sin(p), .25], aR: [.2 + .45 * Math.sin(p), .25], lL: [.06 + .42 * Math.sin(p), -.35 * Math.max(0, Math.cos(p))], lR: [.06 - .42 * Math.sin(p), -.35 * Math.max(0, -Math.cos(p))], bounce: 9 * Math.abs(Math.sin(p)) }; },
  run: t => { const r = POSE.walk(t, 3.2); r.lean = .18; r.aL[0] *= 1.6; r.aR[0] *= 1.6; return r; },
  cheer: t => ({ lean: 0, aL: [2.7 + .15 * Math.sin(t * 12), .25], aR: [2.7 + .15 * Math.sin(t * 12 + 1.5), .25], lL: [.25, 0], lR: [.25, 0], bounce: 10 * Math.abs(Math.sin(t * 6)) }),
  flex: t => ({ lean: 0, aL: [1.55, -2.3 + .15 * Math.sin(t * 9)], aR: [1.55, -2.3 + .15 * Math.sin(t * 9 + 2)], lL: [.3, 0], lR: [.3, 0], bounce: 3 * Math.abs(Math.sin(t * 5)) }),
  cross: t => ({ lean: 0, aL: [.55, -1.95], aR: [.55, -1.95], lL: [.22, 0], lR: [.22, 0], bounce: 1.5 * Math.sin(t * 3), crossed: true }),
  shrug: t => ({ lean: 0, aL: [.95, -2.0 + .1 * Math.sin(t * 8)], aR: [.95, -2.0 + .1 * Math.sin(t * 8)], lL: [.12, 0], lR: [.12, 0], bounce: 4 * Math.abs(Math.sin(t * 4)) }),
  panic: t => ({ lean: .05 * Math.sin(t * 20), aL: [2.4 + .5 * Math.sin(t * 15), .6 * Math.sin(t * 17)], aR: [2.4 + .5 * Math.sin(t * 15 + 2), .6 * Math.sin(t * 13)], lL: [.25 + .15 * Math.sin(t * 20), 0], lR: [.25 + .15 * Math.sin(t * 20 + 3), 0], bounce: 6 * Math.abs(Math.sin(t * 20)) }),
  wave: t => ({ lean: 0, aL: [.2, .1], aR: [2.5, .35 + .45 * Math.sin(t * 11)], lL: [.12, 0], lR: [.12, 0], bounce: 0 }),
  point: t => ({ lean: .05, aL: [.25, .1], aR: [1.55, 0], lL: [.18, 0], lR: [.18, 0], bounce: 0 }),
  punch: k => ({ lean: .25 * k, aL: [.6, -1.6], aR: [lerp(.6, 1.6, k), lerp(-1.6, 0, k)], lL: [.35, 0], lR: [.15 + .2 * k, 0], bounce: 0 }),
  brace: t => ({ lean: -.05, aL: [1.05, -2.1], aR: [1.05, -2.1], lL: [.42, -.12], lR: [.42, -.12], bounce: 2 * Math.sin(t * 30) }),
  mop: t => ({ lean: .18, aL: [.55 + .25 * Math.sin(t * 9), -.5], aR: [.25 + .25 * Math.sin(t * 9), -.2], lL: [.2, 0], lR: [.2, 0], bounce: 3 * Math.abs(Math.sin(t * 9)) }),
  bow: k => ({ lean: .85 * k, aL: [.1, 0], aR: [.1, 0], lL: [.08, 0], lR: [.08, 0], bounce: 0 }),
  slump: t => ({ lean: .1, aL: [.08, 0], aR: [.08, 0], lL: [.08, 0], lR: [.08, 0], bounce: 0, droop: 1 }),
  hold: t => ({ lean: 0, aL: [1.3, -.9], aR: [1.3, -.9], lL: [.15, 0], lR: [.15, 0], bounce: 2 * Math.sin(t * 4) }),
  paddle: t => ({ lean: .05, aL: [.4, .1], aR: [1.2 + .5 * Math.sin(t * 11), -.6], lL: [.3, 0], lR: [.3, 0], bounce: 5 * Math.abs(Math.sin(t * 5.5)) }),
  toss: k => ({ lean: 0, aL: [lerp(.3, 2.8, k), .1], aR: [lerp(.3, 2.8, k), .1], lL: [.2, 0], lR: [.2, 0], bounce: 18 * Math.sin(k * Math.PI) }),
  shoulder: t => ({ lean: .03, aL: [2.75, -2.6], aR: [.2, .25], lL: [.1, 0], lR: [.1, 0], bounce: 0 }),
};
function walkShoulder(t) { const w = POSE.walk(t, 1.4); w.aL = [2.75, -2.6]; return w; }

/* bobble spring: sum of damped impulse responses (pure function of t) */
const BOBBLE = { stiffness: 2.3, damping: .16, maxAngle: .42, impulseScale: 1 };
function springSum(t, evs) {
  const w = 2 * Math.PI * BOBBLE.stiffness, z = BOBBLE.damping, wd = w * Math.sqrt(1 - z * z); let a = 0;
  for (const [te, amp] of evs) { const d = t - te; if (d < 0 || d > 5) continue; a += amp * BOBBLE.impulseScale * Math.exp(-z * w * d) * Math.sin(wd * d); }
  return a;
}
const HL = TL.words.filter(w => w.hi).map(w => w.t0);
function bobble(t, extra = [], walkAmt = 0, walkSp = 1.8, quiet = 1) {
  const evs = []; let sgn = 1;
  for (const h of HL) { if (h < t && t - h < 5) { evs.push([h, .16 * sgn * quiet]); } sgn = -sgn; }
  for (const e of extra) evs.push(e);
  let a = springSum(t, evs) + walkAmt * Math.sin(t * walkSp * Math.PI * 2 + .6) * .5;
  a = Math.max(-BOBBLE.maxAngle, Math.min(BOBBLE.maxAngle, a));
  const dy = -Math.abs(springSum(t + .07, evs)) * 26 - walkAmt * Math.abs(Math.sin(t * walkSp * Math.PI * 2)) * 10;
  return { a, dy };
}

const OUTFIT = {
  leather: '#1c1c1f', suit: '#2b4170', eng: '#a8dadc', kid: '#fdfdfd', teen: '#e63946', gown: '#14213d', tee: '#2a2a2d',
};
function figure(o) {
  const s = o.s || 1, P = o.pose || POSE.idle(0);
  const x = o.x, y = o.y - (P.bounce || 0) * s;
  const legU = 62 * s, legL = 60 * s, torso = 128 * s, armU = 56 * s, armL = 52 * s;
  const hip = [x, y - (legU + legL) * .97];
  const L = P.lean * (o.face || 1);
  const ax = Math.sin(L), ay = -Math.cos(L);
  const neck = [hip[0] + ax * torso, hip[1] + ay * torso];
  const sh = [hip[0] + ax * (torso - 14 * s), hip[1] + ay * (torso - 14 * s)];
  const px = -ay, py = ax; // perpendicular (to the right)
  const lw = 11 * s;
  const kind = o.outfit || 'plain', col = o.color || OUTFIT[kind] || '#4361ee';
  const limb = (base, ang1, ang2, l1, l2, side) => {
    const v1 = [side * Math.sin(ang1 + side * L * 0), Math.cos(ang1)];
    const e = [base[0] + side * Math.sin(ang1) * l1, base[1] + Math.cos(ang1) * l1];
    const a2 = ang1 + ang2;
    const h = [e[0] + side * Math.sin(a2) * l2, e[1] + Math.cos(a2) * l2];
    return [e, h];
  };
  // backpack (behind)
  if (kind === 'kid') rr(neck[0] - 46 * s, neck[1] + 20 * s, 92 * s, 96 * s, 16 * s, '#e63946', 6 * s);
  // legs
  const hipL = [hip[0] - 9 * s, hip[1]], hipR = [hip[0] + 9 * s, hip[1]];
  const [kL, fL] = limb(hipL, P.lL[0], P.lL[1], legU, legL, -1), [kR, fR] = limb(hipR, P.lR[0], P.lR[1], legU, legL, 1);
  for (const [hp, k, f] of [[hipL, kL, fL], [hipR, kR, fR]]) { seg(hp[0], hp[1], k[0], k[1], lw); seg(k[0], k[1], f[0], f[1], lw); }
  ell(fL[0] - 9 * s, fL[1] + 2 * s, 17 * s, 9 * s, INK, 0); ell(fR[0] + 9 * s, fR[1] + 2 * s, 17 * s, 9 * s, INK, 0);
  // torso shape
  const wTop = 30 * s, wBot = 22 * s, ext = kind === 'gown' ? 70 * s : 6 * s;
  const tb = [hip[0] - ax * ext, hip[1] - ay * ext];
  const tq = [[sh[0] - px * wTop, sh[1] - py * wTop + 0], [sh[0] + px * wTop, sh[1] + py * wTop], [tb[0] + px * wBot * (kind === 'gown' ? 1.8 : 1), tb[1] + py * wBot], [tb[0] - px * wBot * (kind === 'gown' ? 1.8 : 1), tb[1] - py * wBot]];
  // slightly above shoulders to cover neck base
  const top2 = [neck[0] - ax * 4, neck[1] - ay * 4];
  poly([tq[0], [top2[0] - px * 12 * s, top2[1] - py * 12 * s], [top2[0] + px * 12 * s, top2[1] + py * 12 * s], tq[1], tq[2], tq[3]], col, 6 * s);
  // outfit details
  if (kind === 'leather') {
    seg(neck[0], neck[1] + 6 * s, tb[0], tb[1] - 6 * s, 3 * s, '#5c5c63');
    seg(neck[0] - px * 12 * s, neck[1] + 4 * s, neck[0] - px * 2 * s + ax * 50 * s, neck[1] + 46 * s, 4 * s, '#55555c');
    seg(neck[0] + px * 12 * s, neck[1] + 4 * s, neck[0] + px * 2 * s + ax * 50 * s, neck[1] + 46 * s, 4 * s, '#55555c');
    seg(sh[0] - px * 24 * s, sh[1] + 10 * s, sh[0] - px * 10 * s, sh[1] + 40 * s, 3 * s, '#3d3d44');
  } else if (kind === 'suit') {
    poly([[neck[0] - 12 * s, neck[1] + 4 * s], [neck[0] + 12 * s, neck[1] + 4 * s], [neck[0] + ax * 46 * s, neck[1] + 46 * s]], '#fff', 3 * s);
    poly([[neck[0] - 4 * s, neck[1] + 10 * s], [neck[0] + 4 * s, neck[1] + 10 * s], [neck[0] + 6 * s + ax * 50, neck[1] + 52 * s], [neck[0] - 6 * s + ax * 50, neck[1] + 52 * s]], '#e63946', 2 * s);
  } else if (kind === 'eng') {
    rr(neck[0] + 6 * s, neck[1] + 40 * s, 22 * s, 28 * s, 3 * s, '#fff', 3 * s); ctx.fillStyle = '#2fbf71'; ctx.fillRect(neck[0] + 9 * s, neck[1] + 44 * s, 16 * s, 5 * s);
    rr(neck[0] - 26 * s, neck[1] + 34 * s, 18 * s, 16 * s, 2 * s, '#4361ee', 3 * s);
  } else if (kind === 'kid') {
    seg(neck[0] - 18 * s, neck[1] + 8 * s, neck[0] - 20 * s, neck[1] + 70 * s, 7 * s, '#e63946'); seg(neck[0] + 18 * s, neck[1] + 8 * s, neck[0] + 20 * s, neck[1] + 70 * s, 7 * s, '#e63946');
  }
  // arms
  const sleeve = { leather: OUTFIT.leather, suit: OUTFIT.suit, eng: '#a8dadc', kid: '#fdfdfd', teen: '#e63946', gown: OUTFIT.gown }[kind] || (o.sleeve || null);
  const shL = [sh[0] - px * 24 * s, sh[1] - py * 24 * s], shR = [sh[0] + px * 24 * s, sh[1] + py * 24 * s];
  const [eL, hL] = limb(shL, P.aL[0], P.aL[1], armU, armL, -1), [eR, hR] = limb(shR, P.aR[0], P.aR[1], armU, armL, 1);
  for (const [b, e, h] of [[shL, eL, hL], [shR, eR, hR]]) {
    seg(b[0], b[1], e[0], e[1], lw * 1.25); seg(e[0], e[1], h[0], h[1], lw);
    if (sleeve) { seg(b[0], b[1], e[0], e[1], lw * .55, sleeve); if (kind === 'leather' || kind === 'suit' || kind === 'gown') seg(e[0], e[1], lerp(e[0], h[0], .7), lerp(e[1], h[1], .7), lw * .45, sleeve); }
    circ(h[0], h[1], 8 * s, o.skin || '#f1c27d', 4 * s);
  }
  if (o.prop) o.prop(hL, hR, neck, s);
  // head
  const bob = o.bob || { a: 0, dy: 0 };
  const droop = P.droop ? .18 : 0;
  if (o.jensen) {
    const hs = (o.headScale || 1) * s, Hh = 182 * hs, Wh = Hh * 522 / 673;
    ctx.save(); ctx.translate(neck[0], neck[1] + 4 * s); ctx.rotate(bob.a + L * .4 + droop);
    seg(0, 0, 0, -16 * s, lw);
    if (HEAD.complete && HEAD.naturalWidth) ctx.drawImage(HEAD, -Wh / 2, -Hh + 22 * hs + bob.dy * hs, Wh, Hh);
    else { circ(0, -Hh / 2 + bob.dy, Hh / 2.2, '#f1c27d'); txt('JH', 0, -Hh / 2 + bob.dy, { size: 50 * hs, fill: INK, sw: 0 }); }
    ctx.restore();
  } else {
    const r = (o.headR || 38) * s;
    ctx.save(); ctx.translate(neck[0], neck[1]); ctx.rotate(bob.a + L * .4 + droop);
    seg(0, 0, 0, -10 * s, lw);
    const cy = -r - 6 * s + bob.dy;
    if (o.hair === 'long') ell(0, cy + r * .25, r * 1.15, r * 1.2, o.hairCol || '#5a3825', 5 * s);
    circ(0, cy, r, o.headCol || o.skin || '#f1c27d', 6 * s);
    if (o.hair === 'short' || o.hair === 'long') { ctx.beginPath(); ctx.arc(0, cy, r, Math.PI * 1.05, Math.PI * 1.95); ctx.lineTo(0, cy - r * .55); ctx.closePath(); ctx.fillStyle = o.hairCol || '#3b2a1a'; ctx.fill(); stroke(5 * s); }
    if (o.hair === 'gray') { ctx.beginPath(); ctx.arc(0, cy, r, Math.PI * 1.1, Math.PI * 1.9); ctx.closePath(); ctx.fillStyle = '#d6d6d6'; ctx.fill(); stroke(5 * s); }
    if (o.eyes === 'heart') { for (const ex of [-r * .35, r * .35]) txt('♥', ex, cy - r * .05, { size: r * .7, fill: '#ff2d6f', sw: 4 * s }); }
    else if (o.eyes === 'x') { for (const ex of [-r * .35, r * .35]) { seg(ex - 7 * s, cy - 9 * s, ex + 7 * s, cy + 5 * s, 4 * s); seg(ex + 7 * s, cy - 9 * s, ex - 7 * s, cy + 5 * s, 4 * s); } }
    else { for (const ex of [-r * .33, r * .33]) circ(ex, cy - r * .05, 4.5 * s, INK, 0); }
    if (o.glasses) { circ(-r * .33, cy - r * .05, 11 * s, null, 3 * s); circ(r * .33, cy - r * .05, 11 * s, null, 3 * s); seg(-r * .15, cy - r * .05, r * .15, cy - r * .05, 3 * s); }
    const m = o.mouth || 'smile';
    ctx.beginPath();
    if (m === 'smile') ctx.arc(0, cy + r * .25, r * .28, .2, Math.PI - .2);
    else if (m === 'sad') ctx.arc(0, cy + r * .6, r * .25, Math.PI + .3, -.3);
    else if (m === 'o') ctx.arc(0, cy + r * .4, r * .14, 0, Math.PI * 2);
    else { ctx.moveTo(-r * .22, cy + r * .45); ctx.lineTo(r * .22, cy + r * .45); }
    stroke(4 * s);
    if (o.crown) poly([[-r * .7, cy - r * .8], [-r * .7, cy - r * 1.5], [-r * .35, cy - r * 1.1], [0, cy - r * 1.65], [r * .35, cy - r * 1.1], [r * .7, cy - r * 1.5], [r * .7, cy - r * .8]], '#ffd60a', 5 * s);
    if (o.sweat) { ell(r * .9, cy - r * .3, 6 * s, 10 * s, '#8ecae6', 3 * s); }
    ctx.restore();
  }
  if (o.label) {
    const topY = o.jensen ? neck[1] - 182 * (o.headScale || 1) * s - 10 : neck[1] - (o.headR || 38) * 2 * s - 34 * s;
    const ls = o.labelSize || 26; const lw2 = measure(o.label, ls, 800) + 26;
    rr(neck[0] - lw2 / 2, topY - ls * .8 - 14, lw2, ls * 1.5, 10, o.labelBg || '#fff', 4);
    txt(o.label, neck[0], topY - ls * .05 - 14, { size: ls, weight: 800, fill: INK, sw: 0 });
  }
  return { neck, hL, hR, hip };
}
const jensen = (o) => figure(Object.assign({ jensen: true, skin: '#e8b98a' }, o));

/* ---------------- camera: punches + shake ---------------- */
const SHAKE = { hit: 18, slam: 26, crash: 34, thunder: 40, ko: 22, boom: 14, stamp: 9, rumble: 12, buzzer: 8 };
function shake(t) {
  let sx = 0, sy = 0;
  for (const e of TL.sfx) { const a = SHAKE[e.k]; if (!a) continue; const d = t - e.t; if (d < 0 || d > 1.2) continue;
    const dec = e.k === 'rumble' ? Math.exp(-2.2 * d) : Math.exp(-7 * d);
    sx += a * e.g * dec * (hash(Math.floor(t * 30) + e.t) - .5) * 2; sy += a * e.g * dec * (hash(Math.floor(t * 30) * 1.3 + e.t + 9) - .5) * 2; }
  return [sx, sy];
}
function punch(t) {
  let z = 0; const calm = t > TL.scenes[11].t0;
  for (const h of HL) { const d = t - h; if (d >= 0 && d < .6) z += (calm ? .008 : .028) * Math.exp(-d * 9); }
  return z;
}

/* ---------------- HUD ---------------- */
function rivalsCount(t) {
  if (t < TL.scenes[1].t0) return 4;
  let n = 0; if (t > A.cb_bought + .1) n = 1; if (t > A.gi_ati + .45) n = 2; if (t > A.gi_cancelled + .35) n = 3; if (t > A.pk_stop + .1) n = 4; return n;
}
function hp(t) {
  const S = TL.scenes;
  if (t < S[5].t0) return 1;
  if (t < S[6].t0) return lerp(1, .12, eOut(prog(t, A.br_half, A.br_every)));
  if (t < A.cb_hit) return .12;
  if (t < S[7].t0) return lerp(.12, 1, eOut(prog(t, A.cb_hit, A.cb_hit + 1.2)));
  if (t < S[8].t0) return t > A.gi_ati && t < A.gi_intel ? lerp(.68, 1, prog(t, A.gi_ati + .3, A.gi_intel)) : 1;
  if (t < S[10].t0) return 1;
  if (t < S[11].t0) return t > A.pk_deepseek && t < A.pk_stop + .6 ? lerp(.55, 1, eIO(prog(t, A.pk_deepseek + .2, A.pk_stop + .6))) : 1;
  if (t < S[12].t0) return lerp(1, 0, prog(t, A.sc_couldnt, S[12].t0));
  return 0;
}
let lastCount = 0;
function hud(t, sid) {
  if (sid === 'exit' && t < TL.T_END - 1.0) return;
  const glitch = sid === 'scandal';
  ctx.save();
  if (glitch && hash(Math.floor(t * 12)) < .25) ctx.translate((hash(t) - .5) * 30, 0);
  ctx.globalAlpha = glitch ? (.55 + .45 * hash(Math.floor(t * 9))) : 1;
  const y = 172;
  // left: P1 + HP bar
  rr(48, y, 430, 92, 16, 'rgba(10,10,14,.78)', 5);
  txt(sid === 'origin' ? 'LEVEL 0: TUTORIAL' : 'P1 · JENSEN', 70, y + 26, { size: 26, font: MONO, weight: 700, align: 'left', fill: '#fff', sw: 0 });
  const v = hp(t), low = v < .3 && Math.floor(t * 6) % 2 === 0;
  rr(68, y + 46, 390, 30, 8, '#333', 4);
  if (v > .01) rr(70, y + 48, 386 * v, 26, 7, low ? '#ff3b3b' : (v < .5 ? '#ffb703' : '#5ee05e'), 0);
  // right: rivals defeated
  rr(W - 48 - 420, y, 420, 92, 16, 'rgba(10,10,14,.78)', 5);
  txt('RIVALS DEFEATED', W - 48 - 400, y + 46, { size: 30, font: MONO, weight: 700, align: 'left', fill: '#fff', sw: 0 });
  const n = rivalsCount(t);
  const changeT = [A.cb_bought + .1, A.gi_ati + .45, A.gi_cancelled + .35, A.pk_stop + .1].find(c => t >= c && t - c < .5);
  const k = changeT ? 1 + .6 * (1 - eOut(prog(t, changeT, changeT + .5))) : 1;
  txt(glitch && hash(Math.floor(t * 10)) < .3 ? '?' : String(n), W - 48 - 50, y + 48, { size: 64 * k, font: MONO, weight: 700, fill: YEL, sw: 8 });
  ctx.restore();
}
function bossBar(name, v, col, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha;
  const y = 284; rr(W - 48 - 420, y, 420, 74, 14, 'rgba(10,10,14,.78)', 5);
  txt('BOSS: ' + name, W - 48 - 400, y + 22, { size: 22, font: MONO, weight: 700, align: 'left', fill: '#fff', sw: 0, maxW: 380 });
  rr(W - 48 - 400, y + 40, 380, 22, 6, '#333', 3);
  if (v > .01) rr(W - 48 - 399, y + 41, 378 * v, 20, 5, col, 0);
  ctx.restore();
}

/* ---------------- captions ---------------- */
function captions(t, sid) {
  const c = TL.cap.find(c => t >= c.t0 && t < c.t1); if (!c) return;
  const ws = c.w.map(i => TL.words[i]);
  const size0 = 88; const parts = ws.map(w => w.text.toUpperCase());
  const gap = 26; let widths = parts.map(p => measure(p, size0, 900)); let total = widths.reduce((a, b) => a + b, 0) + gap * (parts.length - 1);
  const sc = Math.min(1, 940 / total); const size = size0 * sc; widths = widths.map(w => w * sc); total *= sc;
  let x = W / 2 - total / 2; const y = 1440;
  ws.forEach((w, i) => {
    const vis = t >= w.t0 - .05; const cx = x + widths[i] / 2;
    if (vis) { const k = prog(t, w.t0 - .05, w.t0 + .07); const s2 = lerp(1.35, 1, eOut(k));
      txt(parts[i], cx, y, { size, scale: s2, fill: w.hi ? YEL : '#fff', sw: size * .2, alpha: clamp(k * 3) }); }
    x += widths[i] + gap * sc;
  });
}

/* ================= SCENES ================= */
const SC = {};
const sceneOf = id => TL.scenes.find(s => s.id === id);

/* ---- chip mountain (hook / peak / exit) ---- */
function chipMountain(cx, baseY, rows = 9, cw = 104, rh = 58, rise = 1, glowOn = true) {
  if (glowOn) glow(cx, baseY - rows * rh * .55, 560, 'rgba(70,255,150,A)', .32);
  for (let r = 0; r < rows; r++) {
    const n = rows - r; const yy = baseY - r * rh;
    for (let i = 0; i < n; i++) {
      const xx = cx + (i - (n - 1) / 2) * (cw * .98) + (hash(r * 13 + i) - .5) * 14;
      const k = clamp(rise * rows - r); if (k <= 0) continue;
      const shade = ['#2fbf71', '#27a862', '#36d47f', '#1f9a58'][(r + i) % 4];
      chipShape(xx, yy + (1 - eOut(k)) * 200, cw * .92, rh * .86, shade, null, (hash(r * 7 + i * 3) - .5) * .16, { die: 'rgba(0,40,20,.35)' });
    }
  }
}
function hookWorld(t, withJ, lt) {
  vgrad('#141834', '#2b2f63');
  for (let i = 0; i < 60; i++) { const x = hash(i * 1.7) * W, y = hash(i * 9.1) * 1100; const tw = .5 + .5 * Math.sin(t * 3 + i);
    ctx.fillStyle = `rgba(255,255,255,${.25 + .5 * tw})`; ctx.fillRect(x, y, 4, 4); }
  ctx.fillStyle = '#0f1226'; ctx.beginPath(); ctx.moveTo(-400, 1250); ctx.quadraticCurveTo(540, 1150, W + 400, 1250); ctx.lineTo(W + 400, H + 400); ctx.lineTo(-400, H + 400); ctx.fill();
  chipMountain(540, 1250, 8, 114, 58);
  // defeated tags at base
  const tags = [['3dfx', '#f4a261', 145, 1318, -.14], ['AMD+ATI', '#e63946', 400, 1330, .06], ['INTEL', '#0096c7', 670, 1330, -.06], ['DEEPSEEK', '#4361ee', 930, 1316, .12]];
  for (const [s, c, x, y, r] of tags) { ctx.save(); ctx.translate(x, y); ctx.rotate(r); rr(-112, -32, 224, 64, 12, c, 6); txt(s, -10, 2, { size: 36, fill: '#fff', sw: 7, maxW: 170 });
    circ(96, -28, 20, '#fff', 5); seg(88, -36, 104, -20, 5, '#d00000'); seg(104, -36, 88, -20, 5, '#d00000'); ctx.restore(); }
  if (withJ) {
    const pose = lt < 2.6 ? POSE.flex(t) : POSE.cross(t);
    jensen({ x: 540, y: 845, s: 1.0, outfit: 'leather', pose, bob: bobble(t, [[0, .3], [2.6, .25]]) });
  }
}
SC.hook = {
  world(t, lt) {
    const gone = t >= A.hook_gone;
    const z = gone ? 1.07 : lerp(1, 1.07, eIO(prog(t, 0, A.hook_gone)));
    ctx.save(); ctx.translate(W / 2, 900); ctx.scale(z, z); ctx.translate(-W / 2, -900);
    hookWorld(t, !gone, lt);
    if (gone) { const d = t - A.hook_gone; if (d < .45) { ctx.save(); ctx.globalAlpha = 1 - d / .45; for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; circ(540 + Math.cos(a) * (40 + d * 260), 640 + Math.sin(a) * (40 + d * 200), 30 * (1 - d), '#ddd', 4); } ctx.restore(); } }
    ctx.restore();
  },
  ui(t, lt) {
    stamp('NOV 12, 2026', 540, 1050, t, A.hook_nov, { rot: -.08, size: 84, bg: 'rgba(255,255,255,.92)' });
    if (t >= A.hook_gone) { ctx.save(); ctx.globalAlpha = .18; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  }
};

/* ---- origin ---- */
const MAIN = [[0, 200], [900, 150], [1250, 350], [1350, 600], [1300, 800], [1150, 1000], [1000, 1080], [900, 1150], [850, 1300], [790, 1500], [740, 1760], [680, 1720], [640, 1460], [570, 1310], [400, 1260], [200, 1300], [0, 1350]];
const THAI = [[600, 1180], [770, 1150], [840, 1260], [800, 1360], [740, 1420], [770, 1560], [735, 1720], [690, 1620], [660, 1430], [585, 1300]];
const TWN = [[1440, 820], [1478, 860], [1488, 960], [1448, 1025], [1410, 965], [1410, 880]];
function mapWorld(t, camX, camY, k) {
  bg('#5aa9e6');
  ctx.save(); ctx.translate(W / 2, 820); ctx.scale(k, k); ctx.translate(-camX, -camY);
  ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 3;
  for (let i = -10; i < 30; i++) { ctx.beginPath(); ctx.moveTo(i * 120, -200); ctx.lineTo(i * 120, 2400); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-200, i * 120); ctx.lineTo(2600, i * 120); ctx.stroke(); }
  poly(MAIN, '#f4e3b2', 8); poly(THAI, '#f7b267', 7); poly(TWN, '#f7b267', 7);
  txt('TAIWAN', 1560, 940, { size: 46, fill: '#fff', sw: 9, align: 'left' });
  txt('THAILAND', 560, 1210, { size: 44, fill: '#fff', sw: 9, align: 'right' });
  ctx.restore();
}
function mapPt(p, camX, camY, k) { return [W / 2 + (p[0] - camX) * k, 820 + (p[1] - camY) * k]; }
SC.origin = {
  world(t, lt) {
    const S = sceneOf('origin');
    const tB = A.or_sent - .1, tC = A.or_cleaned - .75;
    if (t < tB) {
      const k1 = eIO(prog(t, A.or_taiwan + .9, A.or_taiwan + 1.6));
      const camX = lerp(1450, 1050, k1), camY = lerp(930, 1150, k1), k = lerp(1.25, .62, k1);
      mapWorld(t, camX, camY, k);
      const tw = mapPt([1450, 920], camX, camY, k), th = mapPt([720, 1300], camX, camY, k);
      // dotted path Taiwan -> Thailand
      const kp = prog(t, A.or_taiwan + 1.0, A.or_taiwan + 1.6);
      if (kp > 0) { ctx.save(); ctx.setLineDash([14, 16]); ctx.beginPath(); ctx.moveTo(tw[0], tw[1]);
        const mx = (tw[0] + th[0]) / 2, my = Math.min(tw[1], th[1]) - 160; const N = 30;
        for (let i = 1; i <= N * kp; i++) { const u = i / N; ctx.lineTo((1 - u) * (1 - u) * tw[0] + 2 * (1 - u) * u * mx + u * u * th[0], (1 - u) * (1 - u) * tw[1] + 2 * (1 - u) * u * my + u * u * th[1]); }
        stroke(8, '#e63946'); ctx.restore(); }
      // baby bundle at Taiwan
      const pb = pop(t, A.or_taiwan - .1);
      if (pb > 0) { ctx.save(); ctx.translate(tw[0] - 20, tw[1] - 30); ctx.scale(pb, pb);
        const bb = bobble(t, [[A.or_taiwan, .35]]);
        ctx.save(); ctx.translate(0, -10); ctx.rotate(bb.a); if (HEAD.complete) ctx.drawImage(HEAD, -62, -170 + bb.dy, 124, 160); ctx.restore();
        ell(0, 40, 92, 62, '#8ecae6', 7); ell(-20, 30, 40, 18, '#bde0fe', 0); txt('BABY JENSEN', 0, 140, { size: 30, fill: '#fff', sw: 7 });
        ctx.restore(); }
      if (kp >= 1) { const pk = pop(t, A.or_taiwan + 1.6); ctx.save(); ctx.translate(th[0], th[1]); ctx.scale(pk, pk); circ(0, 0, 18, '#e63946', 5); ctx.restore(); }
    } else if (t < tC) {
      // B: flight then walking to school
      const tw2 = A.or_kentucky - .55;
      if (t < tw2) {
        vgrad('#8ecae6', '#cdeffd');
        for (let i = 0; i < 5; i++) cloud(((i * 300 - (t - tB) * 500) % 1500 + 1500) % 1500 - 200, 500 + i * 160, .8 + hash(i) * .5);
        const k = prog(t, tB, tw2);
        ctx.save(); ctx.setLineDash([16, 18]); ctx.beginPath(); ctx.moveTo(-50, 1100); ctx.quadraticCurveTo(540, 600, lerp(-50, 1150, k), lerp(1100, 800, k)); stroke(8, '#fff'); ctx.restore();
        plane(lerp(-200, 1250, eIO(k)), lerp(1050, 760, k), 1.2, -.18);
        card('TAIWAN → THAILAND → USA', 540, 1220, t, tB + .1, { size: 46, bg: '#fff' });
      } else {
        vgrad('#a0d8ef', '#e3f6fd', 0, 1100); ctx.fillStyle = '#8bc34a'; ctx.fillRect(-400, 1180, W + 800, 900);
        ctx.fillStyle = '#c2b280'; ctx.fillRect(-400, 1230, W + 800, 70);
        // school building
        rr(560, 660, 460, 520, 6, '#b5523b', 7); poly([[530, 670], [790, 470], [1050, 670]], '#7a2e22', 7);
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) rr(600 + c * 140, 720 + r * 130, 90, 90, 6, '#ffe8a3', 5);
        rr(745, 1070, 90, 110, 6, '#5c3a21', 6);
        rr(590, 540, 400, 70, 10, '#fff', 5); txt('BOARDING SCHOOL', 790, 576, { size: 34, fill: INK, sw: 0 });
        const lt2 = t - tw2; const wx = lerp(200, 430, prog(t, tw2, tw2 + 2.2));
        const prop = (hL, hR) => { rr(hR[0] - 6, hR[1] - 4, 60, 46, 6, '#6d4c41', 5); };
        figure({ x: wx - 190, y: 1275, s: 1.0, outfit: 'kid', color: '#fdfdfd', pose: POSE.walk(t, 1.8), hair: 'short', label: 'OLDER BROTHER', prop });
        jensen({ x: wx, y: 1275, s: 1.0, headScale: .8, outfit: 'kid', pose: POSE.walk(t + .2, 1.8), bob: bobble(t, [[tw2, .2]], .18, 1.8), label: 'JENSEN, 9', prop });
      }
    } else {
      // C: toilets
      bg('#bde0fe'); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 4;
      for (let x = -40; x < W + 80; x += 90) { ctx.beginPath(); ctx.moveTo(x, 300); ctx.lineTo(x, 1150); ctx.stroke(); }
      for (let y = 300; y < 1150; y += 90) { ctx.beginPath(); ctx.moveTo(-40, y); ctx.lineTo(W + 40, y); ctx.stroke(); }
      ctx.fillStyle = '#e9edf1'; ctx.fillRect(-400, 1150, W + 800, 900); seg(-50, 1150, W + 50, 1150, 7);
      for (const tx of [180, 900]) toilet(tx, 1160, 1.15);
      rr(700, 1060, 90, 100, 10, '#ffb703', 6); ell(745, 1060, 45, 12, '#8ecae6', 5);
      for (let i = 0; i < 9; i++) { const bx = 360 + hash(i) * 380, by = 1150 - ((t * 120 + hash(i * 3) * 300) % 300); circ(bx, by, 10 + hash(i * 5) * 14, 'rgba(255,255,255,.7)', 3); }
      const prop = (hL, hR) => { seg(hR[0], hR[1], hR[0] + 70 + 60 * Math.sin(t * 9), 1145, 9, '#8d6e63'); ell(hR[0] + 70 + 60 * Math.sin(t * 9), 1140, 50, 16, '#eee', 5); };
      const evs = []; for (let i = 0; i < 10; i++) evs.push([tC + i * .35, i % 2 ? .22 : -.22]);
      jensen({ x: 470, y: 1160, s: 1.1, headScale: .8, outfit: 'kid', pose: POSE.mop(t), bob: bobble(t, evs), prop });
    }
  },
  ui(t, lt) {
    const tB = A.or_sent - .1, tC = A.or_cleaned - .75;
    if (t < tB) { card('TAINAN, TAIWAN · 1963', 540, 400, t, A.or_taiwan - .05, { size: 46 }); card('→ THAILAND', 540, 500, t, A.or_taiwan + 1.6, { size: 42, bg: '#ffe0b3', rot: .02 }); }
    else if (t < tC) { if (t >= A.or_kentucky - .55) card('→ KENTUCKY, USA', 540, 400, t, A.or_kentucky - .05, { size: 46 }); }
    else { card('CHORE: TOILETS', 540, 400, t, tC + .1, { size: 46, bg: '#fff' }); }
  }
};

/* ---- grind ---- */
SC.grind = {
  world(t, lt) {
    const t1 = A.gr_hs - .2, t2 = A.gr_ee - .15, S = sceneOf('grind');
    if (t < t1) {
      bg('#2a9d8f');
      rr(140, 1010, 800, 40, 8, '#1b4332', 7); seg(540, 1010, 540, 1050, 5, '#fff'); seg(140, 1012, 940, 1012, 4, '#fff');
      seg(220, 1050, 200, 1200, 9); seg(860, 1050, 880, 1200, 9); rr(530, 900, 20, 110, 3, '#ddd', 4);
      const ph = ((t - S.t0) / .27); const i = Math.floor(ph), f = ph - i; const dir = i % 2 ? 1 : -1;
      const bx = lerp(dir > 0 ? 260 : 820, dir > 0 ? 820 : 260, f), by = 960 - Math.sin(f * Math.PI) * 300;
      for (let k = 1; k < 6; k++) { const f2 = Math.max(0, f - k * .05); const tx = lerp(dir > 0 ? 260 : 820, dir > 0 ? 820 : 260, f2), ty = 960 - Math.sin(f2 * Math.PI) * 300; circ(tx, ty, 12 - k * 1.5, `rgba(255,255,255,${.5 - k * .08})`, 0); }
      circ(bx, by, 14, '#fff', 4);
      const pad = (hL, hR, n, s) => { seg(hR[0], hR[1], hR[0] + 18, hR[1] - 26, 9, '#8d6e63'); circ(hR[0] + 30, hR[1] - 50, 32, '#e63946', 6); };
      jensen({ x: 220, y: 1270, s: .95, headScale: .85, outfit: 'teen', pose: POSE.paddle(t), bob: bobble(t, [], .25, 3.7), prop: pad, face: 1 });
      figure({ x: 880, y: 1270, s: .95, color: '#ffb703', pose: POSE.paddle(t + .13), hair: 'short', mouth: 'o', prop: (hL, hR) => { circ(hR[0] + 26, hR[1] - 46, 30, '#1d3557', 6); } });
      // trophy
      const pk = pop(t, S.t0 + .9); if (pk > 0) { ctx.save(); ctx.translate(540, 700); ctx.scale(pk, pk); poly([[-60, -80], [60, -80], [40, 10], [-40, 10]], '#ffd60a', 7); rr(-14, 10, 28, 40, 4, '#ffd60a', 6); rr(-50, 50, 100, 26, 6, '#8d6e63', 6); txt('PRO', 0, -40, { size: 34, fill: INK, sw: 0 }); ctx.restore(); }
    } else if (t < t2) {
      rays(540, 760, '#7b2cbf', '#8e44d6', t);
      txt('16', 540, 760, { size: 380, fill: YEL, sw: 30, scale: pop(t, t1 + .1) });
      const k = prog(t, t1 + .3, t1 + .7);
      jensen({ x: 540, y: 1300, s: 1.08, headScale: .9, outfit: 'gown', pose: POSE.toss(eOut(k)), bob: bobble(t, [[t1 + .5, .3]]) });
      const ck = prog(t, t1 + .6, t2); if (ck > 0) { ctx.save(); ctx.translate(540 + ck * 120, 560 - Math.sin(ck * Math.PI) * 260); ctx.rotate(ck * 9); poly([[-70, 0], [0, -26], [70, 0], [0, 26]], INK, 0); rr(-30, 0, 60, 26, 4, INK, 0); ctx.restore(); }
      confetti(t, t1 + .6, 40, [0, 260, W, 1100]);
    } else {
      bg('#0b3d2e'); ctx.strokeStyle = '#1e7a55'; ctx.lineWidth = 6;
      for (let i = 0; i < 18; i++) { const y = 300 + hash(i) * 1000, x = hash(i * 3) * W; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 140, y); ctx.lineTo(x + 200, y + 60); ctx.stroke(); circ(x + 200, y + 60, 9, '#d4a017', 0); }
      chipShape(540, 820, 300, 200, '#2b2d42', 'CHIP DESIGN', 0, { size: 34 });
      jensen({ x: 380, y: 1300, s: 1.0, outfit: 'eng', pose: POSE.point(t), bob: bobble(t, [[t2, .3]]) });
      figure({ x: 790, y: 1300, s: 1.0, color: '#ff8fab', hair: 'long', hairCol: '#4a2c1a', eyes: 'heart', label: 'LORI', pose: POSE.idle(t) });
      for (let i = 0; i < 4; i++) { const d = ((t - t2) * 1.2 + i * .25) % 1; txt('♥', 590 + Math.sin(i * 2 + t * 3) * 40, 920 - d * 200, { size: 46, fill: '#ff4d6d', sw: 5, alpha: 1 - d }); }
    }
  },
  ui(t) {
    const t1 = A.gr_hs - .2, t2 = A.gr_ee - .15;
    if (t < t1) card('OREGON · ALOHA HIGH', 540, 400, t, sceneOf('grind').t0 + .15, { size: 46 });
    else if (t < t2) card('HIGH-SCHOOL GRAD AT 16', 540, 400, t, t1 + .05, { size: 46 });
    else { card('OREGON STATE · ELECTRICAL ENG.', 540, 390, t, t2 + .05, { size: 40 }); card('AMD → LSI LOGIC', 540, 480, t, t2 + .4, { size: 38, rot: .02, bg: '#d8f3dc' }); card('STANFORD MASTER\'S (NIGHTS)', 540, 568, t, t2 + .75, { size: 36, rot: -.01, bg: '#e0e7ff' }); }
    // XP bar
    const S = sceneOf('grind'); const k = prog(t, S.t0, S.t1);
    rr(68, 276, 390, 26, 8, '#222', 4); rr(70, 278, 386 * k, 22, 6, '#4cc9f0', 0); txt('XP', 470, 289, { size: 22, font: MONO, weight: 700, align: 'left', fill: '#fff', sw: 4 });
  }
};

/* ---- denny's ---- */
SC.dennys = {
  world(t, lt) {
    const tB = A.dn_catch - .05;
    if (t < tB) {
      const zk = eIO(prog(t, A.dn_chips, A.dn_graphics + .2));
      ctx.save(); ctx.translate(540, 1080); ctx.scale(1 + zk * .55, 1 + zk * .55); ctx.translate(-540, -1080);
      bg('#f6bd60'); ctx.fillStyle = '#e76f51'; ctx.fillRect(-400, 980, W + 800, 1000);
      for (let x = -400; x < W + 400; x += 70) { ctx.fillStyle = (x / 70) % 2 ? '#fff' : '#222'; ctx.fillRect(x, 1240, 70, 70); ctx.fillStyle = (x / 70) % 2 ? '#222' : '#fff'; ctx.fillRect(x, 1310, 70, 70); }
      rr(90, 330, 900, 380, 14, '#1d3557', 8);
      for (let i = 0; i < 30; i++) { ctx.fillStyle = `rgba(255,230,120,${.3 + .5 * hash(i)})`; ctx.fillRect(110 + hash(i * 3) * 860, 350 + hash(i * 7) * 340, 5, 5); }
      rr(330, 560, 420, 90, 16, '#e63946', 6); txt('24 HR DINER', 540, 606, { size: 48, fill: '#fff', sw: 7 });
      rr(60, 760, 960, 420, 40, '#d62828', 8);
      const ppl = [[285, 'CHRIS MALACHOWSKY', '#f4a261'], [540, null, null], [795, 'CURTIS PRIEM', '#90be6d']];
      for (const [x, lab, c] of ppl) {
        if (!lab) jensen({ x, y: 1250, s: .95, outfit: 'eng', pose: t > A.dn_chips ? POSE.point(t) : POSE.idle(t), bob: bobble(t, [[sceneOf('dennys').t0, .3]]) });
        else figure({ x, y: 1250, s: .95, color: c, hair: 'short', glasses: x < 400, label: lab, labelSize: 22, pose: POSE.idle(t + x) });
      }
      rr(80, 1040, 920, 60, 10, '#f1faee', 7); seg(200, 1100, 200, 1300, 10); seg(880, 1100, 880, 1300, 10);
      const n = Math.min(12, Math.floor((t - sceneOf('dennys').t0) * 2.4) + 1);
      for (let i = 0; i < n; i++) { const col = i % 4, row = Math.floor(i / 4); const cx = [120, 180, 900, 960][col] + (row % 2) * 8, cy = 1032 - row * 46;
        rr(cx - 26, cy - 40, 52, 40, 6, '#fff', 5); seg(cx + 26, cy - 30, cx + 38, cy - 16, 5); }
      // napkin
      rr(440, 1010, 200, 70, 6, '#fff', 5);
      const sk = prog(t, A.dn_chips, A.dn_graphics);
      if (sk > 0 && sk < 1) { ctx.beginPath(); ctx.moveTo(470, 1045); for (let i = 0; i < 20 * sk; i++) ctx.lineTo(470 + i * 7, 1045 + Math.sin(i * 1.3) * 14); stroke(4, '#1d3557'); }
      if (t > A.dn_graphics - .1) { const pk = pop(t, A.dn_graphics - .1, .4); ctx.save(); ctx.translate(540, 1040); ctx.scale(pk, pk); greenEye(0, 0, 34); ctx.restore(); burst(540, 1040, 90 * pk, 'rgba(255,255,255,.0)', 10); }
      ctx.restore();
      if (t > A.dn_graphics) { ctx.save(); ctx.globalAlpha = 1 - prog(t, A.dn_graphics, A.dn_graphics + .4); bg('#fff'); ctx.restore(); }
    } else {
      // pull back: diner small, dozens of rivals marching in
      const k = eOut(prog(t, tB, tB + .7));
      vgrad('#14213d', '#355070', 0, 1200); ctx.fillStyle = '#2d3a2e'; ctx.fillRect(-400, 1120, W + 800, 900);
      ctx.save(); ctx.translate(250, 1120); const z = lerp(3.2, 1, k); ctx.scale(z, z);
      rr(-120, -170, 240, 170, 8, '#f6bd60', 6); rr(-90, -140, 180, 70, 6, '#ffe8a3', 5);
      for (const px of [-55, 0, 55]) circ(px, -100, 14, '#333', 0);
      rr(-90, -215, 180, 40, 8, '#e63946', 5); txt('DINER', 0, -195, { size: 26, fill: '#fff', sw: 4 });
      ctx.restore();
      const cols = ['#e63946', '#f4a261', '#2a9d8f', '#8338ec', '#ff006e', '#3a86ff', '#ffbe0b', '#fb5607'];
      for (let i = 0; i < 32; i++) {
        const row = i % 4, x0 = 470 + (i / 4 | 0) * 80 + row * 36 - (t - tB) * (70 + row * 18), y0 = 1140 + row * 62;
        if (x0 > W + 60) continue;
        figure({ x: x0, y: y0, s: .42 + row * .06, color: cols[i % 8], headCol: cols[(i + 3) % 8], pose: POSE.walk(t + i * .3, 2.2), mouth: 'flat', face: -1 });
      }
      for (let i = 0; i < 5; i++) { const x = 520 + i * 120 + Math.sin(t * 3 + i) * 6; txt('CHIP CO.', x, 880 - (i % 2) * 50, { size: 26, fill: '#fff', sw: 6, alpha: k }); }
    }
  },
  ui(t) {
    card("1993 · DENNY'S, SAN JOSE", 540, 400, t, sceneOf('dennys').t0 + .15, { size: 44, t1: A.dn_catch - .1 });
    levelCard('LEVEL 1: DOZENS OF RIVALS', t, A.dn_dozens - .05, 1.15);
  }
};

/* ---- flop ---- */
SC.flop = {
  world(t, lt) {
    const tB = A.fl_jensen - .05, tC = A.fl_and - .15;
    if (t < tB) {
      bg('#8338ec');
      // socket with triangles
      rr(240, 1060, 600, 160, 14, '#3a0ca3', 8);
      for (let i = 0; i < 7; i++) poly([[290 + i * 75, 1190], [325 + i * 75, 1090], [360 + i * 75, 1190]], '#ffbe0b', 5);
      txt('INDUSTRY STANDARD: TRIANGLES', 540, 1260, { size: 30, fill: '#fff', sw: 6 });
      const S = sceneOf('flop'); const k = prog(t, S.t0 + .7, A.fl_wrong);
      let cy = lerp(520, 930, eIn(k)); if (t > A.fl_wrong) cy = 930 - Math.sin(prog(t, A.fl_wrong, A.fl_wrong + .6) * Math.PI) * 260 + prog(t, A.fl_wrong + .6, A.fl_wrong + 1) * 40;
      const rot = t > A.fl_wrong ? (t - A.fl_wrong) * 3 : 0;
      ctx.save(); ctx.translate(540, cy); ctx.rotate(rot);
      chipShape(0, 0, 300, 210, '#9d4edd', null, 0, { noDie: true });
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(0, 0, 40 + i * 30, 20 + i * 18, 0, 0, Math.PI * 2); stroke(5, '#e0aaff'); }
      txt('NV1', 0, -10, { size: 64, fill: '#fff', sw: 9 });
      circ(-50, 50, 8, INK, 0); circ(50, 50, 8, INK, 0);
      ctx.beginPath(); if (t > A.fl_wrong) ctx.arc(0, 85, 20, Math.PI + .3, -.3); else ctx.arc(0, 60, 18, .2, Math.PI - .2); stroke(5);
      ctx.restore();
      if (t > A.fl_wrong) { const xk = pop(t, A.fl_wrong, .25); ctx.save(); ctx.translate(540, 760); ctx.scale(xk, xk); seg(-150, -150, 150, 150, 40, INK); seg(150, -150, -150, 150, 40, INK); seg(-150, -150, 150, 150, 26, '#ff3b3b'); seg(150, -150, -150, 150, 26, '#ff3b3b'); ctx.restore(); }
      jensen({ x: 150, y: 1340, s: .75, outfit: 'suit', pose: t > A.fl_wrong ? POSE.panic(t) : POSE.idle(t), bob: bobble(t, [[A.fl_wrong, .4]]) });
    } else if (t < tC) {
      // Japan meeting
      bg('#ffe5ec'); rr(80, 340, 420, 340, 10, '#bde0fe', 8);
      poly([[120, 670], [290, 450], [460, 670]], '#adb5bd', 6); poly([[245, 508], [290, 450], [335, 508], [310, 520], [290, 505], [270, 520]], '#fff', 4);
      circ(400, 420, 40, '#e63946', 0);
      txt('JAPAN', 290, 640, { size: 40, fill: '#fff', sw: 7 });
      ctx.fillStyle = '#e9c46a'; ctx.fillRect(-400, 1180, W + 800, 900); seg(-100, 1180, W + 100, 1180, 7);
      const fly = prog(t, tB, tB + .7);
      if (fly < 1) plane(lerp(-250, 1300, fly), 900 - fly * 200, .9, -.15);
      const k = t > A.fl_admitted ? eOut(prog(t, A.fl_admitted, A.fl_admitted + .35)) : eOut(prog(t, tB + .7, tB + 1.1)) * .45;
      jensen({ x: 320, y: 1300, s: 1.0, outfit: 'suit', pose: POSE.bow(k), bob: bobble(t, [[A.fl_admitted, .25]]), face: 1 });
      figure({ x: 780, y: 1300, s: 1.0, color: '#003049', hair: 'short', glasses: true, label: 'SEGA EXEC', mouth: t > A.fl_admitted ? 'o' : 'flat', pose: POSE.idle(t), sweat: false });
      if (t > A.fl_admitted) { const d = (t - A.fl_admitted) % .6; ell(430, 800 + d * 120, 10, 16, '#8ecae6', 4); }
    } else {
      rays(540, 820, '#ffb703', '#ffc93c', t);
      figure({ x: 770, y: 1300, s: 1.0, color: '#003049', hair: 'short', glasses: true, label: 'SEGA EXEC', pose: POSE.hold(t), mouth: 'smile',
        prop: (hL, hR) => { if (t > A.fl_five - .4) { rr(hL[0] - 120, hL[1] - 70, 240, 120, 12, '#fff', 6); txt('$5M', hL[0], hL[1] - 10, { size: 64, fill: '#2a9d8f', sw: 0 }); } } });
      jensen({ x: 280, y: 1300, s: 1.0, outfit: 'suit', pose: t > A.fl_five ? POSE.cheer(t) : POSE.idle(t), bob: bobble(t, [[A.fl_five, .4]]) });
      coinRain(t, A.fl_five, 1.0, 30);
    }
  },
  ui(t) {
    levelCard('LEVEL 2: WRONG TECH', t, sceneOf('flop').t0 + .02, .95);
    const tB = A.fl_jensen - .05, tC = A.fl_and - .15;
    if (t < tB) card('NV1 · 1995', 540, 400, t, sceneOf('flop').t0 + 1.0, { size: 46 });
    else if (t < tC) card('HE TOLD SEGA THE TRUTH', 540, 400, t, A.fl_admitted, { size: 42 });
    else card('SEGA → $5M INVESTMENT', 540, 400, t, A.fl_five - .1, { size: 48, bg: '#d8f3dc' });
  }
};

/* ---- brink ---- */
SC.brink = {
  world(t, lt) {
    const S = sceneOf('brink'); const tSpot = A.br_every - .15;
    bg('#22223b');
    if (t < tSpot) {
      ctx.fillStyle = '#2f2f4f'; ctx.fillRect(-400, 1150, W + 800, 900);
      // desks with staff that vanish
      const gone = Math.floor(clamp((t - A.br_half + .2) / 1.2) * 6);
      let idx = 0;
      for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) {
        const x = 150 + c * 195, y = 1000 + r * 220;
        const order = [1, 3, 6, 8, 0, 5, 2, 9, 4, 7].indexOf(idx);
        const vanished = order < gone;
        if (!vanished) figure({ x, y, s: .55, color: ['#4cc9f0', '#f72585', '#b5179e', '#4895ef', '#90be6d'][idx % 5], hair: 'short', pose: POSE.idle(t + idx), mouth: t > A.br_half ? 'sad' : 'flat' });
        else { const d = t - (A.br_half - .2 + order * .2); if (d < .35) circ(x, y - 110, 30 + d * 120, `rgba(255,255,255,${.6 - d * 1.6})`, 0); }
        rr(x - 60, y - 70, 120, 18, 4, '#8d6e63', 4); idx++;
      }
      // calendar countdown
      if (t > A.br_one - .1) {
        const k = pop(t, A.br_one - .1); const days = Math.max(1, 30 - Math.floor((t - A.br_one) * 11));
        ctx.save(); ctx.translate(540, 640); ctx.scale(k, k);
        rr(-170, -170, 340, 330, 22, '#fff', 8); rr(-170, -170, 340, 90, 22, '#e63946', 8);
        txt('CASH LEFT', 0, -126, { size: 40, fill: '#fff', sw: 0 });
        txt(String(days), 0, 20, { size: 150, fill: INK, sw: 0 }); txt('DAYS', 0, 118, { size: 40, fill: INK, sw: 0 });
        ctx.restore();
      }
    } else {
      // spotlight on one chip
      ctx.save(); ctx.globalAlpha = .9; const g = ctx.createRadialGradient(540, 980, 40, 540, 980, 520); g.addColorStop(0, 'rgba(255,245,200,.55)'); g.addColorStop(1, 'rgba(255,245,200,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
      poly([[460, 300], [620, 300], [800, 1260], [280, 1260]], 'rgba(255,245,200,.12)', 0);
      rr(440, 1060, 200, 200, 10, '#495057', 7);
      const gk = prog(t, A.br_chip - .2, A.br_chip + .3);
      if (gk > 0) glow(540, 990, 260, 'rgba(120,255,170,A)', .6 * gk);
      chipShape(540, 1000, 180, 110, gk > 0 ? '#2fbf71' : '#6c757d', '?', 0, { size: 60 });
      jensen({ x: 840, y: 1300, s: .95, outfit: 'suit', pose: POSE.point(t), face: -1, bob: bobble(t, [[tSpot, .2]]) });
      for (let i = 0; i < 2; i++) { const d = ((t - tSpot) * 1.3 + i * .5) % 1; ell(905, 700 + d * 90, 8, 13, '#8ecae6', 3); }
    }
    // heartbeat vignette
    const hb = Math.pow(Math.max(0, Math.sin((t - S.t0) / .62 * Math.PI * 2)), 8);
    ctx.save(); const v = ctx.createRadialGradient(540, 960, 400, 540, 960, 1200); v.addColorStop(0, 'rgba(120,0,0,0)'); v.addColorStop(1, `rgba(170,0,0,${.25 + .35 * hb})`); ctx.fillStyle = v; ctx.fillRect(-100, -100, W + 200, H + 200); ctx.restore();
  },
  ui(t) {
    card('STAFF: 100 → 40', 540, 400, t, A.br_half, { size: 48, t1: A.br_every - .2 });
    card('CASH: ~1 MONTH', 540, 500, t, A.br_one + .3, { size: 44, bg: '#ffccd5', rot: .02, t1: A.br_every - .2 });
    card("NVIDIA'S UNOFFICIAL MOTTO:\n\"30 DAYS FROM GOING\nOUT OF BUSINESS\"", 540, 470, t, A.br_every - .1, { size: 40, bg: '#fff' });
  }
};

/* ---- comeback ---- */
SC.comeback = {
  world(t, lt) {
    const tB = A.cb_geforce - .1, tC = A.cb_mighty - .1;
    if (t < tB) {
      bg(t > A.cb_hit ? '#06d6a0' : '#22223b');
      if (t > A.cb_hit) { lineChart(140, 520, 800, 420, prog(t, A.cb_hit, A.cb_hit + .7), '#fff'); }
      rr(440, 1060, 200, 200, 10, '#495057', 7);
      const k = prog(t, A.cb_hit - .3, A.cb_hit);
      const hover = 600 + Math.sin(t * 3) * 18;
      if (t < A.cb_hit) glow(540, hover, 300, 'rgba(120,255,170,A)', .45 + .15 * Math.sin(t * 8));
      const cy = lerp(hover, 1000, eIn(k));
      if (t > A.cb_hit) { const d = t - A.cb_hit; ctx.save(); ctx.globalAlpha = Math.max(0, 1 - d * 1.5); circ(540, 1000, 80 + d * 700, null, 14, '#fff'); ctx.restore(); }
      chipShape(540, cy, 260, 150, '#2fbf71', 'RIVA 128', 0, { size: 40 });
      jensen({ x: 870, y: 1300, s: .9, outfit: 'suit', pose: t > A.cb_hit ? POSE.cheer(t) : POSE.idle(t), face: -1, bob: bobble(t, [[A.cb_hit, .4]]) });
    } else if (t < tC) {
      rays(540, 900, '#fb8500', '#ffa62b', t);
      const pk = prog(t, A.cb_geforce + .05, A.cb_geforce + .45);
      if (pk > 0 && pk < 1) { ctx.save(); ctx.globalAlpha = 1 - pk; circ(540, 900, 100 + pk * 600, '#fff', 0); ctx.restore(); }
      const outfit = t > A.cb_geforce + .2 ? 'leather' : 'suit';
      const prop = (hL, hR) => { if (t > A.cb_gpu - .5) gpuCard((hL[0] + hR[0]) / 2, (hL[1] + hR[1]) / 2 - 90, 330, t, 'GEFORCE 256'); };
      jensen({ x: 540, y: 1310, s: 1.02, outfit, pose: t > A.cb_gpu - .5 ? POSE.cheer(t) : POSE.flex(t), bob: bobble(t, [[A.cb_geforce + .2, .45], [A.cb_gpu, .3]]), prop });
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + t * 2; if (t > A.cb_geforce + .2 && t < A.cb_geforce + 1.4) burst(540 + Math.cos(a) * 300, 900 + Math.sin(a) * 300, 26, '#fff36b', 4, t * 5); }
      // IPO bell
      if (t > A.cb_gpu - 1.1) { const bk = pop(t, A.cb_gpu - 1.1); ctx.save(); ctx.translate(880, 640); ctx.scale(bk, bk); ctx.rotate(Math.sin(t * 18) * .35 * Math.exp(-(t - A.cb_gpu + 1.1) * 1.5));
        poly([[-60, 40], [-48, -30], [-20, -62], [20, -62], [48, -30], [60, 40]], '#ffd60a', 7); circ(0, 52, 16, '#ffd60a', 6); ctx.restore(); }
    } else {
      bg('#3a0ca3'); ctx.fillStyle = '#240046'; ctx.fillRect(-400, 1180, W + 800, 900); seg(-100, 1180, W + 100, 1180, 7);
      for (let i = 0; i < 7; i++) { ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(i * 170 - 40, 300, 80, 880); }
      const hits = [A.cb_3dfx + .25, A.cb_3dfx + .57, A.cb_3dfx + .89];
      let pk = 0; for (const h of hits) { const d = t - h + .12; if (d > 0 && d < .3) pk = Math.sin(d / .3 * Math.PI); }
      const jx = 300 + pk * 120;
      const ko = t > A.cb_bought;
      // boss
      if (t < A.cb_left + .3) {
        let recoil = 0; for (const h of hits) { const d = t - h; if (d > 0 && d < .4) recoil += Math.sin(d / .4 * Math.PI) * 50; }
        const fall = ko ? eOut(prog(t, A.cb_bought, A.cb_bought + .5)) : 0;
        ctx.save(); ctx.translate(780 + recoil, 1290); ctx.rotate(fall * 1.45); ctx.translate(-780 - recoil, -1290);
        figure({ x: 780 + recoil, y: 1290, s: 1.5, color: '#f4a261', headCol: '#f6bd60', crown: !ko && t < hits[2], eyes: ko ? 'x' : null, mouth: recoil > 10 ? 'o' : 'flat', label: ko ? null : '3dfx', pose: POSE.brace(t), face: -1 });
        ctx.restore();
      }
      if (t > hits[2]) { const d = t - hits[2]; ctx.save(); ctx.translate(820 + d * 200, 640 + d * 900 - d * d * 0); ctx.rotate(d * 8); poly([[-50, 20], [-50, -30], [-25, -5], [0, -40], [25, -5], [50, -30], [50, 20]], '#ffd60a', 6); ctx.restore(); }
      for (const h of hits) { const d = t - h; if (d > 0 && d < .25) { burst(700, 900, 110 * eOut(d / .25), '#fff36b', 9, d * 4); txt('POW!', 700, 900, { size: 64, fill: '#ff595e', sw: 10, scale: eBack(d / .25) }); } }
      jensen({ x: jx, y: 1290, s: 1.0, outfit: 'leather', pose: pk > 0 ? POSE.punch(pk) : (ko ? POSE.cheer(t) : POSE.brace(t)), bob: bobble(t, hits.map(h => [h, .3]).concat([[A.cb_bought, .3]])) });
      if (ko) { txt('K.O.', 540, 700, { size: 200, fill: '#ff595e', sw: 22, scale: eBack(prog(t, A.cb_bought, A.cb_bought + .3)), alpha: 1 - prog(t, A.cb_left - .2, A.cb_left + .1) }); }
      if (t > A.cb_left - .2) {
        const ek = pop(t, A.cb_left - .2, .3); ctx.save(); ctx.translate(540, 760); ctx.scale(ek, ek); greenEye(0, 0, 110); ctx.restore();
        const tk = eIn(prog(t, A.cb_left, A.cb_left + .6));
        if (tk < 1) { ctx.save(); ctx.translate(lerp(780, 540, tk), lerp(1050, 760, tk)); ctx.scale(1 - tk, 1 - tk); ctx.rotate(tk * 6); rr(-90, -30, 180, 60, 10, '#f4a261', 5); txt('3dfx', 0, 2, { size: 34, fill: '#fff', sw: 6 }); ctx.restore(); }
      }
    }
  },
  ui(t) {
    const tB = A.cb_geforce - .1, tC = A.cb_mighty - .1;
    if (t < tB) card('RIVA 128 · 1997\n~1M SOLD IN 4 MONTHS', 540, 420, t, A.cb_hit + .05, { size: 42 });
    else if (t < tC) { card('GEFORCE 256 · 1999', 540, 390, t, A.cb_geforce + .3, { size: 44 }); card('IPO · JAN 1999', 540, 485, t, A.cb_gpu - 1.1, { size: 40, bg: '#d8f3dc', rot: .02 }); }
    else {
      const hits = [A.cb_3dfx + .25, A.cb_3dfx + .57, A.cb_3dfx + .89]; const n = hits.filter(h => t > h).length;
      if (t < A.cb_left) bossBar('3dfx', 1 - n / 3, '#f4a261', 1 - prog(t, A.cb_bought + .4, A.cb_left));
      card('3dfx ASSETS ACQUIRED · 2000', 540, 420, t, A.cb_left, { size: 42, bg: '#d8f3dc' });
    }
    levelCard('LEVEL 3: 3dfx', t, A.cb_mighty - .1, .7);
  }
};

/* ---- giants ---- */
SC.giants = {
  world(t, lt) {
    const tB = A.gi_intel - .1;
    if (t < tB) {
      bg('#e76f51'); ctx.fillStyle = '#9c3a22'; ctx.fillRect(-400, 1180, W + 800, 900); seg(-100, 1180, W + 100, 1180, 7);
      const S = sceneOf('giants');
      // shadows looming
      if (t < A.gi_amd) { const k = prog(t, S.t0, A.gi_amd); ctx.fillStyle = 'rgba(0,0,0,.25)'; ell(800, 1200, 300 * k + 60, 40, 'rgba(0,0,0,.25)', 0); }
      const walkIn = eOut(prog(t, A.gi_amd - .1, A.gi_amd + .8));
      const merge = eIO(prog(t, A.gi_amd + 1.0, A.gi_ati - .2));
      if (merge < 1) {
        figure({ x: lerp(1250, 700, walkIn) - 70 * (1 - merge), y: 1290, s: 1.25, color: '#e63946', headCol: '#ff8fa3', label: 'ATI', pose: POSE.walk(t, 1.5), face: -1, mouth: 'flat' });
        figure({ x: lerp(1450, 880, walkIn) - 180 * merge, y: 1290, s: 1.35, color: '#6a040f', headCol: '#c9184a', label: 'AMD', pose: POSE.walk(t + .4, 1.5), face: -1, mouth: 'flat' });
        if (merge > .7) { ctx.save(); ctx.globalAlpha = (merge - .7) / .3; circ(760, 900, 300, '#fff', 0); ctx.restore(); }
      } else {
        const hit = t > A.gi_ati ? Math.sin(prog(t, A.gi_ati - .15, A.gi_ati + .2) * Math.PI) : 0;
        figure({ x: 770 - hit * 60, y: 1290, s: 1.8, color: '#9d0208', headCol: '#e63946', label: 'AMD + ATI', pose: hit > 0 ? POSE.punch(hit) : POSE.brace(t), face: -1, mouth: 'flat' });
      }
      const brace = t > A.gi_amd + .4;
      jensen({ x: 250 - (t > A.gi_ati && t < A.gi_ati + .3 ? 30 : 0), y: 1290, s: .95, outfit: 'leather', pose: brace ? POSE.brace(t) : POSE.panic(t), bob: bobble(t, [[A.gi_giants, .4], [A.gi_ati, .4]]) });
      if (t > A.gi_ati && t < A.gi_ati + .3) burst(420, 980, 120, '#fff36b', 9, t * 4);
      if (t > A.gi_ati + .3) txt('HELD THE LINE!', 300, 760, { size: 56, fill: YEL, sw: 10, scale: pop(t, A.gi_ati + .3), rot: -.06 });
    } else {
      bg('#90e0ef'); for (let i = 0; i < 3; i++) cloud(200 + i * 360, 360 + i * 90, .8);
      ctx.fillStyle = '#80b918'; ctx.fillRect(-400, 1240, W + 800, 900); seg(-100, 1240, W + 100, 1240, 7);
      const trip = t > A.gi_cancelled ? eIn(prog(t, A.gi_cancelled - .1, A.gi_cancelled + .35)) : 0;
      // larrabee blocks
      const nb = Math.floor(clamp((t - (A.gi_larrabee - 1.0)) / 1.4) * 12);
      if (t < A.gi_cancelled) {
        for (let i = 0; i < nb; i++) { const c = i % 4, r = i / 4 | 0; rr(290 + c * 70, 1180 - r * 60, 66, 56, 6, '#0096c7', 5); }
        if (nb >= 12) txt('LARRABEE', 430, 990, { size: 44, fill: '#fff', sw: 8 });
      } else {
        const d = t - A.gi_cancelled;
        for (let i = 0; i < 12; i++) { const c = i % 4, r = i / 4 | 0; const vx = (hash(i) - .5) * 900, vy = -400 - hash(i * 3) * 600;
          ctx.save(); ctx.translate(250 + c * 70 + 33 + vx * d, 1170 - r * 60 + 28 + vy * d + 1400 * d * d); ctx.rotate(d * (hash(i) - .5) * 20); rr(-33, -28, 66, 56, 6, '#0096c7', 5); ctx.restore(); }
      }
      ctx.save(); ctx.translate(900, 1300); ctx.rotate(trip * 1.35); ctx.translate(-900, -1300);
      figure({ x: 820, y: 1300, s: 2.3, color: '#0077b6', headCol: '#48cae4', label: 'INTEL', labelSize: 30, pose: t < A.gi_cancelled - .2 ? POSE.hold(t) : POSE.panic(t), face: -1, mouth: trip > 0 ? 'o' : 'flat', eyes: trip > .9 ? 'x' : null });
      ctx.restore();
      jensen({ x: 140, y: 1300, s: .8, outfit: 'leather', pose: t > A.gi_cancelled + .3 ? POSE.cheer(t) : POSE.shrug(t), bob: bobble(t, [[A.gi_cancelled + .3, .4]]) });
    }
  },
  ui(t) {
    const tB = A.gi_intel - .1;
    levelCard('LEVEL 4: AMD + ATI', t, A.gi_amd - .2, .9);
    levelCard('LEVEL 5: INTEL', t, A.gi_intel - .1, .75);
    if (t < tB) { card('AMD ACQUIRES ATI · 2006', 540, 420, t, A.gi_ati - .7, { size: 44 }); if (t > A.gi_amd + .9) bossBar('AMD + ATI', t > A.gi_ati + .2 ? .55 : 1, '#e63946'); }
    else { bossBar('INTEL', t > A.gi_cancelled ? lerp(1, 0, prog(t, A.gi_cancelled, A.gi_cancelled + .4)) : 1, '#0096c7'); card('LARRABEE · CANCELLED (2009)', 540, 420, t, A.gi_cancelled + .5, { size: 42 }); stamp('CANCELLED', 430, 860, t, A.gi_cancelled + .35, { size: 70 }); }
  }
};

/* ---- cuda ---- */
SC.cuda = {
  world(t, lt) {
    const tB = A.cu_wall - .1;
    if (t < tB) {
      bg('#0d1b2a'); ctx.strokeStyle = 'rgba(118,185,0,.18)'; ctx.lineWidth = 3;
      for (let i = 0; i < 20; i++) { ctx.beginPath(); ctx.moveTo(i * 60 - 60, 0); ctx.lineTo(i * 60 - 60, H); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * 100); ctx.lineTo(W, i * 100); ctx.stroke(); }
      const open = eOut(prog(t, A.cu_turn, A.cu_turn + .7));
      const by = lerp(940, 760, open);
      if (open > 0) { glow(540, by, 380, 'rgba(255,140,190,A)', .5 * open); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + t; seg(540 + Math.cos(a) * 200, by + Math.sin(a) * 160, 540 + Math.cos(a) * (240 + 30 * Math.sin(t * 5 + i)), by + Math.sin(a) * (200 + 20 * Math.sin(t * 4 + i)), 5, '#76b900'); }
        ctx.save(); ctx.translate(540, by); ctx.scale(open, open); brain(0, 0, 150, t); ctx.restore(); }
      ctx.save(); ctx.translate(-open * 260, 0); ctx.rotate(-open * .25); gpuCard(540 - (open > 0 ? 120 : 0), 1060, open > 0 ? 240 : 480, t, open > 0 ? null : 'GAMING GPU', 0); ctx.restore();
      if (open > 0) { ctx.save(); ctx.translate(open * 260, 0); ctx.rotate(open * .25); gpuCard(660, 1060, 240, t, null); ctx.restore(); }
      jensen({ x: 880, y: 1320, s: .85, outfit: 'leather', pose: t > A.cu_brain ? POSE.cheer(t) : POSE.point(t), face: -1, bob: bobble(t, [[A.cu_cuda, .3]]) });
    } else {
      bg('#adb5bd'); rr(80, 330, 920, 300, 12, '#111', 8);
      ctx.save(); ctx.beginPath(); ctx.rect(90, 340, 900, 280); ctx.clip();
      const tick = 'NVDA ▬ 0.0%   GPUs?   CUDA??   WHY?   NVDA ▬ 0.0%   ';
      txt(tick + tick, 90 - ((t * 260) % 900), 420, { size: 54, font: MONO, weight: 700, fill: '#ffbe0b', sw: 0, align: 'left' });
      seg(120, 540, 960, 540, 8, '#ff595e'); ctx.restore();
      ctx.fillStyle = '#6c757d'; ctx.fillRect(-400, 1240, W + 800, 900);
      for (let i = 0; i < 4; i++) { const x = 150 + i * 190; figure({ x, y: 1300, s: .8, outfit: 'suit', hair: 'short', glasses: i % 2 === 0, pose: POSE.shrug(t + i * .3), mouth: 'flat' });
        txt('?', x + 5, 960 - Math.abs(Math.sin(t * 5 + i)) * 20, { size: 80, fill: '#fff', sw: 10 }); }
      jensen({ x: 945, y: 1300, s: .75, outfit: 'leather', pose: POSE.cross(t), face: -1, bob: bobble(t, []) });
    }
  },
  ui(t) {
    if (t < A.cu_wall - .1) { stamp('CUDA', 540, 390, t, A.cu_cuda, { col: '#76b900', size: 96, rot: -.06 }); card('CUDA · 2006', 540, 515, t, A.cu_cuda + .3, { size: 40 }); }
    else card('WALL STREET: ???', 540, 720, t, A.cu_wall, { size: 46, rot: .02 });
  }
};

/* ---- ai ---- */
SC.ai = {
  world(t, lt) {
    const tB = A.ai_decade - .1;
    if (t < tB) {
      bg('#ffbe0b');
      for (let l = 0; l < 3; l++) { ctx.fillStyle = l % 2 ? '#d1495b' : '#c1121f'; ctx.fillRect(-400, 900 + l * 135, W + 800, 135); }
      for (let l = 0; l <= 3; l++) seg(-100, 900 + l * 135, W + 100, 900 + l * 135, 6, '#fff');
      // finish line
      for (let r = 0; r < 14; r++) for (let c = 0; c < 2; c++) { ctx.fillStyle = (r + c) % 2 ? '#fff' : '#111'; ctx.fillRect(930 + c * 29, 900 + r * 29, 29, 29); }
      txt('2012', 540, 640, { size: 200, fill: '#fff', sw: 20, scale: pop(t, sceneOf('ai').t0 + .1) });
      const go = A.ai_alexnet + 1.2;
      const kA = eIn(prog(t, go, A.ai_crushed)) ;
      const ax = lerp(120, 1000, kA);
      for (let i = 0; i < 2; i++) { const kx = lerp(120, 480 - i * 60, prog(t, go, A.ai_crushed + 1)) ; robot(kx, i ? 1300 : 1030, .6, 'OTHER AI', '#8d99ae', t + i, t > go ? 1 : 0); }
      robot(ax, 1166, .66, 'ALEXNET', '#06d6a0', t, t > go && t < A.ai_crushed ? 1 : 0);
      if (t > A.ai_alexnet) { const gk = pop(t, A.ai_alexnet); ctx.save(); ctx.translate(ax - 85, 1010); ctx.scale(gk * 1.3, gk * 1.3); gpuCard(0, 0, 90, t, null, -.2); gpuCard(0, 50, 90, t, null, -.2); ctx.restore(); }
      if (t > go && t < A.ai_crushed) { ctx.save(); ctx.globalAlpha = .7; for (let i = 0; i < 5; i++) seg(ax - 130 - i * 40, 1070 + i * 18, ax - 70 - i * 40, 1070 + i * 18, 6, '#fff'); ctx.restore(); }
      if (t > A.ai_crushed) { const pk = pop(t, A.ai_crushed); ctx.save(); ctx.translate(900, 800); ctx.scale(pk, pk); poly([[-60, -80], [60, -80], [40, 10], [-40, 10]], '#ffd60a', 7); rr(-14, 10, 28, 40, 4, '#ffd60a', 6); rr(-50, 50, 100, 26, 6, '#8d6e63', 6); ctx.restore(); }
    } else {
      bg('#4cc9f0');
      const tW = A.ai_world - .1;
      if (t < tW) {
        rr(330, 980, 420, 260, 16, '#2b2d42', 8); rr(360, 1005, 360, 205, 8, '#edf2f4', 5); poly([[270, 1240], [810, 1240], [850, 1290], [230, 1290]], '#8d99ae', 7);
        const msgs = ['Hi!', 'Write my essay', 'Fix my code', 'Explain AI', '...', 'Plan my trip', 'Make it shorter', '???'];
        for (let i = 0; i < msgs.length; i++) { const st = A.ai_chatgpt + .05 + i * .14; if (t < st) continue; const d = t - st;
          const P = [[250, 880], [800, 860], [330, 700], [760, 660], [540, 560], [250, 520], [830, 480], [540, 820]][i]; const m = eOut(clamp(d / .4));
          bubbleTxt(lerp(540, P[0], m), lerp(1080, P[1], m), eBack(clamp(d / .3)) * .95, msgs[i], ['#fff', '#caffbf', '#ffd6a5', '#bdb2ff'][i % 4]); }
      } else {
        ctx.fillStyle = '#3a86ff'; ctx.fillRect(-400, 1240, W + 800, 900);
        rr(700, 1000, 330, 240, 12, '#2b2d42', 7); txt('GPUs', 865, 1060, { size: 48, fill: '#76b900', sw: 6 });
        stamp('SOLD OUT', 865, 1170, t, tW + .5, { size: 46, rot: -.1 });
        jensen({ x: 865, y: 1000, s: .72, outfit: 'leather', pose: POSE.cheer(t), bob: bobble(t, [[tW, .4]]) });
        const cols = ['#ff006e', '#8338ec', '#fb5607', '#06d6a0', '#ffbe0b', '#e63946'];
        for (let i = 0; i < 9; i++) { const row = i % 3; const x = -100 - (i / 3 | 0) * 170 - row * 40 + (t - tW) * 520; if (x > 640) continue;
          figure({ x: Math.min(x, 600), y: 1250 + row * 40, s: .62, color: cols[i % 6], hair: 'short', pose: POSE.run(t + i * .2), mouth: 'o',
            prop: (hL, hR) => { rr(hR[0] - 10, hR[1] - 70, 70, 60, 4, '#fff', 4); txt('ORDER', hR[0] + 25, hR[1] - 40, { size: 15, fill: INK, sw: 0 }); } }); }
      }
    }
  },
  ui(t) {
    if (t < A.ai_decade - .1) card('ALEXNET · 2012\nTRAINED ON 2× GTX 580', 540, 420, t, A.ai_alexnet, { size: 40 });
    else if (t < A.ai_world - .1) card('CHATGPT · NOV 2022', 540, 400, t, A.ai_chatgpt, { size: 46 });
    else card('EVERY AI LAB WANTED GPUs', 540, 400, t, A.ai_world, { size: 42, bg: '#d8f3dc' });
  }
};

/* ---- peak ---- */
SC.peak = {
  world(t, lt) {
    const S = sceneOf('peak'); const tB = A.pk_even - .1;
    if (t < tB) {
      rays(540, 700, '#ffb703', '#ffd166', t);
      const rise = eOut(prog(t, S.t0 + .1, S.t0 + 1.4));
      chipMountain(540, 1290, 8, 110, 58, rise, false);
      jensen({ x: 540, y: lerp(1450, 880, rise), s: .85, outfit: 'leather', pose: POSE.cheer(t), bob: bobble(t, [[S.t0 + 1.4, .4], [A.pk_five, .35]]) });
      confetti(t, A.pk_five - .2, 70, [0, 250, W, 1250], 4);
    } else {
      bg('#1b263b');
      const strike = A.pk_deepseek + .05, k = prog(t, strike, strike + .3), rec = eOut(prog(t, A.pk_stop - .1, A.pk_stop + .5));
      cloud(540, 380 + Math.sin(t * 3) * 6, 1.6, '#4a4e69', 7); txt('DEEPSEEK', 540, 400, { size: 52, fill: '#fff', sw: 8 });
      // bars
      const hgt = [.25, .38, .55, .8, 1];
      for (let i = 0; i < 5; i++) { let h = hgt[i] * 620; if (i === 4) h *= (t > strike ? lerp(1, .55, eOut(k)) : 1) * (1 - rec) + rec * 1.02;
        rr(170 + i * 150, 1260 - h, 110, h, 8, i === 4 ? '#2fd27a' : '#577590', 7); }
      if (t > strike && t < strike + .35) { lightning(540, 470, 800, 1260 - 620 * .7, Math.floor(t * 30)); ctx.save(); ctx.globalAlpha = (1 - (t - strike) / .35) * .7; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
      if (t > strike) txt('−$590B', 780, 520 + 0, { size: 64, fill: '#ff595e', sw: 10, scale: pop(t, strike + .1), alpha: 1 - rec });
      if (rec > 0) { poly([[880, 560], [950, 470], [1020, 560]], '#2fd27a', 7); }
      jensen({ x: 170, y: 1300, s: .75, outfit: 'leather', pose: rec > 0 ? POSE.cheer(t) : (t > strike ? POSE.brace(t) : POSE.idle(t)), bob: bobble(t, [[strike, .45], [A.pk_stop, .3]]) });
    }
  },
  ui(t) {
    const S = sceneOf('peak'); const tB = A.pk_even - .1;
    if (t < tB) {
      const k = eIO(prog(t, S.t0 + .3, A.pk_five + .3)); const v = lerp(1, 5, k);
      ctx.save(); rr(120, 300, 840, 186, 18, '#000', 6);
      txt('MARKET CAP', 540, 334, { size: 28, font: MONO, weight: 700, fill: '#aaa', sw: 0 });
      txt('$' + v.toFixed(2) + ' TRILLION', 540, 392, { size: 64, font: MONO, weight: 700, fill: YEL, sw: 0 });
      txt('$1T (2023) → $4T (2025) → $5T (OCT 2025)', 540, 450, { size: 28, font: FONT, weight: 800, fill: '#fff', sw: 0, alpha: clamp((t - S.t0 - .4) / .3) }); ctx.restore();
      if (t > A.pk_ever - .1) stamp('#1 EVER', 830, 640, t, A.pk_ever - .1, { col: '#d00000', size: 70, rot: .14 });
    } else {
      bossBar('DEEPSEEK SHOCK', t > A.pk_stop ? lerp(1, 0, prog(t, A.pk_stop, A.pk_stop + .4)) : 1, '#4361ee');
      card('JAN 2025 · ≈ −$590B IN ONE DAY', 540, 600, t, A.pk_deepseek + .3, { size: 38, bg: '#ffccd5' });
    }
    levelCard('LEVEL 6: DEEPSEEK SHOCK', t, A.pk_even - .12, .62);
  }
};

/* ---- scandal ---- */
SC.scandal = {
  sat: t => 1 - prog(t, sceneOf('scandal').t0 + .2, sceneOf('scandal').t0 + 2.2),
  world(t, lt) {
    vgrad('#3d405b', '#1d1e2c');
    for (let i = 0; i < 60; i++) { const x = (hash(i) * 1300 + t * 90) % 1300 - 100, y = (hash(i * 3) * 2100 + t * 1300 * (0.8 + hash(i) * .4)) % 2100 - 100; seg(x, y, x - 10, y + 50, 3, 'rgba(200,210,230,.35)'); }
    ctx.fillStyle = '#14151f'; ctx.fillRect(-400, 1290, W + 800, 900);
    jensen({ x: 540, y: 1310, s: 1.05, outfit: 'leather', pose: POSE.slump(t), bob: bobble(t, [[sceneOf('scandal').t0, .12]], 0, 1, .25) });
  },
  ui(t) {
    const S = sceneOf('scandal');
    // FINAL LEVEL glitch
    if (t < S.t0 + 1.3) { const d = t - S.t0; for (let i = 0; i < 3; i++) { const off = (hash(Math.floor(t * 24) + i) - .5) * 30;
      txt('FINAL LEVEL', W / 2 + off, 790 + i * 3, { size: 120, font: MONO, weight: 700, fill: ['#ff3b3b', '#3bf0ff', '#fff'][i], sw: i === 2 ? 10 : 0, alpha: (i === 2 ? 1 : .6) * clamp((1.3 - d) / .3) }); } }
    const news = (s, sub, y, t0) => { if (t < t0) return; const k = eOut(prog(t, t0, t0 + .3));
      ctx.save(); ctx.translate(lerp(W + 600, 540, k), y); ctx.rotate(-.015);
      rr(-470, -78, 940, 156, 6, '#f1ede4', 6); seg(-440, -30, 440, -30, 3, '#555');
      txt(sub, -440, -52, { size: 22, font: SERIF, weight: 700, fill: '#7a1c1c', sw: 0, align: 'left' });
      txt(s, 0, 22, { size: 40, font: SERIF, weight: 700, fill: INK, sw: 0, maxW: 900 }); ctx.restore(); };
    news('Reported target of a foreign spy effort', 'REPORTS · NOV 2026', 360, A.sc_reports - .05);
    news('China dismisses the claim as a smear', 'RESPONSE', 530, A.sc_china - .05);
    news('Huang admits affair, denies compromising Nvidia', 'NOV 2026', 700, A.sc_admitted - .05);
    news('Board investigates · NVDA ▼ ~8% after hours', 'NOV 11, 2026', 870, A.sc_affair + .45);
  }
};

/* ---- exit ---- */
SC.exit = {
  world(t, lt) {
    const S = sceneOf('exit'); const tEnd = A.ex_outEnd + .25;
    if (t < tEnd) {
      vgrad('#2b2d42', '#b5654a', 0, 1300);
      glow(540, 1150, 700, 'rgba(255,170,100,A)', .35);
      ctx.fillStyle = '#1b1c2a'; ctx.fillRect(-400, 1240, W + 800, 900);
      chipMountain(330, 1215, 7, 84, 46, 1, false);
      figure({ x: 160, y: 1300, s: .78, outfit: 'suit', color: '#6d597a', hair: 'long', hairCol: '#c9a26b', label: 'KRESS · INTERIM CEO', labelSize: 20, pose: POSE.idle(t), mouth: 'flat' });
      figure({ x: 430, y: 1300, s: .78, outfit: 'suit', hair: 'gray', glasses: true, label: 'JONES · BOARD CHAIR', labelSize: 20, pose: POSE.idle(t + 1), mouth: 'flat' });
      const k = prog(t, S.t0 + .3, A.ex_out + .2);
      const x = lerp(720, 1260, k);
      const prop = (hL, hR, neck, s) => { poly([[hL[0] - 10, hL[1] + 6], [hL[0] + 60, hL[1] + 10], [hL[0] + 70, hL[1] + 180], [hL[0] + 10, hL[1] + 190], [hL[0] - 20, hL[1] + 100]], OUTFIT.leather, 6); };
      jensen({ x, y: 1300, s: 1.0, outfit: 'tee', pose: walkShoulder(t), bob: bobble(t, [[S.t0, .2]], .14, 1.4, .3), prop });
    } else {
      // whip back to the empty summit (loops into frame 0)
      const k = eOut(prog(t, tEnd, tEnd + .45));
      ctx.save(); ctx.translate(0, lerp(-900, 0, k)); ctx.translate(W / 2, 900); ctx.scale(1.07, 1.07); ctx.translate(-W / 2, -900);
      hookWorld(t, false, 0); ctx.restore();
      if (k < 1) speedLines(.4 * (1 - k), 2);
    }
  },
  ui(t) {
    const S = sceneOf('exit'); const tEnd = A.ex_outEnd + .25;
    if (t < tEnd) {
      card('NOV 12, 2026\nRESIGNED AS CEO & LEFT THE BOARD', 540, 420, t, S.t0 + .15, { size: 40, bg: '#fff' });
    } else {
      const k = pop(t, tEnd + .35, .4);
      ctx.save(); ctx.translate(540, 560); ctx.scale(k, k);
      rr(-400, -110, 800, 220, 26, '#FFD60A', 8);
      txt('FOLLOW FOR MORE', 0, -36, { size: 64, fill: INK, sw: 0 }); txt('FOUNDER STORIES', 0, 44, { size: 64, fill: INK, sw: 0 });
      ctx.restore();
    }
  }
};

/* ---------------- master render ---------------- */
const NO_WHIP = { scandal: 1, exit: 1 };
function sceneIndexAt(t) { const S = TL.scenes; for (let i = S.length - 1; i >= 0; i--) if (t >= S[i].t0) return i; return 0; }
function drawWorld(i, t) {
  const sc = TL.scenes[i], def = SC[sc.id];
  ctx.save();
  if (sc.id === 'scandal') ctx.filter = `saturate(${SC.scandal.sat(t).toFixed(3)})`;
  def.world(t, t - sc.t0); ctx.restore();
}
function render(t) {
  BOIL = Math.floor(t * 10);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = 'none'; ctx.globalAlpha = 1;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const i = sceneIndexAt(t), sc = TL.scenes[i], lt = t - sc.t0;
  const [sx, sy] = shake(t); const z = 1 + punch(t);
  ctx.save(); ctx.translate(W / 2 + sx, H / 2 + sy); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
  const WHIP = .22;
  if (i > 0 && lt < WHIP && !NO_WHIP[sc.id]) {
    const k = eOut(lt / WHIP); const prev = TL.scenes[i - 1];
    ctx.save(); ctx.translate(-W * k, 0); drawWorld(i - 1, prev.t1 - .001); ctx.restore();
    ctx.save(); ctx.translate(W * (1 - k), 0); drawWorld(i, t); ctx.restore();
    speedLines(.55 * (1 - k), i);
  } else if (sc.id === 'exit' && lt < .5) {
    drawWorld(i - 1, TL.scenes[i - 1].t1 - .001); ctx.save(); ctx.globalAlpha = eIO(lt / .5); drawWorld(i, t); ctx.restore();
  } else drawWorld(i, t);
  ctx.restore();
  // UI layer (no camera)
  ctx.save(); ctx.translate(sx * .3, sy * .3);
  if (!(i > 0 && lt < WHIP && !NO_WHIP[sc.id])) SC[sc.id].ui(t, lt);
  hud(t, sc.id);
  ctx.restore();
  captions(t, sc.id);
}
window.render = render;
window.ready = (async () => {
  await document.fonts.load('900 80px Inter'); await document.fonts.load('800 30px Inter');
  await document.fonts.load("700 30px 'DejaVu Sans Mono'"); await document.fonts.load("700 30px 'DejaVu Serif'");
  if (!HEAD.complete) await new Promise(r => { HEAD.onload = r; HEAD.onerror = r; });
  return true;
})();
