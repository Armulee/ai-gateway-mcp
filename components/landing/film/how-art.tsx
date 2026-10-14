import { logoSrc } from '../provider-logos';
import { seeded, Spark } from './star-defs';

// How it works, as one request's journey: a chat window gains a connector, you
// type a prompt, it leaves as a comet, passes through your private link (the
// secret turns to dots), enters AI Gateway's ring, which reaches out to the
// providers, and the picture comes back into the chat. Resting state: all of it
// drawn, which still reads as a diagram.

const RING = { x: 300, y: 450, r: 70 };
const NODES = [
  { id: 'openai', angle: 200 },
  { id: 'anthropic', angle: 160 },
  { id: 'google', angle: 120 },
  { id: 'bfl', angle: 60, chosen: true },
  { id: 'klingai', angle: 20 },
  { id: 'alibaba', angle: 340 },
].map((node) => {
  const a = (node.angle * Math.PI) / 180;
  const at = (r: number) => ({ x: RING.x + Math.cos(a) * r, y: RING.y + Math.sin(a) * r });
  return { ...node, ...at(130), from: at(RING.r + 4), to: at(130 - 22), src: logoSrc(node.id) };
});

// The picture that comes back: a field of star pixels inside a frame.
const random = seeded(5);
const PIXELS = Array.from({ length: 12 * 6 }, (_, i) => ({ x: 58 + (i % 12) * 11.5, y: 132 + Math.floor(i / 12) * 11, o: 0.25 + random() * 0.75 }));

export function HowArt() {
  return (
    <svg className="film" viewBox="0 0 600 600" aria-hidden="true">
      {/* Chat window */}
      <path className="ln" data-h="chat" d="M48,20 H312 A18,18 0 0 1 330,38 V242 A18,18 0 0 1 312,260 H48 A18,18 0 0 1 30,242 V38 A18,18 0 0 1 48,20 Z" />
      <line className="ln dim" x1={30} y1={54} x2={330} y2={54} data-h="chat-bar" />
      <g data-h="chat-dots">
        <circle className="fill" cx={50} cy={37} r={3.2} />
        <circle className="fill dim" cx={64} cy={37} r={3.2} />
        <circle className="fill dim" cx={78} cy={37} r={3.2} />
      </g>
      <text className="mono tiny dim" x={300} y={41} textAnchor="end" data-h="chat-title">
        Claude / ChatGPT
      </text>

      {/* The connector docks onto the chat */}
      <g data-h="connector">
        <rect className="ln pill" x={318} y={84} width={124} height={30} rx={15} />
        <Spark x={336} y={99} size={14} />
        <text className="mono tiny" x={350} y={103}>
          connector
        </text>
      </g>

      {/* Your prompt */}
      <rect className="ln" x={46} y={212} width={268} height={32} rx={10} data-h="input" />
      <text className="mono small" x={60} y={233} data-h="typing">
        Draw a fox in the snow
      </text>
      <path className="ln" d="M292,222 L302,228 L292,234" data-h="send" />
      <g data-h="bubble">
        <rect className="ln bubble" x={130} y={70} width={184} height={34} rx={12} />
        <text className="mono small" x={144} y={92}>
          Draw a fox in the snow
        </text>
      </g>

      {/* The picture that comes back */}
      <g data-h="reply">
        <path className="ln" d="M54,120 H188 A8,8 0 0 1 196,128 V194 A8,8 0 0 1 188,202 H54 A8,8 0 0 1 46,194 V128 A8,8 0 0 1 54,120 Z" data-h="frame" />
        <g data-h="pixels">
          {PIXELS.map((p, i) => (
            <circle key={i} className="fill" cx={p.x} cy={p.y} r={1.6} opacity={p.o} />
          ))}
        </g>
        <path className="ln" d="M52,196 L92,152 L116,176 L140,158 L190,196" data-h="mountains" />
        <circle className="fill" cx={168} cy={140} r={7} data-h="moon" />
      </g>

      {/* Your private link */}
      <g data-h="link">
        <rect className="ln" x={250} y={252} width={330} height={32} rx={16} data-h="link-pill" />
        <text className="mono small" x={268} y={273}>
          <tspan className="dim">you.vercel.app/mcp/</tspan>
          <tspan data-h="secret">k9X2pQ7mZ</tspan>
        </text>
      </g>

      {/* AI Gateway: a ring that reaches out to the providers */}
      <circle className="ln ring" cx={RING.x} cy={RING.y} r={RING.r} data-h="ring" />
      <circle className="ln ring" cx={RING.x} cy={RING.y} r={RING.r} data-h="pulse" opacity={0} />
      <text className="mono tiny" x={RING.x} y={RING.y + 4} textAnchor="middle" data-h="ring-label">
        AI Gateway
      </text>
      {NODES.map((node) => (
        <g key={node.id}>
          <line className="ln dim" x1={node.from.x} y1={node.from.y} x2={node.to.x} y2={node.to.y} data-h="spoke" />
          <g data-h={node.chosen ? 'chosen' : 'node'}>
            <circle className="ln node" cx={node.x} cy={node.y} r={20} />
            {node.src && <image className="logo" href={node.src} x={node.x - 10} y={node.y - 10} width={20} height={20} />}
          </g>
        </g>
      ))}

      <g data-h="bill">
        <rect className="ln pill" x={20} y={298} width={246} height={30} rx={15} />
        <Spark x={38} y={313} size={14} />
        <text className="mono tiny" x={52} y={317}>
          billed to your Vercel account
        </text>
      </g>

      {/* Routes the comets fly */}
      <path className="route" d="M314,92 C420,80 480,170 430,268" data-h="route-out" />
      <path className="route" d="M430,268 C392,342 330,350 300,378" data-h="route-in" />
      <path className="route" d="M380,545 C480,520 560,420 530,300 C505,200 380,170 198,160" data-h="route-back" />

      <g data-h="comet" className="comet">
        <line x1={-46} y1={0} x2={0} y2={0} stroke="url(#tail)" strokeWidth={3} strokeLinecap="round" />
        <use href="#spark" x={-11} y={-11} width={22} height={22} filter="url(#glow)" />
      </g>
      <Spark data-h="head" className="head" />
    </svg>
  );
}
