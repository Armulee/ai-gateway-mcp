// Shapes the star swarm forms as the story goes. Each one is drawn here with
// Canvas2D paths (no image files), then sampled into star positions. Shapes
// are stored in order; `cosmos.form` moves between neighbouring indices.

type Ctx = CanvasRenderingContext2D;

/** Draws the shape; the optional second layer marks stars that leave on the next shape. */
type Shape = { draw: (c: Ctx, font: string) => void; extra?: (c: Ctx, font: string) => void };

const SIZE = 256;
const C = SIZE / 2;

function rounded(c: Ctx, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
}

function line(c: Ctx, points: [number, number][], width: number) {
  c.lineWidth = width;
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.stroke();
}

function dot(c: Ctx, x: number, y: number, r: number) {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
}

function text(c: Ctx, font: string, value: string, x: number, y: number, size: number, weight = 700) {
  c.font = `${weight} ${size}px ${font}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(value, x, y);
}

function tag(c: Ctx, font: string) {
  c.save();
  c.translate(C, C + 8);
  c.rotate(-0.22);
  c.translate(-C, -C);
  c.lineWidth = 8;
  c.beginPath();
  c.moveTo(34, 128);
  c.lineTo(84, 74);
  c.lineTo(214, 74);
  c.lineTo(214, 182);
  c.lineTo(84, 182);
  c.closePath();
  c.stroke();
  c.lineWidth = 6;
  c.beginPath();
  c.arc(78, 128, 11, 0, Math.PI * 2);
  c.stroke();
  text(c, font, '$', 152, 132, 92);
  c.restore();
}

const SHAPES: Record<string, Shape> = {
  // Price: a price tag with a markup stuck on top...
  tagMarkup: {
    draw: tag,
    extra: (c, font) => {
      text(c, font, '+%', 196, 40, 64);
    },
  },
  // ...that flies away (built from tagMarkup, see below).
  tag: { draw: tag },

  // How it works.
  plug: {
    draw: (c) => {
      c.lineCap = 'round';
      rounded(c, 26, 96, 74, 64, 14);
      c.lineWidth = 8;
      c.stroke();
      line(c, [[100, 113], [124, 113]], 9);
      line(c, [[100, 143], [124, 143]], 9);
      line(c, [[26, 128], [6, 128]], 8);
      rounded(c, 150, 70, 96, 116, 18);
      c.lineWidth = 8;
      c.stroke();
      c.fillRect(168, 106, 22, 10);
      c.fillRect(168, 140, 22, 10);
    },
  },
  chat: {
    draw: (c) => {
      c.lineWidth = 8;
      c.lineJoin = 'round';
      c.beginPath();
      c.roundRect(30, 46, 196, 128, 34);
      c.stroke();
      c.beginPath();
      c.moveTo(72, 172);
      c.lineTo(56, 216);
      c.lineTo(112, 172);
      c.stroke();
      dot(c, 86, 110, 12);
      dot(c, 128, 110, 12);
      dot(c, 170, 110, 12);
    },
  },
  link: {
    draw: (c) => {
      c.save();
      c.translate(C, C);
      c.rotate(-0.72);
      c.lineWidth = 11;
      c.beginPath();
      c.roundRect(-112, -30, 128, 60, 30);
      c.stroke();
      c.beginPath();
      c.roundRect(-16, -30, 128, 60, 30);
      c.stroke();
      c.restore();
    },
  },
  hub: {
    draw: (c) => {
      c.lineWidth = 9;
      c.beginPath();
      c.arc(C, C, 52, 0, Math.PI * 2);
      c.stroke();
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
        const x = C + Math.cos(a) * 108;
        const y = C + Math.sin(a) * 108;
        line(c, [[C + Math.cos(a) * 62, C + Math.sin(a) * 62], [C + Math.cos(a) * 92, C + Math.sin(a) * 92]], 3);
        dot(c, x, y, 11);
      }
    },
  },

  // What it does.
  search: {
    draw: (c) => {
      c.lineCap = 'round';
      c.lineWidth = 11;
      c.beginPath();
      c.arc(108, 108, 62, 0, Math.PI * 2);
      c.stroke();
      line(c, [[154, 154], [218, 218]], 20);
    },
  },
  lines: {
    draw: (c) => {
      c.lineCap = 'round';
      const widths = [180, 200, 150, 190, 104];
      widths.forEach((w, i) => line(c, [[28, 52 + i * 38], [28 + w, 52 + i * 38]], 13));
      line(c, [[148, 196], [148, 220]], 6);
    },
  },
  picture: {
    draw: (c) => {
      c.lineWidth = 8;
      rounded(c, 22, 44, 212, 168, 18);
      c.stroke();
      c.beginPath();
      c.moveTo(40, 196);
      c.lineTo(104, 108);
      c.lineTo(146, 160);
      c.lineTo(176, 128);
      c.lineTo(218, 196);
      c.closePath();
      c.fill();
      dot(c, 178, 86, 17);
    },
  },
  clapper: {
    draw: (c) => {
      c.lineWidth = 8;
      c.lineJoin = 'round';
      rounded(c, 34, 104, 188, 112, 12);
      c.stroke();
      c.save();
      c.translate(34, 98);
      c.rotate(-0.22);
      c.beginPath();
      c.rect(0, -38, 188, 34);
      c.stroke();
      for (let x = 20; x < 180; x += 40) {
        c.beginPath();
        c.moveTo(x, -4);
        c.lineTo(x + 20, -38);
        c.lineTo(x + 34, -38);
        c.lineTo(x + 14, -4);
        c.fill();
      }
      c.restore();
      c.beginPath();
      c.moveTo(108, 132);
      c.lineTo(108, 190);
      c.lineTo(156, 161);
      c.closePath();
      c.fill();
    },
  },
  download: {
    draw: (c) => {
      c.lineCap = 'round';
      c.lineJoin = 'round';
      line(c, [[C, 26], [C, 156]], 13);
      line(c, [[74, 104], [C, 160], [182, 104]], 13);
      line(c, [[30, 172], [30, 222], [226, 222], [226, 172]], 10);
    },
  },

  // Paying.
  calendar: {
    draw: (c) => {
      c.lineCap = 'round';
      c.lineWidth = 8;
      rounded(c, 38, 54, 180, 164, 16);
      c.stroke();
      line(c, [[38, 96], [218, 96]], 6);
      line(c, [[86, 36], [86, 70]], 10);
      line(c, [[170, 36], [170, 70]], 10);
      for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) dot(c, 70 + k * 39, 128 + r * 32, 6);
      line(c, [[24, 232], [232, 24]], 12);
    },
  },
  battery: {
    draw: (c) => {
      c.lineWidth = 8;
      rounded(c, 26, 78, 182, 100, 16);
      c.stroke();
      rounded(c, 208, 106, 22, 44, 6);
      c.fill();
      for (let i = 0; i < 4; i++) {
        rounded(c, 44 + i * 40, 96, 30, 64, 6);
        c.fill();
      }
    },
  },
  gauge: {
    draw: (c) => {
      c.lineCap = 'round';
      c.lineWidth = 10;
      c.beginPath();
      c.arc(C, 164, 104, Math.PI, Math.PI * 2);
      c.stroke();
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI + (i / 8) * Math.PI;
        line(c, [[C + Math.cos(a) * 80, 164 + Math.sin(a) * 80], [C + Math.cos(a) * 90, 164 + Math.sin(a) * 90]], 4);
      }
      // The limit you set: a marker standing outside the dial.
      const limit = Math.PI * 1.78;
      line(c, [[C + Math.cos(limit) * 112, 164 + Math.sin(limit) * 112], [C + Math.cos(limit) * 136, 164 + Math.sin(limit) * 136]], 12);
      const needle = Math.PI * 1.42;
      line(c, [[C, 164], [C + Math.cos(needle) * 78, 164 + Math.sin(needle) * 78]], 9);
      dot(c, C, 164, 14);
    },
  },

  // Open source.
  code: { draw: (c, font) => text(c, font, '</>', C, C, 118) },
  zero: { draw: (c, font) => text(c, font, '$0', C, C + 4, 150) },
  fork: {
    draw: (c) => {
      c.lineCap = 'round';
      c.lineWidth = 7;
      c.beginPath();
      c.moveTo(C, 52);
      c.lineTo(C, 196);
      c.moveTo(C, 92);
      c.bezierCurveTo(C, 140, 52, 130, 52, 196);
      c.moveTo(C, 92);
      c.bezierCurveTo(C, 140, 204, 130, 204, 196);
      c.stroke();
      dot(c, C, 40, 18);
      dot(c, 52, 206, 15);
      dot(c, C, 206, 15);
      dot(c, 204, 206, 15);
    },
  },
  heart: {
    draw: (c) => {
      c.lineWidth = 10;
      c.lineJoin = 'round';
      c.beginPath();
      for (let i = 0; i <= 120; i++) {
        const t = (i / 120) * Math.PI * 2;
        const x = 16 * Math.sin(t) ** 3;
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        const px = C + x * 6.4;
        const py = C - 8 - y * 6.4;
        if (i) c.lineTo(px, py);
        else c.moveTo(px, py);
      }
      c.stroke();
    },
  },

  // Safety.
  key: {
    draw: (c) => {
      c.lineCap = 'round';
      c.lineWidth = 11;
      c.beginPath();
      c.arc(72, C, 44, 0, Math.PI * 2);
      c.stroke();
      dot(c, 72, C, 12);
      line(c, [[116, C], [230, C]], 13);
      line(c, [[196, C], [196, 166]], 12);
      line(c, [[222, C], [222, 156]], 12);
    },
  },
  lock: {
    draw: (c) => {
      c.lineWidth = 12;
      c.beginPath();
      c.arc(C, 104, 50, Math.PI, Math.PI * 2);
      c.moveTo(78, 104);
      c.lineTo(78, 118);
      c.moveTo(178, 104);
      c.lineTo(178, 118);
      c.stroke();
      c.lineWidth = 9;
      rounded(c, 54, 118, 148, 112, 18);
      c.stroke();
      dot(c, C, 162, 13);
      c.fillRect(C - 5, 166, 10, 34);
    },
  },
};

/** Shape order. The landing's scroll timelines move `cosmos.form` along these indices. */
export const FORMS = [
  'tagMarkup', 'tag',
  'plug', 'chat', 'link', 'hub',
  'search', 'lines', 'picture', 'clapper', 'download',
  'calendar', 'battery', 'gauge',
  'code', 'zero', 'fork', 'heart',
  'key', 'lock',
] as const;

export type FormName = (typeof FORMS)[number];
export const form = (name: FormName) => FORMS.indexOf(name);

function pixels(draw: (c: Ctx, font: string) => void, font: string): number[] {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const c = canvas.getContext('2d', { willReadFrequently: true })!;
  c.fillStyle = c.strokeStyle = '#fff';
  draw(c, font);
  const data = c.getImageData(0, 0, SIZE, SIZE).data;
  const lit: number[] = [];
  for (let i = 0; i < SIZE * SIZE; i++) if (data[i * 4 + 3] > 110) lit.push(i);
  return lit;
}

/**
 * Samples every shape into `count` stars: x, y (about -1..1, y up),
 * brightness, and a spare channel. Faint dust fills out the count around the
 * shape. Stars are ordered by angle so neighbouring shapes trade stars with
 * their neighbours and the morph flows instead of scrambling.
 */
export function buildForms(count: number, font: string, random: () => number): Float32Array {
  const out = new Float32Array(FORMS.length * count * 4);
  const dust = Math.round(count * 0.1);
  let previous: { x: number; y: number; b: number; extra: boolean }[] = [];

  FORMS.forEach((name, s) => {
    let stars: typeof previous;
    if (name === 'tag') {
      // Same stars as tagMarkup; the markup's stars drift off into the dark.
      stars = previous.map((star) => {
        if (!star.extra) return star;
        const a = Math.atan2(star.y, star.x) + (random() - 0.5) * 0.8;
        const r = 1.6 + random() * 1.4;
        return { x: Math.cos(a) * r, y: Math.sin(a) * r, b: 0, extra: false };
      });
    } else {
      const shape = SHAPES[name];
      const main = pixels(shape.draw, font);
      const extra = shape.extra ? pixels(shape.extra, font) : [];
      const lit = count - dust;
      const extraCount = Math.round((lit * extra.length) / (main.length + extra.length));
      const pick = (from: number[], isExtra: boolean) => {
        const p = from[Math.floor(random() * from.length)];
        return {
          x: ((p % SIZE) + random() - C) / (C - 10),
          y: (C - Math.floor(p / SIZE) - random()) / (C - 10),
          b: 0.7 + random() * 0.3,
          extra: isExtra,
        };
      };
      stars = [];
      for (let i = 0; i < lit; i++) stars.push(i < extraCount ? pick(extra, true) : pick(main, false));
      for (let i = 0; i < dust; i++) {
        const a = random() * Math.PI * 2;
        const r = 1.15 + random() ** 0.6 * 0.7;
        stars.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * 0.8, b: 0.12 + random() * 0.12, extra: false });
      }
      stars.sort((p, q) => Math.atan2(p.y, p.x) - Math.atan2(q.y, q.x));
    }
    stars.forEach((star, i) => out.set([star.x, star.y, star.b, 0], (s * count + i) * 4));
    previous = stars;
  });
  return out;
}
