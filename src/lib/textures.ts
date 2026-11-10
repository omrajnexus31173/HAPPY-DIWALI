import * as THREE from "three";

/** Small helper to build a canvas texture once and reuse it. */
function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  return [c, ctx];
}

function finish(c: HTMLCanvasElement, repeat = 1): THREE.Texture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

/** Soft radial spark used by the additive particle system. */
export function sparkTexture(): THREE.Texture {
  const [c, ctx] = makeCanvas(128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.18, "rgba(255,255,255,0.85)");
  g.addColorStop(0.42, "rgba(255,255,255,0.28)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return finish(c);
}

/** Four-point star flare for big glitter particles. */
export function flareTexture(): THREE.Texture {
  const [c, ctx] = makeCanvas(128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 40);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.5, "rgba(255,255,255,0.25)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineCap = "round";
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    ctx.lineWidth = i % 2 === 0 ? 5 : 3;
    ctx.beginPath();
    ctx.moveTo(64, 64);
    ctx.lineTo(64 + Math.cos(a) * 62, 64 + Math.sin(a) * 62);
    ctx.stroke();
  }
  return finish(c);
}

/** Puffy smoke sprite. */
export function smokeTexture(): THREE.Texture {
  const [c, ctx] = makeCanvas(128);
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, "rgba(255,255,255,0.55)");
  g.addColorStop(0.45, "rgba(255,255,255,0.22)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  ctx.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 26; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 20 + Math.random() * 42;
    const rr = 6 + Math.random() * 16;
    const gg = ctx.createRadialGradient(
      64 + Math.cos(a) * r,
      64 + Math.sin(a) * r,
      0,
      64 + Math.cos(a) * r,
      64 + Math.sin(a) * r,
      rr
    );
    gg.addColorStop(0, "rgba(0,0,0,0.35)");
    gg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gg;
    ctx.fillRect(0, 0, 128, 128);
  }
  return finish(c);
}

/** Teardrop diya flame (billboard). */
export function flameTexture(): THREE.Texture {
  const [c, ctx] = makeCanvas(128);
  const g = ctx.createRadialGradient(64, 78, 2, 64, 70, 52);
  g.addColorStop(0, "rgba(255,255,245,1)");
  g.addColorStop(0.16, "rgba(255,238,170,0.95)");
  g.addColorStop(0.4, "rgba(255,168,44,0.6)");
  g.addColorStop(0.72, "rgba(255,102,10,0.2)");
  g.addColorStop(1, "rgba(255,60,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(64, 6);
  ctx.bezierCurveTo(104, 52, 108, 100, 64, 124);
  ctx.bezierCurveTo(20, 100, 24, 52, 64, 6);
  ctx.closePath();
  ctx.fill();
  return finish(c);
}

/** Warm lantern paper. */
export function lanternTexture(): THREE.Texture {
  const [c, ctx] = makeCanvas(128);
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, "#8c2b0d");
  g.addColorStop(0.35, "#ff9a2e");
  g.addColorStop(0.7, "#ffd27a");
  g.addColorStop(1, "#fff3c4");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = "#5a1c05";
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo((i * 128) / 8, 0);
    ctx.lineTo((i * 128) / 8, 128);
    ctx.stroke();
  }
  return finish(c);
}

/** Marigold blossom sprite. */
export function marigoldTexture(): THREE.Texture {
  const [c, ctx] = makeCanvas(128);
  ctx.clearRect(0, 0, 128, 128);
  const petals = 18;
  for (let ring = 0; ring < 3; ring++) {
    const rad = 52 - ring * 14;
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2 + ring * 0.3;
      const x = 64 + Math.cos(a) * rad * 0.62;
      const y = 64 + Math.sin(a) * rad * 0.62;
      const g = ctx.createRadialGradient(x, y, 1, x, y, rad * 0.52);
      g.addColorStop(0, ring === 2 ? "#fff0a8" : "#ffc23c");
      g.addColorStop(0.6, ring === 0 ? "#f97316" : "#fb9d16");
      g.addColorStop(1, "rgba(196,62,4,0.15)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, rad * 0.42, rad * 0.3, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return finish(c);
}

/** Polished courtyard marble with inlaid grid. */
export function floorTexture(): THREE.Texture {
  const [c, ctx] = makeCanvas(512);
  ctx.fillStyle = "#0a0a18";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = Math.random() * 26 + 4;
    ctx.globalAlpha = 0.03 + Math.random() * 0.05;
    ctx.fillStyle = Math.random() > 0.5 ? "#2b2350" : "#151a3a";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "rgba(214,168,90,0.20)";
  ctx.lineWidth = 2;
  for (let i = 0; i <= 4; i++) {
    ctx.beginPath();
    ctx.moveTo((i * 512) / 4, 0);
    ctx.lineTo((i * 512) / 4, 512);
    ctx.moveTo(0, (i * 512) / 4);
    ctx.lineTo(512, (i * 512) / 4);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(214,168,90,0.09)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 8; i++) {
    ctx.beginPath();
    ctx.moveTo((i * 512) / 8, 0);
    ctx.lineTo((i * 512) / 8, 512);
    ctx.moveTo(0, (i * 512) / 8);
    ctx.lineTo(512, (i * 512) / 8);
    ctx.stroke();
  }
  return finish(c, 26);
}

/** Glowing rangoli mandala used on the studio plate + grand plaza. */
export function rangoliTexture(size = 1024): THREE.Texture {
  const [c, ctx] = makeCanvas(size);
  const R = size / 2;
  ctx.clearRect(0, 0, size, size);
  ctx.translate(R, R);
  const cols = ["#ff2e88", "#ffb020", "#22e0c8", "#8b5cf6", "#ff6a00", "#ffe66d"];
  const petals = 16;
  for (let ring = 6; ring >= 1; ring--) {
    const rad = (R * ring) / 6.6;
    ctx.strokeStyle = cols[ring % cols.length];
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = size / 220;
    ctx.beginPath();
    ctx.arc(0, 0, rad, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2 + ring * 0.19;
      ctx.save();
      ctx.rotate(a);
      ctx.fillStyle = cols[(ring + i) % cols.length];
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.ellipse(rad, 0, rad * 0.14, rad * 0.062, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.rotate((i / 8) * Math.PI * 2);
    ctx.strokeStyle = "#ffd166";
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = size / 180;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(R * 0.28, R * 0.16, R * 0.52, 0);
    ctx.quadraticCurveTo(R * 0.28, -R * 0.16, 0, 0);
    ctx.stroke();
    ctx.restore();
  }
  const g = ctx.createRadialGradient(0, 0, 2, 0, 0, R * 0.2);
  g.addColorStop(0, "rgba(255,240,190,0.95)");
  g.addColorStop(1, "rgba(255,120,0,0)");
  ctx.globalAlpha = 1;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.2, 0, Math.PI * 2);
  ctx.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

/** Lakshmi footprint (pair) sprite. */
export function footprintTexture(): THREE.Texture {
  const [c, ctx] = makeCanvas(128);
  ctx.clearRect(0, 0, 128, 128);
  ctx.fillStyle = "#ffd9a0";
  const drawFoot = (ox: number, flip: number) => {
    ctx.save();
    ctx.translate(ox, 74);
    ctx.scale(flip, 1);
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-1, 24, 11, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 5; i++) {
      const s = 5.4 - i * 0.6;
      ctx.beginPath();
      ctx.ellipse(-13 + i * 6.4, -28 - Math.sin((i / 4) * Math.PI) * 6, s, s * 1.15, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };
  drawFoot(42, 1);
  drawFoot(90, -1);
  return finish(c);
}

export function disposeTextures(list: THREE.Texture[]) {
  list.forEach((t) => t.dispose());
}
