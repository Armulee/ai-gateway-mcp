'use client';

import { gsap } from 'gsap';
import { useEffect, useRef } from 'react';
import type { KindCounts } from '@/lib/catalog-summary';
import {
  BODY_FRAGMENT,
  FULLSCREEN_VERTEX,
  NEBULA_FRAGMENT,
  POINT_FRAGMENT,
  POINT_VERTEX,
  STAR_FRAGMENT,
  STAR_VERTEX,
} from './shaders';
import { cosmos, pulseAge } from './store';

type Props = {
  /** One point per model. Omit to draw only stars and bodies. */
  counts?: KindCounts;
  /** Starting values; scroll animations take over from here. */
  initial?: Partial<typeof cosmos>;
  /** Fewer stars and no drift, for pages built for reading. */
  calm?: boolean;
};

// Seeded so the sky looks the same on every visit.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function program(gl: WebGL2RenderingContext, vertex: string, fragment: string): WebGLProgram {
  const p = gl.createProgram()!;
  for (const [type, source] of [
    [gl.VERTEX_SHADER, vertex],
    [gl.FRAGMENT_SHADER, fragment],
  ] as const) {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'shader');
    gl.attachShader(p, shader);
  }
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link');
  return p;
}

function uniforms(gl: WebGL2RenderingContext, p: WebGLProgram, names: string[]) {
  return Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(p, n)]));
}

export function CosmosCanvas({ counts, initial, calm = false }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const text = counts?.text ?? 0;
  const image = counts?.image ?? 0;
  const video = counts?.video ?? 0;

  useEffect(() => {
    if (initial) Object.assign(cosmos, initial);
    const canvas = ref.current;
    const gl = canvas?.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance' });
    if (!canvas || !gl) {
      document.documentElement.classList.add('no-webgl');
      return;
    }

    let nebula: WebGLProgram, stars: WebGLProgram, body: WebGLProgram, points: WebGLProgram;
    try {
      nebula = program(gl, FULLSCREEN_VERTEX, NEBULA_FRAGMENT);
      stars = program(gl, STAR_VERTEX, STAR_FRAGMENT);
      body = program(gl, FULLSCREEN_VERTEX, BODY_FRAGMENT);
      points = program(gl, POINT_VERTEX, POINT_FRAGMENT);
    } catch {
      document.documentElement.classList.add('no-webgl');
      return;
    }

    const random = mulberry32(20261014);
    const buffers: WebGLBuffer[] = [];
    const attribute = (location: number, data: Float32Array, size: number) => {
      const buffer = gl.createBuffer()!;
      buffers.push(buffer);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
    };

    // Stars: two vertices each (head and tail) so the same data draws points and warp streaks.
    const small = window.innerWidth < 760;
    const starCount = calm ? 900 : small ? 1400 : 2600;
    const starData = new Float32Array(starCount * 2 * 4);
    const starEnd = new Float32Array(starCount * 2);
    for (let i = 0; i < starCount; i++) {
      const star = [(random() * 2 - 1) * 2.4, (random() * 2 - 1) * 1.5, random(), random() ** 2.2];
      for (let e = 0; e < 2; e++) {
        starData.set(star, (i * 2 + e) * 4);
        starEnd[i * 2 + e] = e;
      }
    }
    const starVao = gl.createVertexArray();
    gl.bindVertexArray(starVao);
    attribute(0, starData, 4);
    attribute(1, starEnd, 1);

    // Model points, sorted by kind.
    const total = text + image + video;
    const pointVao = gl.createVertexArray();
    if (total > 0) {
      const rand = new Float32Array(total * 4);
      const kind = new Float32Array(total);
      const index = new Float32Array(total);
      for (let i = 0; i < total; i++) {
        for (let j = 0; j < 4; j++) rand[i * 4 + j] = random();
        kind[i] = i < text ? 0 : i < text + image ? 1 : 2;
        index[i] = i;
      }
      gl.bindVertexArray(pointVao);
      attribute(0, rand, 4);
      attribute(1, kind, 1);
      attribute(2, index, 1);
    }
    gl.bindVertexArray(null);
    const emptyVao = gl.createVertexArray();

    const N = uniforms(gl, nebula, ['uRes', 'uTime', 'uTravel', 'uDust']);
    const S = uniforms(gl, stars, ['uTravel', 'uSpeed', 'uAspect', 'uDpr', 'uTail', 'uTime', 'uPulse', 'uStars', 'uIsPoint']);
    const B = uniforms(gl, body, ['uRes', 'uTime', 'uEclipse', 'uEclipseScale', 'uEclipseY', 'uHorizon', 'uHorizonLift', 'uFlash']);
    const P = uniforms(gl, points, [
      'uTime', 'uMorph', 'uCount', 'uKindShare', 'uAspect', 'uScale', 'uOffset', 'uPointer', 'uPointerStrength', 'uAlpha', 'uDpr', 'uPointSize',
    ]);

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pointer = { x: 9, y: 9, tx: 9, ty: 9, strength: 0, target: 0 };
    let dpr = 1;
    let lastTravel = cosmos.travel;
    let speed = 0;
    const start = performance.now();

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75);
      canvas!.width = Math.round(window.innerWidth * dpr);
      canvas!.height = Math.round(window.innerHeight * dpr);
      gl!.viewport(0, 0, canvas!.width, canvas!.height);
      if (reduce) draw(6);
    }

    function draw(time: number) {
      const w = canvas!.width;
      const h = canvas!.height;
      const aspect = w / h;
      // A slow idle drift keeps the sky alive; scrolling adds real travel.
      const travel = cosmos.travel + (reduce || calm ? 0 : time * 0.035);
      speed += ((cosmos.travel - lastTravel) * 60 - speed) * 0.12;
      lastTravel = cosmos.travel;
      pointer.x += (pointer.tx - pointer.x) * 0.08;
      pointer.y += (pointer.ty - pointer.y) * 0.08;
      pointer.strength += (pointer.target - pointer.strength) * 0.05;

      gl!.disable(gl!.BLEND);
      gl!.useProgram(nebula);
      gl!.bindVertexArray(emptyVao);
      gl!.uniform2f(N.uRes, w, h);
      gl!.uniform1f(N.uTime, time);
      gl!.uniform1f(N.uTravel, travel);
      gl!.uniform1f(N.uDust, cosmos.dust);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);

      // Premultiplied: alpha 0 adds light, alpha 1 covers what is behind.
      gl!.enable(gl!.BLEND);
      gl!.blendFunc(gl!.ONE, gl!.ONE_MINUS_SRC_ALPHA);

      gl!.useProgram(stars);
      gl!.bindVertexArray(starVao);
      gl!.uniform1f(S.uTravel, travel);
      gl!.uniform1f(S.uSpeed, Math.abs(speed));
      gl!.uniform1f(S.uAspect, aspect);
      gl!.uniform1f(S.uDpr, dpr);
      gl!.uniform1f(S.uTime, time);
      gl!.uniform1f(S.uPulse, pulseAge());
      gl!.uniform1f(S.uStars, cosmos.stars);
      gl!.uniform1f(S.uTail, 0);
      gl!.uniform1f(S.uIsPoint, 1);
      gl!.drawArrays(gl!.POINTS, 0, starCount * 2);
      if (Math.abs(speed) > 0.05) {
        gl!.uniform1f(S.uTail, 1);
        gl!.uniform1f(S.uIsPoint, 0);
        gl!.drawArrays(gl!.LINES, 0, starCount * 2);
      }

      if (cosmos.eclipse > 0.001 || cosmos.horizon > 0.001 || cosmos.flash > 0.001) {
        gl!.useProgram(body);
        gl!.bindVertexArray(emptyVao);
        gl!.uniform2f(B.uRes, w, h);
        gl!.uniform1f(B.uTime, time);
        gl!.uniform1f(B.uEclipse, cosmos.eclipse);
        gl!.uniform1f(B.uEclipseScale, cosmos.eclipseScale);
        gl!.uniform1f(B.uEclipseY, cosmos.eclipseY);
        gl!.uniform1f(B.uHorizon, cosmos.horizon);
        gl!.uniform1f(B.uHorizonLift, cosmos.horizonLift);
        gl!.uniform1f(B.uFlash, cosmos.flash);
        gl!.drawArrays(gl!.TRIANGLES, 0, 3);
      }

      if (total > 0 && cosmos.points > 0.001) {
        const scale = cosmos.pointsScale * Math.min(1, aspect * 1.05);
        gl!.useProgram(points);
        gl!.bindVertexArray(pointVao);
        gl!.uniform1f(P.uTime, time);
        gl!.uniform1f(P.uMorph, cosmos.morph);
        gl!.uniform1f(P.uCount, total);
        gl!.uniform3f(P.uKindShare, text / total, image / total, video / total);
        gl!.uniform1f(P.uAspect, aspect);
        gl!.uniform1f(P.uScale, scale);
        gl!.uniform2f(P.uOffset, cosmos.pointsX, cosmos.pointsY);
        gl!.uniform2f(P.uPointer, pointer.x, pointer.y);
        gl!.uniform1f(P.uPointerStrength, pointer.strength);
        gl!.uniform1f(P.uAlpha, cosmos.points);
        gl!.uniform1f(P.uDpr, dpr);
        gl!.uniform1f(P.uPointSize, Math.max(5, Math.min(11, h / dpr / 85)));
        gl!.drawArrays(gl!.POINTS, 0, total);
      }
    }

    const tick = () => {
      if (!document.hidden) draw((performance.now() - start) / 1000);
    };
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = 1 - (e.clientY / window.innerHeight) * 2;
      pointer.target = 1;
    };
    const onLeave = () => {
      pointer.target = 0;
    };

    resize();
    window.addEventListener('resize', resize);
    if (!reduce) {
      window.addEventListener('pointermove', onPointer);
      document.addEventListener('pointerleave', onLeave);
      gsap.ticker.add(tick);
    }
    canvas.classList.add('is-ready');

    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('pointerleave', onLeave);
      buffers.forEach((b) => gl.deleteBuffer(b));
      [starVao, pointVao, emptyVao].forEach((v) => gl.deleteVertexArray(v));
      [nebula, stars, body, points].forEach((p) => gl.deleteProgram(p));
    };
    // `initial` and `calm` are read on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, image, video]);

  return <canvas ref={ref} className="cosmos-canvas" aria-hidden="true" />;
}
