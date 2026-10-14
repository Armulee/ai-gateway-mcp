// GLSL for "the gate": one point per AI Gateway model. Every shape is computed
// in the vertex shader from per-point random numbers, so morphing between
// shapes is a single uniform (uMorph) and needs no extra buffers.

export const POINT_VERTEX = /* glsl */ `#version 300 es
precision highp float;

layout(location = 0) in vec4 aRand;
layout(location = 1) in float aKind;   // 0 text, 1 image, 2 video
layout(location = 2) in float aIndex;  // position in the kind-sorted list

uniform float uTime;
uniform float uMorph;
uniform float uCount;
uniform vec3 uKindShare;   // share of text, image, video in the catalog
uniform float uAspect;
uniform float uScale;
uniform vec2 uOffset;
uniform vec2 uPointer;
uniform float uPointerStrength;
uniform float uIntensity;
uniform float uPulse;      // seconds since the last pulse
uniform float uDpr;
uniform float uPointSize;

out vec3 vColor;
out float vAlpha;

const float PI = 3.14159265;

mat2 rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

// A slow three-armed galaxy.
vec3 cloudShape() {
  float r = pow(aRand.x, 0.55) * 1.05;
  float arm = floor(aRand.y * 3.0);
  float ang = arm * (2.0 * PI / 3.0) + r * 3.4 + (aRand.z - 0.5) * 0.9 * (1.0 - r * 0.5);
  ang += uTime * 0.05;
  float h = (aRand.w - 0.5) * 0.24 * (1.0 - r);
  vec3 p = vec3(cos(ang) * r, h, sin(ang) * r);
  p.yz = rot(-0.95) * p.yz;
  p.xy = rot(0.35) * p.xy;
  return p;
}

// A stream that narrows through one ring: every request through one private link.
vec3 gateShape() {
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

// Three clusters, one per kind, centred under the DOM labels (25%, 50%, 75%).
vec3 sortShape() {
  float share = aKind < 0.5 ? uKindShare.x : (aKind < 1.5 ? uKindShare.y : uKindShare.z);
  float cx = (aKind - 1.0) * 0.5;
  float R = 0.1 + 0.32 * sqrt(share);
  float theta = aRand.x * 2.0 * PI;
  float phi = acos(2.0 * aRand.y - 1.0);
  float rr = R * pow(aRand.z, 0.333);
  vec3 p = vec3(sin(phi) * cos(theta), cos(phi), sin(phi) * sin(theta)) * rr;
  p.xz = rot(uTime * 0.25 + aKind) * p.xz;
  p.x += cx * uAspect / uScale;
  p.y += 0.08;
  return p;
}

// A flat wall of models, grouped by kind.
vec3 gridShape() {
  float cols = ceil(sqrt(uCount * 2.2));
  float rows = ceil(uCount / cols);
  float col = mod(aIndex, cols);
  float row = floor(aIndex / cols);
  float W = 1.7 * uAspect / uScale;
  float cell = W / max(cols - 1.0, 1.0);
  float x = (col / max(cols - 1.0, 1.0) - 0.5) * W;
  float y = ((rows - 1.0) * 0.5 - row) * cell;
  float z = sin(x * 2.5 + uTime * 0.8) * 0.05 + cos(y * 3.0 + uTime * 0.6) * 0.04;
  return vec3(x, y, z);
}

vec3 shapeAt(float i) {
  if (i < 0.5) return cloudShape();
  if (i < 1.5) return gateShape();
  if (i < 2.5) return sortShape();
  return gridShape();
}

void main() {
  float m = clamp(uMorph, 0.0, 3.0);
  float a = floor(m);
  float b = min(a + 1.0, 3.0);
  // Each point leaves at its own moment, so shapes dissolve instead of sliding.
  float t = clamp((m - a - aRand.y * 0.35) / 0.65, 0.0, 1.0);
  t = t * t * (3.0 - 2.0 * t);
  vec3 p = mix(shapeAt(a), shapeAt(b), t);

  float persp = 2.8 / (2.8 - p.z);
  vec2 ndc = p.xy * persp * uScale;
  ndc.x /= uAspect;
  ndc += uOffset;

  // The cursor bends space a little, like a lens.
  vec2 d = (ndc - uPointer) * vec2(uAspect, 1.0);
  float l = length(d);
  vec2 push = l > 0.0001 ? d / l : vec2(0.0);
  ndc += push * vec2(1.0 / uAspect, 1.0) * 0.08 * exp(-l * l * 12.0) * uPointerStrength;

  float wave = 0.0;
  if (uPulse < 3.0) {
    float rad = length((ndc - uOffset) * vec2(uAspect, 1.0));
    wave = exp(-pow((rad - uPulse * 0.9) * 5.0, 2.0)) * (1.0 - uPulse / 3.0);
  }

  gl_Position = vec4(ndc, 0.0, 1.0);
  gl_PointSize = uPointSize * persp * uDpr * (0.55 + aRand.z * 0.9) * (1.0 + wave * 1.6);

  vec3 cText = vec3(0.925, 0.922, 0.902);
  vec3 cImage = vec3(1.0, 0.357, 0.18);
  vec3 cVideo = vec3(0.55, 0.58, 0.68);
  vColor = aKind < 0.5 ? cText : (aKind < 1.5 ? cImage : cVideo);
  float twinkle = 0.72 + 0.28 * sin(uTime * 1.3 + aRand.x * 40.0);
  vAlpha = uIntensity * twinkle * (0.5 + 0.5 * persp) + wave * 0.8;
}
`;

export const POINT_FRAGMENT = /* glsl */ `#version 300 es
precision mediump float;

in vec3 vColor;
in float vAlpha;
out vec4 outColor;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float halo = smoothstep(0.5, 0.0, d);
  halo *= halo;
  float core = smoothstep(0.14, 0.0, d);
  outColor = vec4(vColor * (halo * 0.85 + core * 0.7) * vAlpha, 1.0);
}
`;

// Full-screen background: off-black base, a faint glow behind the scene, film grain and vignette.
export const BACKGROUND_VERTEX = /* glsl */ `#version 300 es
const vec2 verts[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
void main() {
  gl_Position = vec4(verts[gl_VertexID], 0.0, 1.0);
}
`;

export const BACKGROUND_FRAGMENT = /* glsl */ `#version 300 es
precision mediump float;

uniform vec2 uRes;
uniform float uTime;
uniform vec2 uOffset;
uniform float uIntensity;
out vec4 outColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 ndc = uv * 2.0 - 1.0;
  vec3 base = vec3(0.043, 0.047, 0.059);
  vec2 d = (ndc - uOffset) * vec2(uRes.x / uRes.y, 1.0);
  float glow = exp(-dot(d, d) * 1.4) * 0.12 * uIntensity;
  vec3 col = base + vec3(1.0, 0.36, 0.18) * glow * 0.5 + vec3(0.55, 0.58, 0.68) * glow * 0.3;
  float vig = smoothstep(1.7, 0.35, length(ndc * vec2(1.0, 1.2)));
  col *= mix(0.72, 1.0, vig);
  col += (hash(gl_FragCoord.xy + fract(uTime) * 97.0) - 0.5) * 0.022;
  outColor = vec4(col, 1.0);
}
`;
