let iframeReady = null;

export function ensureKinema() {
  if (iframeReady) return iframeReady;
  iframeReady = new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.src = "/kinema/index.html";
    iframe.style.display = "none";
    iframe.style.width = "10px";
    iframe.style.height = "10px";
    
    iframe.onload = async () => {
      const win = iframe.contentWindow;
      const doc = iframe.contentDocument;
      
      const check = async () => {
        if (win.KINEMA && doc.fonts) {
          try {
            const res = await fetch("/motion/manifest.json");
            const ids = res.ok ? await res.json() : [];
            for (const id of ids) {
              await new Promise((resScript, rejScript) => {
                const s = doc.createElement("script");
                s.src = `/motion/${id}.js`;
                s.onload = resScript;
                s.onerror = resScript; // proceed on error
                doc.body.appendChild(s);
              });
            }
          } catch(e) {}
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
  
  const iframe = document.querySelector('iframe[src="/kinema/index.html"]');
  const win = iframe?.contentWindow;
  if (win && win.KINEMA_TEMPLATES) {
    for (const t of win.KINEMA_TEMPLATES) {
      const texts = (t.fields || []).map(f => f.default);
      const fieldLabels = (t.fields || []).map(f => f.label);
      list.push({ id: "t:" + t.id, label: t.label, dur: t.dur, texts, fieldLabels });
    }
  }

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
  
  let P_orig;
  if (id.startsWith("t:")) {
    const tId = id.slice(2);
    const iframe = document.querySelector('iframe[src="/kinema/index.html"]');
    const win = iframe?.contentWindow;
    const tmpl = (win?.KINEMA_TEMPLATES || []).find(t => t.id === tId);
    if (!tmpl) throw new Error("Unknown template id: " + id);
    
    const fieldsObj = {};
    (tmpl.fields || []).forEach((f, i) => {
      const val = (texts && texts[i] !== undefined && texts[i] !== "") ? texts[i] : f.default;
      fieldsObj[f.key] = val;
    });
    
    P_orig = tmpl.build(fieldsObj, K);
  } else if (id.startsWith("b:")) {
    const name = id.slice(2);
    P_orig = K.BUILTINS.find(b => b.name === name)?.project;
  } else if (id.startsWith("o:")) {
    const name = id.slice(2);
    P_orig = K.OCCASIONS.find(o => o.name === name)?.project;
  }
  if (!P_orig) throw new Error("Motion template not found: " + id);
  
  const P = JSON.parse(JSON.stringify(P_orig));
  
  P.w = 1080;
  P.h = 1920;
  P.fps = 30;
  
  if (id.startsWith("t:")) {
    const tId = id.slice(2);
    const iframe = document.querySelector('iframe[src="/kinema/index.html"]');
    const win = iframe?.contentWindow;
    const tmpl = (win?.KINEMA_TEMPLATES || []).find(t => t.id === tId);
    if (clear || (tmpl && tmpl.kind === "overlay")) {
      P.bg = "rgba(0,0,0,0)";
    }
  } else {
    if (clear) {
      P.bg = "rgba(0,0,0,0)";
    }
    if (texts && Array.isArray(texts)) {
      const textLayers = P.layers.filter(l => l.type === "text");
      for (let i = 0; i < textLayers.length && i < texts.length; i++) {
        if (texts[i] !== undefined && texts[i] !== null) {
          textLayers[i].text = texts[i];
        }
      }
    }
  }
  
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
