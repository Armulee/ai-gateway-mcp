'use client';

import { gsap } from 'gsap';
import { useEffect, useRef } from 'react';

// Small generative pieces, one per tool, drawn on a 2D canvas. They only
// animate while visible, and render a single still frame under reduced motion.

export type ToolArtVariant = 'catalog' | 'text' | 'image' | 'video' | 'reel';

const FG = '237, 237, 237';
const ACCENT = '#ffffff';
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

const hash = (n: number) => {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
};

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void;

const draws: Record<ToolArtVariant, Draw> = {
  // A grid of models with a filter sweeping across and picking matches.
  catalog(ctx, w, h, t) {
    const cols = 16;
    const rows = 10;
    const gx = w / (cols + 1);
    const gy = h / (rows + 1);
    const scan = ((t * 0.18) % 1.3) * w;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = gx * (c + 1);
        const y = gy * (r + 1);
        const pick = hash(r * 31 + c) > 0.78 && x < scan;
        const near = Math.max(0, 1 - Math.abs(x - scan) / 40);
        ctx.fillStyle = pick ? ACCENT : `rgba(${FG}, ${0.16 + near * 0.6})`;
        ctx.beginPath();
        ctx.arc(x, y, pick ? 3.2 : 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = `rgba(${FG}, 0.5)`;
    ctx.fillRect(scan, gy * 0.5, 1, h - gy);
  },

  // Tokens streaming out line by line, with a cursor at the frontier.
  text(ctx, w, h, t) {
    const rows = 7;
    const pad = w * 0.08;
    const lineH = (h - pad * 2) / rows;
    const cycle = (t * 0.32) % (rows * 0.22 + 0.8);
    for (let r = 0; r < rows; r++) {
      const progress = Math.min(1, Math.max(0, (cycle - r * 0.22) / 0.22));
      let x = pad;
      const y = pad + r * lineH + lineH * 0.3;
      const limit = pad + (w - pad * 2) * (r === rows - 1 ? 0.55 : 1) * progress;
      for (let k = 0; x < limit; k++) {
        const tw = 14 + hash(r * 97 + k) * 46;
        const width = Math.min(tw, limit - x);
        ctx.fillStyle = hash(r * 13 + k * 7) > 0.9 ? ACCENT : `rgba(${FG}, 0.55)`;
        ctx.fillRect(x, y, width, lineH * 0.34);
        x += tw + 7;
      }
      if (progress > 0 && progress < 1) {
        ctx.fillStyle = ACCENT;
        ctx.fillRect(limit + 3, y - 3, 3, lineH * 0.34 + 6);
      }
    }
  },

  // An ordered-dither field: an image resolving out of noise.
  image(ctx, w, h, t) {
    const cell = 6;
    const cx = w * (0.5 + 0.25 * Math.sin(t * 0.4));
    const cy = h * (0.5 + 0.2 * Math.cos(t * 0.33));
    for (let y = 0; y < h; y += cell) {
      for (let x = 0; x < w; x += cell) {
        const dx = (x - cx) / w;
        const dy = (y - cy) / h;
        const blob = Math.exp(-(dx * dx + dy * dy) * 9);
        const waves = 0.5 + 0.5 * Math.sin(x * 0.03 + t * 0.9) * Math.cos(y * 0.035 - t * 0.6);
        const v = blob * 0.85 + waves * 0.35;
        const threshold = BAYER[((y / cell) % 4) * 4 + ((x / cell) % 4)];
        if (v > threshold) {
          // Accent only on a thin contour of the shape, not the whole blob.
          ctx.fillStyle = v > 0.78 && v < 0.86 ? ACCENT : `rgba(${FG}, ${0.2 + Math.min(v, 1) * 0.5})`;
          ctx.fillRect(x, y, cell - 2, cell - 2);
        }
      }
    }
  },

  // A film strip rolling past a playhead.
  video(ctx, w, h, t) {
    const frameW = w * 0.34;
    const frameH = h * 0.56;
    const y = (h - frameH) / 2;
    const shift = (t * 40) % (frameW + 12);
    ctx.strokeStyle = `rgba(${FG}, 0.5)`;
    ctx.lineWidth = 1;
    for (let i = -1; i < 4; i++) {
      const x = i * (frameW + 12) - shift + 12;
      ctx.strokeRect(x, y, frameW, frameH);
      const phase = (i + Math.floor((t * 40) / (frameW + 12))) * 0.6;
      ctx.fillStyle = `rgba(${FG}, 0.7)`;
      ctx.beginPath();
      ctx.arc(x + frameW * (0.3 + 0.4 * ((phase % 1 + 1) % 1)), y + frameH * 0.6, frameH * 0.12, 0, Math.PI * 2);
      ctx.fill();
      for (let s = 0; s < 6; s++) {
        ctx.fillStyle = `rgba(${FG}, 0.25)`;
        ctx.fillRect(x + (s + 0.5) * (frameW / 6) - 3, y - 14, 6, 6);
        ctx.fillRect(x + (s + 0.5) * (frameW / 6) - 3, y + frameH + 8, 6, 6);
      }
    }
    ctx.fillStyle = ACCENT;
    ctx.fillRect(w * 0.5, y - 22, 2, frameH + 44);
  },

  // Rings filling up, then a check: the job finishing.
  reel(ctx, w, h, t) {
    const cx = w / 2;
    const cy = h / 2;
    const p = (t * 0.28) % 1.35;
    for (let i = 0; i < 4; i++) {
      const r = Math.min(w, h) * (0.14 + i * 0.075);
      ctx.strokeStyle = `rgba(${FG}, 0.14)`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      const fill = Math.min(1, Math.max(0, p * 1.1 - i * 0.08));
      ctx.strokeStyle = fill >= 1 ? ACCENT : `rgba(${FG}, 0.75)`;
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + fill * Math.PI * 2);
      ctx.stroke();
    }
    if (p > 1.02) {
      const k = Math.min(1, (p - 1.02) / 0.12);
      const s = Math.min(w, h) * 0.07;
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - s, cy);
      ctx.lineTo(cx - s + s * 0.8 * Math.min(1, k * 2), cy + s * 0.8 * Math.min(1, k * 2));
      if (k > 0.5) ctx.lineTo(cx - s * 0.2 + s * 1.4 * (k - 0.5) * 2, cy + s * 0.8 - s * 1.6 * (k - 0.5) * 2);
      ctx.stroke();
    }
  },
};

export function ToolArt({ variant }: { variant: ToolArtVariant }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const draw = draws[variant];
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0;
    let h = 0;
    const start = performance.now() - hash(variant.length) * 5000;

    const frame = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      draw(ctx, w, h, t);
    };
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      frame(reduce ? 4 : (performance.now() - start) / 1000);
    };
    const tick = () => frame((performance.now() - start) / 1000);

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    let running = false;
    const visibility = new IntersectionObserver(([entry]) => {
      if (reduce) return;
      if (entry.isIntersecting && !running) gsap.ticker.add(tick);
      if (!entry.isIntersecting && running) gsap.ticker.remove(tick);
      running = entry.isIntersecting;
    });
    visibility.observe(canvas);

    return () => {
      resizeObserver.disconnect();
      visibility.disconnect();
      gsap.ticker.remove(tick);
    };
  }, [variant]);

  return <canvas ref={ref} className="tool-art" aria-hidden="true" />;
}
