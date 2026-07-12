import * as THREE from 'three';

export function buildBoardTexture(): THREE.CanvasTexture | null {
  const SIZE = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const R = SIZE / 2 - 1;
  const r = (f: number) => R * f;

  const sector = (ir: number, or: number, a0: number, a1: number, fill: string) => {
    ctx.beginPath();
    ctx.arc(cx, cy, or, a0, a1);
    ctx.arc(cx, cy, ir, a1, a0, true);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };

  const ring = (ir: number, or: number, fill: string) => {
    ctx.beginPath();
    ctx.arc(cx, cy, or, 0, Math.PI * 2);
    if (ir > 0) ctx.arc(cx, cy, ir, Math.PI * 2, 0, true);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = '#060504';
  ctx.fillRect(0, 0, SIZE, SIZE);

  const SECTORS = 12;
  const ROT = -Math.PI / 2;

  const KINGDOMS: readonly [string, string, string][] = [
    ['#2a7854', '#216653', '#368a66'],
    ['#904818', '#782a0c', '#a85a24'],
    ['#542484', '#3c186c', '#661e9c'],
    ['#245e3c', '#184830', '#307248'],
  ];

  const TERRAIN_RINGS = [
    { ir: 0.21, or: 0.42, shade: 1.15 },
    { ir: 0.42, or: 0.6, shade: 1.0 },
    { ir: 0.6, or: 0.75, shade: 0.85 },
  ];

  for (const tring of TERRAIN_RINGS) {
    for (let s = 0; s < SECTORS; s++) {
      const ki = Math.floor((s * 4) / SECTORS);
      const si = s % 3;
      const a0 = ROT + (s / SECTORS) * Math.PI * 2;
      const a1 = ROT + ((s + 1) / SECTORS) * Math.PI * 2;
      sector(r(tring.ir), r(tring.or), a0, a1, scaleColor(KINGDOMS[ki][si], tring.shade));
    }
  }

  for (let s = 0; s < SECTORS; s++) {
    const a = ROT + (s / SECTORS) * Math.PI * 2;
    const isKingdom = s % 3 === 0;
    ctx.beginPath();
    ctx.moveTo(cx + r(0.21) * Math.cos(a), cy + r(0.21) * Math.sin(a));
    ctx.lineTo(cx + r(0.75) * Math.cos(a), cy + r(0.75) * Math.sin(a));
    ctx.strokeStyle = isKingdom ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.45)';
    ctx.lineWidth = isKingdom ? 2.5 : 1.5;
    ctx.stroke();
  }

  ring(r(0.1), r(0.21), '#190a0a');
  const innerGrad = ctx.createRadialGradient(cx, cy, r(0.1), cx, cy, r(0.21));
  innerGrad.addColorStop(0, 'rgba(100,30,10,0.35)');
  innerGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.arc(cx, cy, r(0.21), 0, Math.PI * 2);
  ctx.arc(cx, cy, r(0.1), Math.PI * 2, 0, true);
  ctx.fillStyle = innerGrad;
  ctx.fill();

  ring(0, r(0.1), '#060404');
  const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r(0.1));
  centerGrad.addColorStop(0, 'rgba(60,20,8,0.6)');
  centerGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.arc(cx, cy, r(0.1), 0, Math.PI * 2);
  ctx.fillStyle = centerGrad;
  ctx.fill();

  ring(r(0.75), r(0.9), '#0c0908');
  const skullBaseR = r(0.825);
  const skullSize = r(0.038);
  for (let s = 0; s < SECTORS; s++) {
    const a = ROT + ((s + 0.5) / SECTORS) * Math.PI * 2;
    drawSkullMotif(
      ctx,
      cx + skullBaseR * Math.cos(a),
      cy + skullBaseR * Math.sin(a),
      skullSize,
      a + Math.PI / 2,
    );
  }

  ring(r(0.9), R, '#050403');

  ctx.strokeStyle = 'rgba(80,40,15,0.25)';
  ctx.lineWidth = 1;
  for (const rf of [0.1, 0.21, 0.42, 0.6, 0.75, 0.9] as const) {
    ctx.beginPath();
    ctx.arc(cx, cy, r(rf), 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function scaleColor(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.round(((n >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.round((n & 0xff) * factor));
  return `rgb(${r},${g},${b})`;
}

function drawSkullMotif(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rotation: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  const alpha = 0.55;
  const strokeAlpha = alpha * 0.6;

  ctx.beginPath();
  ctx.ellipse(0, -size * 0.15, size * 0.65, size * 0.6, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(90,55,30,${alpha})`;
  ctx.fill();
  ctx.strokeStyle = `rgba(120,70,35,${strokeAlpha})`;
  ctx.lineWidth = size * 0.1;
  ctx.stroke();

  ctx.fillStyle = `rgba(8,4,4,${Math.min(1, alpha + 0.3)})`;
  ctx.beginPath();
  ctx.ellipse(-size * 0.24, -size * 0.2, size * 0.17, size * 0.19, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(size * 0.24, -size * 0.2, size * 0.17, size * 0.19, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, -size * 0.05);
  ctx.lineTo(-size * 0.1, size * 0.05);
  ctx.lineTo(size * 0.1, size * 0.05);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = `rgba(75,45,25,${alpha})`;
  ctx.fillRect(-size * 0.52, size * 0.2, size * 1.04, size * 0.38);
  ctx.strokeStyle = `rgba(100,60,30,${strokeAlpha})`;
  ctx.lineWidth = size * 0.08;
  ctx.strokeRect(-size * 0.52, size * 0.2, size * 1.04, size * 0.38);

  ctx.fillStyle = `rgba(6,3,3,${Math.min(1, alpha + 0.3)})`;
  for (let i = -1; i <= 1; i++) {
    ctx.fillRect(i * size * 0.3 - size * 0.08, size * 0.22, size * 0.15, size * 0.22);
  }

  ctx.restore();
}
