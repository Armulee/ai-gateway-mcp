'use client';

import { gsap } from 'gsap';
import { useEffect, useRef } from 'react';
import type { KindCounts } from '@/lib/catalog-summary';
import { BACKGROUND_FRAGMENT, BACKGROUND_VERTEX, POINT_FRAGMENT, POINT_VERTEX } from './shaders';
import { gate, pulseAge } from './store';

type Props = {
  counts: KindCounts;
  /** Starting values for the scene; scroll animations take over from here. */
  initial?: Partial<typeof gate>;
};

// Small seeded PRNG so the field looks the same on every visit.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function compile(gl: WebGL2RenderingContext, vertex: string, fragment: string): WebGLProgram {
  const program = gl.createProgram()!;
  for (const [type, source] of [
    [gl.VERTEX_SHADER, vertex],
    [gl.FRAGMENT_SHADER, fragment],
  ] as const) {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'shader');
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'link');
  return program;
}

export function GateCanvas({ counts, initial }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { text, image, video } = counts;

  useEffect(() => {
    if (initial) Object.assign(gate, initial);
    const canvas = ref.current;
    const gl = canvas?.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
    if (!canvas || !gl) {
      document.documentElement.classList.add('no-webgl');
      return;
    }

    let points: WebGLProgram;
    let background: WebGLProgram;
    try {
      points = compile(gl, POINT_VERTEX, POINT_FRAGMENT);
      background = compile(gl, BACKGROUND_VERTEX, BACKGROUND_FRAGMENT);
    } catch {
      document.documentElement.classList.add('no-webgl');
      return;
    }

    // One point per model, sorted by kind so the grid groups them.
    const total = text + image + video;
    const rand = new Float32Array(total * 4);
    const kind = new Float32Array(total);
    const index = new Float32Array(total);
    const random = mulberry32(20261014);
    for (let i = 0; i < total; i++) {
      for (let j = 0; j < 4; j++) rand[i * 4 + j] = random();
      kind[i] = i < text ? 0 : i < text + image ? 1 : 2;
      index[i] = i;
    }
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buffers = [
      [rand, 4],
      [kind, 1],
      [index, 1],
    ] as const;
    const glBuffers = buffers.map(([data, size], location) => {
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
      return buffer;
    });
    gl.bindVertexArray(null);
    const emptyVao = gl.createVertexArray();

    const u = (program: WebGLProgram, name: string) => gl.getUniformLocation(program, name);
    const P = Object.fromEntries(
      ['uTime', 'uMorph', 'uCount', 'uKindShare', 'uAspect', 'uScale', 'uOffset', 'uPointer', 'uPointerStrength', 'uIntensity', 'uPulse', 'uDpr', 'uPointSize'].map(
        (n) => [n, u(points, n)],
      ),
    );
    const B = Object.fromEntries(['uRes', 'uTime', 'uOffset', 'uIntensity'].map((n) => [n, u(background, n)]));

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pointer = { x: 9, y: 9, tx: 9, ty: 9, strength: 0, target: 0 };
    let dpr = 1;
    const start = performance.now();

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas!.width = Math.round(window.innerWidth * dpr);
      canvas!.height = Math.round(window.innerHeight * dpr);
      gl!.viewport(0, 0, canvas!.width, canvas!.height);
      if (reduce) draw(8);
    }

    function draw(time: number) {
      const aspect = canvas!.width / canvas!.height;
      // Keep the scene inside narrow (portrait) screens.
      const scale = gate.scale * Math.min(1, aspect * 1.05);
      pointer.x += (pointer.tx - pointer.x) * 0.08;
      pointer.y += (pointer.ty - pointer.y) * 0.08;
      pointer.strength += (pointer.target - pointer.strength) * 0.05;

      gl!.disable(gl!.BLEND);
      gl!.useProgram(background);
      gl!.bindVertexArray(emptyVao);
      gl!.uniform2f(B.uRes, canvas!.width, canvas!.height);
      gl!.uniform1f(B.uTime, time);
      gl!.uniform2f(B.uOffset, gate.offsetX, gate.offsetY);
      gl!.uniform1f(B.uIntensity, gate.intensity);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);

      gl!.enable(gl!.BLEND);
      gl!.blendFunc(gl!.ONE, gl!.ONE);
      gl!.useProgram(points);
      gl!.bindVertexArray(vao);
      gl!.uniform1f(P.uTime, time);
      gl!.uniform1f(P.uMorph, gate.morph);
      gl!.uniform1f(P.uCount, total);
      gl!.uniform3f(P.uKindShare, text / total, image / total, video / total);
      gl!.uniform1f(P.uAspect, aspect);
      gl!.uniform1f(P.uScale, scale);
      gl!.uniform2f(P.uOffset, gate.offsetX, gate.offsetY);
      gl!.uniform2f(P.uPointer, pointer.x, pointer.y);
      gl!.uniform1f(P.uPointerStrength, pointer.strength);
      gl!.uniform1f(P.uIntensity, gate.intensity);
      gl!.uniform1f(P.uPulse, pulseAge());
      gl!.uniform1f(P.uDpr, dpr);
      gl!.uniform1f(P.uPointSize, Math.max(5, Math.min(11, canvas!.height / dpr / 85)));
      gl!.drawArrays(gl!.POINTS, 0, total);
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
      glBuffers.forEach((b) => gl.deleteBuffer(b));
      gl.deleteVertexArray(vao);
      gl.deleteVertexArray(emptyVao);
      gl.deleteProgram(points);
      gl.deleteProgram(background);
    };
    // `initial` is only read on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, image, video]);

  return <canvas ref={ref} className="gate-canvas" aria-hidden="true" />;
}
