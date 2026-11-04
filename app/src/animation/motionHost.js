let iframeReady = null;

export function ensureKinema() {
  if (iframeReady) return iframeReady;
  iframeReady = new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.src = "/kinema/index.html";
    iframe.style.display = "none";
    iframe.style.width = "10px";
    iframe.style.height = "10px";
    
    iframe.onload = () => {
      const win = iframe.contentWindow;
      const doc = iframe.contentDocument;
      
      const check = () => {
        if (win.KINEMA && doc.fonts) {
          doc.fonts.ready.then(() => resolve(win.KINEMA));
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    };
    iframe.onerror = reject;
    document.body.appendChild(iframe);
  });
  return iframeReady;
}

export async function listMotionTemplates() {
  const K = await ensureKinema();
  const list = [];
  
  for (const b of K.BUILTINS) {
    if (b.name === "Blank") continue;
    const texts = b.project.layers.filter(l => l.type === "text").map(l => l.text);
    list.push({ id: "b:" + b.name, label: b.name, dur: b.project.dur, texts });
  }
  for (const o of K.OCCASIONS) {
    const texts = o.project.layers.filter(l => l.type === "text").map(l => l.text);
    list.push({ id: "o:" + o.name, label: o.name, dur: o.project.dur, texts });
  }
  return list;
}

export async function makeMotionRun({ id, texts, clear, w, h }) {
  const K = await ensureKinema();
  
  // Find project
  let P_orig;
  if (id.startsWith("b:")) {
    const name = id.slice(2);
    P_orig = K.BUILTINS.find(b => b.name === name)?.project;
  } else if (id.startsWith("o:")) {
    const name = id.slice(2);
    P_orig = K.OCCASIONS.find(o => o.name === name)?.project;
  }
  if (!P_orig) throw new Error("Motion template not found: " + id);
  
  // Clone project
  const P = JSON.parse(JSON.stringify(P_orig));
  
  P.w = 1080;
  P.h = 1920;
  P.fps = 30;
  if (clear) {
    P.bg = "rgba(0,0,0,0)";
  }
  
  // Apply texts
  if (texts && Array.isArray(texts)) {
    const textLayers = P.layers.filter(l => l.type === "text");
    for (let i = 0; i < textLayers.length && i < texts.length; i++) {
      if (texts[i] !== undefined && texts[i] !== null) {
        textLayers[i].text = texts[i];
      }
    }
  }
  
  // Preload fonts
  const iframe = document.querySelector('iframe[src="/kinema/index.html"]');
  const doc = iframe.contentDocument;
  
  const textLayers = P.layers.filter(l => l.type === "text");
  for (const l of textLayers) {
    if (l.font) {
      try {
        await doc.fonts.load(`12px "${l.font}"`);
      } catch (e) {}
    }
  }
  
  const canvas = doc.createElement("canvas");
  canvas.width = P.w;
  canvas.height = P.h;
  const ctx = canvas.getContext("2d");
  
  K.seed(1234);
  
  return {
    dur: P.dur,
    draw(outCtx, t) {
      ctx.clearRect(0, 0, P.w, P.h);
      K.renderProject(ctx, P, t);
      outCtx.drawImage(canvas, 0, 0, w, h);
    }
  };
}
