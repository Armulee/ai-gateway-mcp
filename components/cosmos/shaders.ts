// GLSL for the cosmos, drawn in four passes:
// 1. NEBULA   full screen: black, faint grey dust, grain
// 2. STARS    3D starfield; the same stars drawn as points and as streak lines
// 3. BODY     full screen: eclipse (black disk, white corona) and planet horizon
// 4. POINTS   one point per AI Gateway model, morphing between shapes

const NOISE = /* glsl */ `
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}
`;

export const FULLSCREEN_VERTEX = /* glsl */ `#version 300 es
const vec2 verts[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
void main() {
  gl_Position = vec4(verts[gl_VertexID], 0.0, 1.0);
}
`;

export const NEBULA_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uTravel;
uniform float uDust;
out vec4 outColor;
${NOISE}
void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float n = fbm(p * 1.4 + vec2(uTravel * 0.015, -uTravel * 0.01) + uTime * 0.004);
  float dust = smoothstep(0.45, 0.95, n) * 0.06 * uDust;
  vec3 col = vec3(dust);
  col += (hash(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) * 0.018;
  outColor = vec4(max(col, 0.0), 1.0);
}
`;

export const STAR_VERTEX = /* glsl */ `#version 300 es
precision highp float;
layout(location = 0) in vec4 aStar;  // x, y, depth seed, size seed
layout(location = 1) in float aEnd;  // 0 head, 1 tail
uniform float uTravel;
uniform float uSpeed;
uniform float uAspect;
uniform float uDpr;
uniform float uTail;      // 0 when drawing points
uniform float uTime;
uniform float uPulse;
out float vAlpha;

const float DEPTH = 8.0;

void main() {
  float s = fract(aStar.z - uTravel / DEPTH) * DEPTH + 0.05;
  s += aEnd * uTail * clamp(uSpeed, 0.0, 6.0) * 0.12;
  vec2 ndc = aStar.xy / s;
  ndc.x /= uAspect;
  gl_Position = vec4(ndc, 0.0, 1.0);
  float near = smoothstep(DEPTH, DEPTH * 0.55, s);
  float far = smoothstep(0.05, 0.6, s);
  float twinkle = 0.75 + 0.25 * sin(uTime * (0.8 + aStar.w * 2.0) + aStar.z * 60.0);
  float flare = uPulse < 2.0 ? exp(-uPulse * 2.5) * 1.5 : 0.0;
  vAlpha = near * far * (0.35 + 0.65 * aStar.w) * twinkle * (1.0 + flare);
  // Lines fade from head to tail; the points pass only shows heads.
  if (uTail > 0.0) vAlpha *= clamp(uSpeed * 0.6, 0.0, 1.0) * (1.0 - aEnd);
  else vAlpha *= 1.0 - aEnd;
  gl_PointSize = clamp((0.8 + aStar.w * 1.8) * uDpr * sqrt(2.2 / s), 1.0, 4.5 * uDpr);
}
`;

export const STAR_FRAGMENT = /* glsl */ `#version 300 es
precision mediump float;
uniform float uStars;
uniform float uIsPoint;
in float vAlpha;
out vec4 outColor;
void main() {
  float a = vAlpha * uStars;
  if (uIsPoint > 0.5) {
    float d = length(gl_PointCoord - 0.5);
    a *= smoothstep(0.5, 0.1, d);
  }
  outColor = vec4(vec3(a), 0.0);
}
`;

// Premultiplied output: alpha 1 occludes the stars behind (disk, planet),
// alpha 0 adds light (corona, atmosphere).
export const BODY_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uEclipse;
uniform float uEclipseScale;
uniform float uEclipseY;
uniform float uHorizon;
uniform float uHorizonLift;
uniform float uFlash;
out vec4 outColor;
${NOISE}
void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float aspect = uRes.x / uRes.y;
  vec3 light = vec3(0.0);
  float cover = 0.0;

  if (uEclipse > 0.001) {
    float R = 0.14 * min(1.0, aspect * 1.35) * uEclipseScale;
    vec2 q = p - vec2(0.0, uEclipseY);
    float d = length(q);
    vec2 dir = q / max(d, 1e-4);
    float rays = fbm(dir * 3.2 + vec2(uTime * 0.025, -uTime * 0.018));
    float fine = fbm(dir * 11.0 - vec2(uTime * 0.04));
    float out_ = max(d - R, 0.0);
    float reach = R * (0.18 + 0.9 * rays * rays + 0.25 * fine);
    float corona = exp(-out_ / reach) * 0.85 + exp(-out_ / (R * 0.035)) * 0.9;
    float rim = exp(-abs(d - R) / (R * 0.012)) * 0.9;
    float disk = smoothstep(R + R * 0.006, R - R * 0.006, d);
    light += vec3(corona * (1.0 - disk) + rim) * uEclipse;
    cover = max(cover, disk * uEclipse);
  }

  if (uHorizon > 0.001) {
    float Rp = 2.4;
    float top = mix(-0.9, -0.18, uHorizonLift);
    vec2 c = vec2(0.0, top - Rp);
    float d = length(p - c);
    float edge = d - Rp;
    float centre = 1.0 - smoothstep(0.0, aspect * 0.55, abs(p.x));
    float atmosphere = exp(-max(edge, 0.0) / 0.018) * (0.55 + 0.45 * centre) + exp(-max(edge, 0.0) / 0.16) * 0.22 * centre;
    float rim = exp(-abs(edge) / 0.0035) * (0.6 + 0.4 * centre);
    float inside = smoothstep(0.002, -0.002, edge);
    float surface = 0.025 * fbm(p * 5.0 + vec2(uTime * 0.01, 0.0)) * smoothstep(-0.5, 0.0, edge);
    light += vec3(atmosphere * (1.0 - inside) + rim + surface * inside) * uHorizon;
    cover = max(cover, inside * uHorizon);
  }

  light = mix(light, vec3(1.0), uFlash);
  cover = max(cover, uFlash);
  outColor = vec4(light, cover);
}
`;

// Model points: shapes are computed from per-point random numbers, so a morph
// between shapes is a single uniform.
export const POINT_VERTEX = /* glsl */ `#version 300 es
precision highp float;

layout(location = 0) in vec4 aRand;
layout(location = 1) in float aKind;   // 0 text, 1 image, 2 video
layout(location = 2) in float aIndex;  // position in the kind-sorted list

uniform float uTime;
uniform float uMorph;
uniform float uCount;
uniform vec3 uKindShare;
uniform float uAspect;
uniform float uScale;
uniform vec2 uOffset;
uniform vec2 uPointer;
uniform float uPointerStrength;
uniform float uAlpha;
uniform float uDpr;
uniform float uPointSize;

out float vAlpha;
out float vShade;

const float PI = 3.14159265;

mat2 rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

vec3 galaxy() {
  float r = pow(aRand.x, 0.55) * 1.05;
  float arm = floor(aRand.y * 3.0);
  float ang = arm * (2.0 * PI / 3.0) + r * 3.4 + (aRand.z - 0.5) * 0.9 * (1.0 - r * 0.5) + uTime * 0.04;
  float h = (aRand.w - 0.5) * 0.24 * (1.0 - r);
  vec3 p = vec3(cos(ang) * r, h, sin(ang) * r);
  p.yz = rot(-1.05) * p.yz;
  p.xy = rot(0.3) * p.xy;
  return p;
}

vec3 stream() {
  if (aRand.w < 0.3) {
    float ang = aRand.x * 2.0 * PI + uTime * 0.12;
    float R = 0.62 + (aRand.y - 0.5) * 0.05;
    vec3 p = vec3((aRand.z - 0.5) * 0.04, cos(ang) * R, sin(ang) * R);
    p.xz = rot(0.55) * p.xz;
    return p;
  }
  float x = mod(aRand.x * 3.6 + uTime * 0.11, 3.6) - 1.8;
  float envelope = 0.03 + 0.8 * pow(abs(x) / 1.8, 1.7);
  float ang = aRand.y * 2.0 * PI + x * 1.3;
  float rr = envelope * sqrt(aRand.z);
  vec3 p = vec3(x, cos(ang) * rr, sin(ang) * rr);
  p.xz = rot(0.55) * p.xz;
  return p;
}

vec3 sorted() {
  float share = aKind < 0.5 ? uKindShare.x : (aKind < 1.5 ? uKindShare.y : uKindShare.z);
  float cx = (aKind - 1.0) * 0.5;
  float R = 0.1 + 0.32 * sqrt(share);
  float theta = aRand.x * 2.0 * PI;
  float phi = acos(2.0 * aRand.y - 1.0);
  float rr = R * pow(aRand.z, 0.333);
  vec3 p = vec3(sin(phi) * cos(theta), cos(phi), sin(phi) * sin(theta)) * rr;
  p.xz = rot(uTime * 0.2 + aKind) * p.xz;
  p.x += cx * uAspect / uScale;
  return p;
}

vec3 grid() {
  float cols = ceil(sqrt(uCount * 2.2));
  float rows = ceil(uCount / cols);
  float col = mod(aIndex, cols);
  float row = floor(aIndex / cols);
  float W = 1.7 * uAspect / uScale;
  float cell = W / max(cols - 1.0, 1.0);
  float x = (col / max(cols - 1.0, 1.0) - 0.5) * W;
  float y = ((rows - 1.0) * 0.5 - row) * cell;
  return vec3(x, y, sin(x * 2.5 + uTime * 0.8) * 0.05);
}

vec3 shapeAt(float i) {
  if (i < 0.5) return galaxy();
  if (i < 1.5) return stream();
  if (i < 2.5) return sorted();
  return grid();
}

void main() {
  float m = clamp(uMorph, 0.0, 3.0);
  float a = floor(m);
  float b = min(a + 1.0, 3.0);
  float t = clamp((m - a - aRand.y * 0.35) / 0.65, 0.0, 1.0);
  t = t * t * (3.0 - 2.0 * t);
  vec3 p = mix(shapeAt(a), shapeAt(b), t);

  float persp = 2.8 / (2.8 - p.z);
  vec2 ndc = p.xy * persp * uScale;
  ndc.x /= uAspect;
  ndc += uOffset;

  vec2 d = (ndc - uPointer) * vec2(uAspect, 1.0);
  float l = length(d);
  vec2 push = l > 0.0001 ? d / l : vec2(0.0);
  ndc += push * vec2(1.0 / uAspect, 1.0) * 0.07 * exp(-l * l * 12.0) * uPointerStrength;

  gl_Position = vec4(ndc, 0.0, 1.0);
  // Kinds read by brightness and size: text brightest, then image, then video.
  float kindSize = aKind < 0.5 ? 1.0 : (aKind < 1.5 ? 1.25 : 1.1);
  vShade = aKind < 0.5 ? 1.0 : (aKind < 1.5 ? 0.78 : 0.55);
  gl_PointSize = uPointSize * persp * uDpr * (0.55 + aRand.z * 0.9) * kindSize;
  float twinkle = 0.75 + 0.25 * sin(uTime * 1.3 + aRand.x * 40.0);
  vAlpha = uAlpha * twinkle * (0.5 + 0.5 * persp);
}
`;

export const POINT_FRAGMENT = /* glsl */ `#version 300 es
precision mediump float;
in float vAlpha;
in float vShade;
out vec4 outColor;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float halo = smoothstep(0.5, 0.0, d);
  halo *= halo;
  float core = smoothstep(0.14, 0.0, d);
  outColor = vec4(vec3(vShade) * (halo * 0.8 + core * 0.75) * vAlpha, 0.0);
}
`;
