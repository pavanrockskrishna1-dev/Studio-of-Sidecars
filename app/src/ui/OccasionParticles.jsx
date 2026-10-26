import { useEffect, useRef, useSyncExternalStore } from 'react';
import { subscribe, getSnapshot } from '../animation/occasionStore';
import { getOccasion } from '../animation/occasionDefs';

/* ==========================================================================
   OccasionParticles — canvas-2D seasonal particle overlay.

   Sits as a pointer-transparent layer above the Three.js canvas. Each
   particle type has its own init/update/draw logic. The RAF loop is driven
   entirely by this component; it does not touch the Three.js renderer.

   Particle types:
     bats       — Halloween: flapping bats drifting across the viewport
     snow       — Christmas: falling snowflakes with gentle sway
     fireworks  — Diwali: burst explosions with sparkling trails
     confetti   — New Year: tumbling colored rectangles + streamer trails
     hearts     — Valentine's: hearts floating upward
     petals     — Holi: colorful powder bursts and floating petals
     tricolor   — Republic Day: saffron/white/green confetti stream
     stars      — Eid: gold crescent stars drifting and twinkling
   ========================================================================== */

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));

// ─── BAT (Halloween) ────────────────────────────────────────────────────────
function makeBat(W, H) {
  return {
    x: rand(-80, W + 80),
    y: rand(H * 0.05, H * 0.65),
    vx: rand(0.4, 1.2) * (Math.random() < 0.5 ? 1 : -1),
    vy: rand(-0.15, 0.15),
    size: rand(14, 28),
    phase: rand(0, TAU),
    phaseSpeed: rand(5, 10),
    alpha: rand(0.55, 0.9),
  };
}

function drawBat(ctx, b, t) {
  const wing = Math.sin(b.phase + t * b.phaseSpeed) * b.size * 0.7;
  ctx.save();
  ctx.globalAlpha = b.alpha;
  ctx.fillStyle = '#1a0a2e';
  ctx.translate(b.x, b.y);
  if (b.vx < 0) ctx.scale(-1, 1);
  // body
  ctx.beginPath();
  ctx.ellipse(0, 0, b.size * 0.22, b.size * 0.16, 0, 0, TAU);
  ctx.fill();
  // left wing
  ctx.beginPath();
  ctx.moveTo(-b.size * 0.05, -b.size * 0.05);
  ctx.quadraticCurveTo(-b.size * 0.7, -wing * 0.9, -b.size * 1.1, 0);
  ctx.quadraticCurveTo(-b.size * 0.5, wing * 0.35, -b.size * 0.05, b.size * 0.1);
  ctx.fill();
  // right wing
  ctx.beginPath();
  ctx.moveTo(b.size * 0.05, -b.size * 0.05);
  ctx.quadraticCurveTo(b.size * 0.7, -wing * 0.9, b.size * 1.1, 0);
  ctx.quadraticCurveTo(b.size * 0.5, wing * 0.35, b.size * 0.05, b.size * 0.1);
  ctx.fill();
  // ears
  ctx.beginPath();
  ctx.moveTo(-b.size * 0.1, -b.size * 0.14);
  ctx.lineTo(-b.size * 0.2, -b.size * 0.34);
  ctx.lineTo(-b.size * 0.0, -b.size * 0.18);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(b.size * 0.1, -b.size * 0.14);
  ctx.lineTo(b.size * 0.2, -b.size * 0.34);
  ctx.lineTo(b.size * 0.0, -b.size * 0.18);
  ctx.fill();
  ctx.restore();
}

// ─── SNOWFLAKE (Christmas) ──────────────────────────────────────────────────
function makeSnowflake(W, H) {
  return {
    x: rand(0, W),
    y: rand(-20, H),
    r: rand(2, 6),
    vy: rand(0.5, 1.8),
    vx: rand(-0.3, 0.3),
    alpha: rand(0.5, 0.95),
    drift: rand(0, TAU),
    driftSpeed: rand(0.3, 0.8),
    driftAmp: rand(0.3, 1.2),
  };
}
function drawSnow(ctx, s, t) {
  ctx.save();
  ctx.globalAlpha = s.alpha;
  ctx.fillStyle = '#e0f2fe';
  ctx.beginPath();
  ctx.arc(s.x + Math.sin(s.drift + t * s.driftSpeed) * s.driftAmp, s.y, s.r, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// ─── FIREWORK (Diwali) ───────────────────────────────────────────────────────
const FIREWORK_COLORS = ['#fbbf24','#f97316','#ef4444','#a855f7','#22d3ee','#4ade80','#fb7185'];
function makeFirework(W, H) {
  return {
    x: rand(W * 0.15, W * 0.85),
    y: rand(H * 0.1, H * 0.55),
    sparks: Array.from({ length: 22 }, () => ({
      angle: rand(0, TAU),
      speed: rand(1.2, 4.5),
      life: 1,
      decay: rand(0.012, 0.025),
    })),
    color: FIREWORK_COLORS[randInt(0, FIREWORK_COLORS.length - 1)],
    life: 1,
    delay: rand(0, 3),
    born: false,
  };
}
function drawFirework(ctx, fw, dt) {
  if (fw.delay > 0) { fw.delay -= dt; return; }
  if (!fw.born) { fw.born = true; }
  ctx.save();
  for (const sp of fw.sparks) {
    if (sp.life <= 0) continue;
    sp.life -= sp.decay;
    const d = (1 - sp.life) * 80;
    const sx = fw.x + Math.cos(sp.angle) * d;
    const sy = fw.y + Math.sin(sp.angle) * d;
    ctx.globalAlpha = Math.max(0, sp.life) * 0.9;
    ctx.fillStyle = fw.color;
    const r = Math.max(0, sp.life) * 2.5; // life dips below 0 on its last frame
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, TAU);
    ctx.fill();
  }
  fw.life = fw.sparks.reduce((a, s) => Math.max(a, s.life), 0);
  ctx.restore();
}

// ─── CONFETTI (New Year) ─────────────────────────────────────────────────────
const CONFETTI_COLORS = ['#f59e0b','#ec4899','#8b5cf6','#10b981','#3b82f6','#ef4444','#fbbf24'];
function makeConfetti(W, H) {
  return {
    x: rand(0, W),
    y: rand(-40, -5),
    vx: rand(-1, 1),
    vy: rand(1.5, 3.5),
    rot: rand(0, TAU),
    rotSpeed: rand(-0.08, 0.08),
    w: rand(6, 12),
    h: rand(3, 7),
    color: CONFETTI_COLORS[randInt(0, CONFETTI_COLORS.length - 1)],
    alpha: rand(0.7, 1),
  };
}
function drawConfetti(ctx, c) {
  ctx.save();
  ctx.globalAlpha = c.alpha;
  ctx.fillStyle = c.color;
  ctx.translate(c.x, c.y);
  ctx.rotate(c.rot);
  ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
  ctx.restore();
}

// ─── HEART (Valentine's) ─────────────────────────────────────────────────────
function makeHeart(W, H) {
  return {
    x: rand(W * 0.1, W * 0.9),
    y: H + rand(10, 60),
    size: rand(10, 26),
    vy: rand(-0.8, -2.0),
    vx: rand(-0.3, 0.3),
    alpha: rand(0.5, 0.9),
    wobble: rand(0, TAU),
    wobbleSpeed: rand(0.5, 1.5),
    wobbleAmp: rand(0.3, 1.2),
    hue: randInt(330, 360),
  };
}
function drawHeart(ctx, h, t) {
  ctx.save();
  ctx.globalAlpha = h.alpha;
  ctx.fillStyle = `hsl(${h.hue}, 85%, 62%)`;
  const s = h.size;
  const wx = h.x + Math.sin(h.wobble + t * h.wobbleSpeed) * h.wobbleAmp;
  ctx.translate(wx, h.y);
  ctx.beginPath();
  ctx.moveTo(0, s * 0.3);
  ctx.bezierCurveTo(-s * 0.55, -s * 0.1, -s * 1.0, s * 0.15, -s * 0.55, s * 0.75);
  ctx.bezierCurveTo(-s * 0.15, s * 1.15, 0, s * 1.1, 0, s * 0.3);
  ctx.bezierCurveTo(0, s * 1.1, s * 0.15, s * 1.15, s * 0.55, s * 0.75);
  ctx.bezierCurveTo(s * 1.0, s * 0.15, s * 0.55, -s * 0.1, 0, s * 0.3);
  ctx.fill();
  ctx.restore();
}

// ─── PETAL (Holi) ───────────────────────────────────────────────────────────
const HOLI_COLORS = ['#f43f5e','#f97316','#eab308','#22c55e','#3b82f6','#a855f7','#ec4899'];
function makePetal(W, H) {
  return {
    x: rand(0, W),
    y: rand(-20, H * 0.8),
    size: rand(6, 16),
    vx: rand(-1.5, 1.5),
    vy: rand(0.4, 1.6),
    rot: rand(0, TAU),
    rotSpeed: rand(-0.05, 0.05),
    alpha: rand(0.5, 0.9),
    color: HOLI_COLORS[randInt(0, HOLI_COLORS.length - 1)],
  };
}
function drawPetal(ctx, p) {
  ctx.save();
  ctx.globalAlpha = p.alpha;
  ctx.fillStyle = p.color;
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.beginPath();
  ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// ─── TRICOLOR CONFETTI (Republic Day) ────────────────────────────────────────
const TRICOLOR = ['#ff9933','#ffffff','#138808'];
function makeTricolor(W, H) {
  return {
    x: rand(0, W),
    y: rand(-40, -5),
    vx: rand(-0.5, 0.5),
    vy: rand(1.2, 2.8),
    rot: rand(0, TAU),
    rotSpeed: rand(-0.06, 0.06),
    w: rand(7, 13),
    h: rand(3, 7),
    color: TRICOLOR[randInt(0, 2)],
    alpha: rand(0.7, 1),
  };
}

// ─── STAR (Eid) ──────────────────────────────────────────────────────────────
function makeStar(W, H) {
  return {
    x: rand(0, W),
    y: rand(0, H * 0.7),
    size: rand(4, 12),
    alpha: rand(0.3, 0.9),
    twinkle: rand(0, TAU),
    twinkleSpeed: rand(1.5, 3.5),
    vx: rand(-0.1, 0.1),
    vy: rand(-0.2, 0.0),
    color: Math.random() < 0.7 ? '#fbbf24' : '#e0e7ff',
  };
}
function drawStar(ctx, s, t) {
  const a = s.alpha * (0.4 + 0.6 * Math.abs(Math.sin(s.twinkle + t * s.twinkleSpeed)));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = s.color;
  ctx.translate(s.x, s.y);
  const r1 = s.size, r2 = s.size * 0.45, pts = 5;
  ctx.beginPath();
  for (let i = 0; i < pts * 2; i++) {
    const r = i % 2 === 0 ? r1 : r2;
    const angle = (i * Math.PI) / pts - Math.PI / 2;
    i === 0 ? ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r) : ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ─── PARTICLE SYSTEM CONFIG ──────────────────────────────────────────────────
const SYSTEMS = {
  bats: {
    count: 10,
    make: makeBat,
    update(p, W, H) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.vx > 0 && p.x > W + 100) { p.x = -100; p.y = rand(H * 0.05, H * 0.65); }
      if (p.vx < 0 && p.x < -100)    { p.x = W + 100; p.y = rand(H * 0.05, H * 0.65); }
    },
    draw: (ctx, p, t) => drawBat(ctx, p, t),
  },
  snow: {
    count: 55,
    make: makeSnowflake,
    update(p, W, H) {
      p.y += p.vy;
      p.x += p.vx;
      if (p.y > H + 20) { p.y = -10; p.x = rand(0, W); }
    },
    draw: (ctx, p, t) => drawSnow(ctx, p, t),
  },
  fireworks: {
    count: 6,
    make: makeFirework,
    update(p, W, H, dt) {
      if (p.life <= 0) {
        Object.assign(p, makeFirework(W, H));
      }
    },
    draw: (ctx, p, t, dt) => drawFirework(ctx, p, dt),
  },
  confetti: {
    count: 80,
    make: makeConfetti,
    update(p, W, H) {
      p.x += p.vx; p.y += p.vy; p.rot += p.rotSpeed;
      if (p.y > H + 20) { Object.assign(p, makeConfetti(W, H)); }
    },
    draw: (ctx, p) => drawConfetti(ctx, p),
  },
  hearts: {
    count: 20,
    make: makeHeart,
    update(p, W, H) {
      p.x += p.vx; p.y += p.vy;
      p.alpha -= 0.0015;
      if (p.y < -30 || p.alpha <= 0) {
        Object.assign(p, makeHeart(W, H));
      }
    },
    draw: (ctx, p, t) => drawHeart(ctx, p, t),
  },
  petals: {
    count: 50,
    make: makePetal,
    update(p, W, H) {
      p.x += p.vx; p.y += p.vy; p.rot += p.rotSpeed;
      if (p.y > H + 20) { Object.assign(p, makePetal(W, H)); p.y = -10; }
    },
    draw: (ctx, p) => drawPetal(ctx, p),
  },
  tricolor: {
    count: 90,
    make: makeTricolor,
    update(p, W, H) {
      p.x += p.vx; p.y += p.vy; p.rot += p.rotSpeed;
      if (p.y > H + 20) { Object.assign(p, makeTricolor(W, H)); }
    },
    draw: (ctx, p) => drawConfetti(ctx, p), // reuses confetti draw
  },
  stars: {
    count: 40,
    make: makeStar,
    update(p, W, H) {
      p.x += p.vx; p.y += p.vy;
      if (p.y < -20) { p.y = H * 0.7; p.x = rand(0, W); }
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
    },
    draw: (ctx, p, t) => drawStar(ctx, p, t),
  },
};

// ─── COMPONENT ──────────────────────────────────────────────────────────────
export default function OccasionParticles() {
  const { occasionId } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const canvasRef = useRef(null);
  const stateRef = useRef({ particles: [], system: null, rafId: null, lastT: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const st = stateRef.current;

    // Cancel any existing loop
    if (st.rafId) cancelAnimationFrame(st.rafId);
    st.particles = [];
    st.system = null;

    const occ = getOccasion(occasionId);
    const particleType = occ?.particles ?? null;
    const sys = SYSTEMS[particleType] ?? null;
    if (!sys) return; // 'none' or no particles defined

    // Size canvas to viewport — use window dimensions for a fixed full-viewport
    // canvas; offsetWidth is 0 at mount time before browser layout completes.
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Init particles
    const W = canvas.width, H = canvas.height;
    st.particles = Array.from({ length: sys.count }, () => sys.make(W, H));
    st.system = sys;
    st.lastT = performance.now() / 1000;

    function loop(nowMs) {
      const t = nowMs / 1000;
      const dt = Math.min(t - st.lastT, 0.1);
      st.lastT = t;
      const W2 = canvas.width, H2 = canvas.height;
      ctx.clearRect(0, 0, W2, H2);
      for (const p of st.particles) {
        sys.update(p, W2, H2, dt);
        sys.draw(ctx, p, t, dt);
      }
      st.rafId = requestAnimationFrame(loop);
    }
    st.rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(st.rafId);
      window.removeEventListener('resize', resize);
    };
  }, [occasionId]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        // above the stage and the occasion frame (5), below the studio's
        // panels and bars (8+), so bats never cover a button
        zIndex: 6,
      }}
      aria-hidden="true"
    />
  );
}
