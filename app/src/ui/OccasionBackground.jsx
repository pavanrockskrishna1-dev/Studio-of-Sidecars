import { useSyncExternalStore } from 'react';
import { subscribe, getSnapshot } from '../animation/occasionStore';

/* ==========================================================================
   OccasionBackground — themed 2D scene behind the Three.js canvas.

   Sits at z-index -1, behind the WebGL canvas (z-index 0). The canvas uses
   alpha: true so transparent WebGL pixels reveal this layer. When no occasion
   is active the layer shows the default studio dark (#050505), identical to
   the old canvas background, so there's zero visual change by default.

   Each occasion has an SVG-illustrated or gradient scene:
     halloween  — purple spooky night, crescent moon, dead trees, pumpkins
     christmas  — dark pine-forest silhouette, moon, falling snow sky
     diwali     — warm amber night with diya glow
     holi       — vivid colour-burst dark
     newyear    — midnight blue with star field
     valentine  — deep rose radial glow
     republic   — deep midnight with tricolor horizon glow
     eid        — deep indigo with crescent moon
   ========================================================================== */

/* The background overlay sits at z-index 5 — ABOVE the Three.js canvas (z-0)
   but BELOW the UI shell (z-8). It is a transparent SVG silhouette frame: sky
   elements at the top (moon, stars) and ground/edge elements at the bottom
   corners (pumpkins, trees), leaving the central viewport clear so the 3D bike
   renders through. When no occasion is active this renders nothing at all,
   preserving the studio's plain dark background. */
const WRAP = {
  position: 'fixed',
  inset: 0,
  zIndex: 5,
  overflow: 'hidden',
  pointerEvents: 'none',
};

const SVG_FULL = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
};

// ─── SVG OVERLAY SCENES ────────────────────────────────────────────────────
// Each scene is a FRAME OVERLAY: opaque sky/ground elements at the top and
// bottom corners, transparent in the central viewport so the 3D bike shows.
// The SVG sits at z-5, above the WebGL canvas (z-0), below the UI (z-8).

function ChristmasScene() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"
         preserveAspectRatio="xMidYMid slice" style={SVG_FULL}>
      <defs>
        <linearGradient id="xmas-sky-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#04090f" stopOpacity="1"/>
          <stop offset="100%" stopColor="#04090f" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="xmas-ground-bot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#020508" stopOpacity="0"/>
          <stop offset="100%" stopColor="#020508" stopOpacity="1"/>
        </linearGradient>
      </defs>
      {/* Sky band — top 30% fades to transparent */}
      <rect width="1000" height="300" fill="url(#xmas-sky-top)"/>
      {/* Stars */}
      {[[80,40],[180,20],[320,35],[450,15],[600,28],[720,12],[850,40],[950,22],
        [130,80],[280,65],[420,90],[560,72],[690,88],[820,60]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r={i%3===0?1.5:1} fill="#c8d8e8" opacity={0.4}/>
      ))}
      {/* Moon */}
      <circle cx="810" cy="90" r="48" fill="#ddd8b8" opacity="0.8"/>
      <circle cx="838" cy="77" r="43" fill="#04090f"/>
      {/* Dark clouds */}
      <ellipse cx="120" cy="85" rx="110" ry="24" fill="#0c1a28" opacity="0.9"/>
      <ellipse cx="480" cy="55" rx="140" ry="20" fill="#0c1a28" opacity="0.8"/>
      {/* Left foreground trees — from bottom-left corner up ~70% */}
      <g fill="#030a10">
        <polygon points="-20,1000 60,340 140,1000"/>
        <polygon points="100,1000 190,390 280,1000"/>
      </g>
      {/* Right foreground trees */}
      <g fill="#030a10">
        <polygon points="760,1000 850,310 940,1000"/>
        <polygon points="900,1000 985,370 1070,1000"/>
      </g>
      {/* Mid-ground trees (left edge) */}
      <g fill="#070f18" opacity="0.7">
        <polygon points="-40,1000 30,520 100,1000"/>
      </g>
      {/* Ground band — bottom 10% fades from transparent to opaque dark */}
      <rect x="0" y="900" width="1000" height="100" fill="url(#xmas-ground-bot)"/>
    </svg>
  );
}

function HalloweenScene() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"
         preserveAspectRatio="xMidYMid slice" style={SVG_FULL}>
      <defs>
        <radialGradient id="hw-vignette" cx="50%" cy="50%" r="80%">
          <stop offset="0%" stopColor="#1a0033" stopOpacity="0"/>
          <stop offset="70%" stopColor="#1a0033" stopOpacity="0"/>
          <stop offset="100%" stopColor="#0a0018" stopOpacity="0.7"/>
        </radialGradient>
        <linearGradient id="hw-sky-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#080014" stopOpacity="1"/>
          <stop offset="100%" stopColor="#080014" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="hw-gnd-bot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#08000c" stopOpacity="0"/>
          <stop offset="100%" stopColor="#08000c" stopOpacity="1"/>
        </linearGradient>
      </defs>
      {/* Edge vignette for mood */}
      <rect width="1000" height="1000" fill="url(#hw-vignette)"/>
      {/* Sky top band */}
      <rect width="1000" height="250" fill="url(#hw-sky-top)"/>
      {/* Stars */}
      {[[60,35],[200,18],[350,48],[520,12],[680,32],[840,10],[950,45],
        [130,95],[290,72],[440,108],[600,82],[750,100],[900,68]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r={1.2} fill="#cc99ff" opacity={0.35}/>
      ))}
      {/* Crescent moon — top right */}
      <circle cx="760" cy="100" r="58" fill="#f0e090" opacity="0.92"/>
      <circle cx="797" cy="82" r="53" fill="#080014"/>
      {/* Spider web — top left corner */}
      <g stroke="#4a0080" strokeWidth="0.9" fill="none" opacity="0.55"
         transform="translate(80,55)">
        <line x1="0" y1="0" x2="55" y2="55"/>
        <line x1="0" y1="0" x2="-55" y2="55"/>
        <line x1="0" y1="0" x2="0" y2="75"/>
        <line x1="0" y1="0" x2="65" y2="18"/>
        <line x1="0" y1="0" x2="-65" y2="18"/>
        <path d="M-10,10 Q0,8 10,10 Q12,20 0,21 Q-12,20 -10,10"/>
        <path d="M-20,20 Q0,16 20,20 Q24,38 0,40 Q-24,38 -20,20"/>
        <path d="M-32,32 Q0,26 32,32 Q38,58 0,62 Q-38,58 -32,32"/>
      </g>
      {/* Dead tree — left edge */}
      <g fill="#0a0018">
        <rect x="48" y="100" width="16" height="900"/>
        <polygon points="56,210 56,230 -20,150 8,145"/>
        <polygon points="56,280 56,300 130,220 100,215"/>
        <polygon points="56,170 56,185 -5,118 18,113"/>
        <polygon points="56,340 56,358 -15,292 12,287"/>
        <polygon points="-20,150 -20,165 -50,135 -25,130"/>
        <polygon points="130,220 130,235 160,198 138,195"/>
      </g>
      {/* Dead tree — right edge */}
      <g fill="#0a0018">
        <rect x="936" y="80" width="16" height="920"/>
        <polygon points="944,180 944,200 1020,118 990,113"/>
        <polygon points="944,250 944,270 870,188 898,183"/>
        <polygon points="944,140 944,158 1008,90 980,85"/>
        <polygon points="1020,118 1020,133 1052,100 1028,96"/>
        <polygon points="870,188 870,202 840,168 862,164"/>
      </g>
      {/* Ground band */}
      <rect x="0" y="870" width="1000" height="130" fill="url(#hw-gnd-bot)"/>
      {/* Jack-o-lantern — bottom left */}
      <g transform="translate(130,920)">
        <rect x="-5" y="-38" width="10" height="18" fill="#1a3300" opacity="0.9"/>
        <ellipse cx="0" cy="8" rx="42" ry="38" fill="#c44400"/>
        <ellipse cx="-12" cy="8" rx="9" ry="38" fill="#a33500" opacity="0.4"/>
        <polygon points="-24,-6 -13,-24 -2,-6" fill="#ff8800"/>
        <polygon points="2,-6 13,-24 24,-6" fill="#ff8800"/>
        <path d="M-16,16 L-10,6 L-4,14 L0,6 L4,14 L10,6 L16,16 Q0,30 -16,16" fill="#ff7700"/>
        <ellipse cx="0" cy="8" rx="60" ry="54" fill="#ff4400" opacity="0.12"/>
      </g>
      {/* Jack-o-lantern — bottom right */}
      <g transform="translate(845,928)">
        <rect x="-4" y="-34" width="9" height="16" fill="#1a3300" opacity="0.9"/>
        <ellipse cx="0" cy="6" rx="38" ry="34" fill="#bb3d00"/>
        <ellipse cx="-11" cy="6" rx="8" ry="34" fill="#9a2d00" opacity="0.4"/>
        <polygon points="-22,-5 -12,-22 -2,-5" fill="#ff7700"/>
        <polygon points="2,-5 12,-22 22,-5" fill="#ff7700"/>
        <path d="M-14,14 L-9,5 L-3,13 L0,5 L3,13 L9,5 L14,14 Q0,28 -14,14" fill="#ff6600"/>
        <ellipse cx="0" cy="6" rx="52" ry="46" fill="#ff4400" opacity="0.1"/>
      </g>
    </svg>
  );
}

function DiwaliScene() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"
         preserveAspectRatio="xMidYMid slice" style={SVG_FULL}>
      <defs>
        <linearGradient id="dw-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d0400" stopOpacity="1"/>
          <stop offset="100%" stopColor="#0d0400" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="dw-bot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d0600" stopOpacity="0"/>
          <stop offset="100%" stopColor="#0d0600" stopOpacity="1"/>
        </linearGradient>
      </defs>
      <rect width="1000" height="250" fill="url(#dw-top)"/>
      {/* Stars */}
      {[[100,35],[250,18],[400,42],[550,12],[700,30],[850,16],[950,38],
        [150,100],[300,80],[450,110],[610,85],[760,105],[900,75]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r={1.2} fill="#ffcc66" opacity={0.4}/>
      ))}
      {/* Crescent moon */}
      <circle cx="820" cy="100" r="44" fill="#ffd060" opacity="0.75"/>
      <circle cx="843" cy="86" r="40" fill="#0d0400"/>
      <rect x="0" y="900" width="1000" height="100" fill="url(#dw-bot)"/>
      {/* Diyas row at bottom */}
      {[[80,942],[220,945],[380,940],[500,943],[620,941],[760,945],[900,940]].map(([x,y],i) => (
        <g key={i} transform={`translate(${x},${y})`}>
          <ellipse cx="0" cy="4" rx="12" ry="7" fill="#cc6600"/>
          <ellipse cx="0" cy="0" rx="12" ry="5" fill="#ff9900"/>
          <ellipse cx="0" cy="-8" rx="2.5" ry="6" fill="#ffcc00" opacity="0.9"/>
          <ellipse cx="0" cy="-10" rx="1.5" ry="4" fill="#fff" opacity="0.6"/>
          <ellipse cx="0" cy="0" rx="28" ry="20" fill="#ff7700" opacity="0.08"/>
        </g>
      ))}
    </svg>
  );
}

function HoliScene() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"
         preserveAspectRatio="xMidYMid slice" style={SVG_FULL}>
      {/* Powder bursts at edges only */}
      <ellipse cx="80"  cy="150" rx="160" ry="80"  fill="#ff006e" opacity="0.2"/>
      <ellipse cx="920" cy="200" rx="160" ry="90"  fill="#fb5607" opacity="0.17"/>
      <ellipse cx="150" cy="850" rx="180" ry="80"  fill="#06d6a0" opacity="0.18"/>
      <ellipse cx="850" cy="820" rx="180" ry="90"  fill="#118ab2" opacity="0.16"/>
      <ellipse cx="500" cy="50"  rx="300" ry="60"  fill="#ffbe0b" opacity="0.14"/>
      <ellipse cx="500" cy="960" rx="300" ry="60"  fill="#9b5de5" opacity="0.15"/>
    </svg>
  );
}

function NewYearScene() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"
         preserveAspectRatio="xMidYMid slice" style={SVG_FULL}>
      <defs>
        <linearGradient id="ny-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#000820" stopOpacity="1"/>
          <stop offset="100%" stopColor="#000820" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="ny-bot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#000410" stopOpacity="0"/>
          <stop offset="100%" stopColor="#000410" stopOpacity="1"/>
        </linearGradient>
      </defs>
      <rect width="1000" height="220" fill="url(#ny-top)"/>
      {Array.from({ length: 40 }, (_, i) => {
        const x = (i * 137 + 50) % 1000;
        const y = (i * 79 + 10) % 160;
        return <circle key={i} cx={x} cy={y} r={i%7===0?1.6:0.9} fill="#c0d0e8" opacity={0.3}/>;
      })}
      {/* Firework bursts — top area */}
      <circle cx="180" cy="160" r="70" fill="none" stroke="#ffd700" strokeWidth="1.2" opacity="0.18"/>
      <circle cx="700" cy="120" r="60" fill="none" stroke="#ff6060" strokeWidth="1.2" opacity="0.18"/>
      <circle cx="450" cy="200" r="55" fill="none" stroke="#60ffb0" strokeWidth="1.2" opacity="0.14"/>
      {/* City skyline silhouette at bottom edges */}
      <g fill="#020810">
        <rect x="0"   y="820" width="60" height="180"/>
        <rect x="10"  y="780" width="30" height="40"/>
        <rect x="65"  y="840" width="50" height="160"/>
        <rect x="72"  y="800" width="12" height="40"/>
        <rect x="870" y="830" width="60" height="170"/>
        <rect x="882" y="790" width="13" height="40"/>
        <rect x="935" y="820" width="65" height="180"/>
        <rect x="948" y="775" width="14" height="45"/>
      </g>
      <rect x="0" y="910" width="1000" height="90" fill="url(#ny-bot)"/>
    </svg>
  );
}

function ValentineScene() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"
         preserveAspectRatio="xMidYMid slice" style={SVG_FULL}>
      <defs>
        <radialGradient id="val-edge" cx="50%" cy="50%" r="80%">
          <stop offset="0%" stopColor="#3d0014" stopOpacity="0"/>
          <stop offset="65%" stopColor="#1f000a" stopOpacity="0"/>
          <stop offset="100%" stopColor="#0d0005" stopOpacity="0.8"/>
        </radialGradient>
        <linearGradient id="val-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#200008" stopOpacity="0.9"/>
          <stop offset="100%" stopColor="#200008" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <rect width="1000" height="1000" fill="url(#val-edge)"/>
      <rect width="1000" height="200" fill="url(#val-top)"/>
      {/* Floating hearts — top */}
      {[[100,60],[300,30],[500,50],[700,25],[900,55]].map(([x,y],i) => (
        <path key={i} d={`M${x},${y+8} C${x-10},${y-2} ${x-18},${y+12} ${x},${y+22} C${x+18},${y+12} ${x+10},${y-2} ${x},${y+8}`}
              fill="#ff4466" opacity={0.15+i*0.05}/>
      ))}
    </svg>
  );
}

function RepublicScene() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"
         preserveAspectRatio="xMidYMid slice" style={SVG_FULL}>
      <defs>
        <linearGradient id="rep-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#030604" stopOpacity="1"/>
          <stop offset="100%" stopColor="#030604" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="rep-bot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#030503" stopOpacity="0"/>
          <stop offset="60%" stopColor="#ff9933" stopOpacity="0.04"/>
          <stop offset="75%" stopColor="#ffffff" stopOpacity="0.02"/>
          <stop offset="90%" stopColor="#138808" stopOpacity="0.04"/>
          <stop offset="100%" stopColor="#030503" stopOpacity="1"/>
        </linearGradient>
      </defs>
      <rect width="1000" height="250" fill="url(#rep-top)"/>
      {[[80,55],[200,30],[380,68],[520,22],[670,52],[820,28],[940,60]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r={1.2} fill="#ffe0a0" opacity={0.3}/>
      ))}
      <rect x="0" y="850" width="1000" height="150" fill="url(#rep-bot)"/>
    </svg>
  );
}

function EidScene() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"
         preserveAspectRatio="xMidYMid slice" style={SVG_FULL}>
      <defs>
        <linearGradient id="eid-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#030810" stopOpacity="1"/>
          <stop offset="100%" stopColor="#030810" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="eid-bot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#020608" stopOpacity="0"/>
          <stop offset="100%" stopColor="#020608" stopOpacity="1"/>
        </linearGradient>
      </defs>
      <rect width="1000" height="260" fill="url(#eid-top)"/>
      {Array.from({ length: 35 }, (_, i) => {
        const x = (i * 173 + 40) % 1000;
        const y = (i * 97 + 15) % 190;
        return <circle key={i} cx={x} cy={y} r={i%5===0?1.6:0.9} fill="#d4e8ff" opacity={0.28}/>;
      })}
      {/* Crescent + star — top left */}
      <circle cx="220" cy="100" r="72" fill="#f5d87a" opacity="0.88"/>
      <circle cx="262" cy="80"  r="65" fill="#030810"/>
      <polygon points="295,60 298,70 309,70 300,76 303,86 295,80 287,86 290,76 281,70 292,70"
               fill="#f5d87a" opacity="0.75"/>
      {/* Mosque silhouette at bottom edges */}
      <g fill="#030810">
        {/* Left mosque */}
        <ellipse cx="120" cy="940" rx="85" ry="55"/>
        <rect x="35" y="940" width="170" height="60"/>
        <rect x="18" y="900" width="18" height="100"/>
        <ellipse cx="27" cy="900" rx="12" ry="8"/>
        <polygon points="27,888 32,900 22,900"/>
        <rect x="178" y="900" width="18" height="100"/>
        <ellipse cx="187" cy="900" rx="12" ry="8"/>
        <polygon points="187,888 192,900 182,900"/>
        {/* Right mosque */}
        <ellipse cx="880" cy="940" rx="85" ry="55"/>
        <rect x="795" y="940" width="170" height="60"/>
        <rect x="778" y="900" width="18" height="100"/>
        <ellipse cx="787" cy="900" rx="12" ry="8"/>
        <polygon points="787,888 792,900 782,900"/>
        <rect x="938" y="900" width="18" height="100"/>
        <ellipse cx="947" cy="900" rx="12" ry="8"/>
        <polygon points="947,888 952,900 942,900"/>
      </g>
      <rect x="0" y="950" width="1000" height="50" fill="url(#eid-bot)"/>
    </svg>
  );
}

// ─── BACKGROUND MAP ──────────────────────────────────────────────────────────

const SCENES = {
  halloween:  HalloweenScene,
  christmas:  ChristmasScene,
  diwali:     DiwaliScene,
  holi:       HoliScene,
  newyear:    NewYearScene,
  valentine:  ValentineScene,
  republic:   RepublicScene,
  eid:        EidScene,
};

// ─── COMPONENT ──────────────────────────────────────────────────────────────

export default function OccasionBackground() {
  const { occasionId } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  if (occasionId === 'none') {
    return <div style={{ ...WRAP, background: '#050505' }} aria-hidden="true" />;
  }

  const Scene = SCENES[occasionId];
  if (!Scene) {
    return <div style={{ ...WRAP, background: '#050505' }} aria-hidden="true" />;
  }

  return (
    <div style={WRAP} aria-hidden="true">
      <Scene />
    </div>
  );
}
