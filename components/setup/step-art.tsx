import type { StepId } from '@/lib/status';
import { Spark } from '../motion/star-defs';

// One small drawing per setup step, in the landing's style: white hairlines
// and points of light. Lines marked data-draw draw themselves when the step
// scrolls into view; a star rides any data-route. Without motion they rest
// finished.

const ART: Record<StepId, React.ReactNode> = {
  // Your copy goes up on Vercel: the triangle, a launch trail, a few stars.
  deploy: (
    <>
      <path className="ln" data-draw d="M120,28 L182,128 H58 Z" />
      <path className="ln dim" data-draw d="M30,140 H210" />
      <path className="route" data-route d="M120,128 C120,100 120,70 120,32" />
      <circle className="fill" cx={62} cy={42} r={2} />
      <circle className="fill dim" cx={186} cy={56} r={1.6} />
      <circle className="fill" cx={200} cy={26} r={1.4} />
    </>
  ),
  // A key, and the secret it stands for, already turned to dots.
  secret: (
    <>
      <circle className="ln" data-draw cx={64} cy={80} r={26} />
      <path className="ln" data-draw d="M90,80 H170 M150,80 V98 M166,80 V94" />
      <path className="ln dim" data-draw d="M110,120 H214 A14,14 0 0 1 214,148 H110 A14,14 0 0 1 110,120 Z" />
      <text className="mono small" x={162} y={139} textAnchor="middle" data-dots>
        ••••••••
      </text>
    </>
  ),
  // A comet arrives at AI Gateway's ring: signed in, no key.
  gateway: (
    <>
      <circle className="ln" data-draw cx={160} cy={80} r={42} />
      <circle className="ln dim" data-draw cx={160} cy={80} r={54} />
      <path className="route" data-route d="M16,34 C60,40 90,70 118,78" />
      <text className="mono tiny" x={160} y={84} textAnchor="middle">
        OIDC
      </text>
    </>
  ),
  // A file drops into a store.
  blob: (
    <>
      <ellipse className="ln" data-draw cx={120} cy={92} rx={58} ry={14} />
      <path className="ln" data-draw d="M62,92 V128 A58,14 0 0 0 178,128 V92" />
      <path className="ln dim" data-draw d="M62,110 A58,14 0 0 0 178,110" />
      <g data-drop>
        <path className="ln" d="M106,22 H128 L138,32 V62 H106 Z M128,22 V32 H138" />
      </g>
    </>
  ),
  // A credit meter, topped up, and a budget line it cannot pass.
  credits: (
    <>
      <rect className="ln" data-draw x={92} y={24} width={56} height={116} rx={12} />
      <rect className="meter-fill" data-fill x={99} y={62} width={42} height={71} rx={7} />
      <path className="ln budget" data-draw d="M40,52 H200" />
      <text className="mono tiny" x={40} y={44}>
        budget
      </text>
      <path className="ln" data-draw d="M182,52 V46 A8,8 0 0 1 198,46 V52 M178,52 H202 V68 H178 Z" />
    </>
  ),
  // Your link: a comet runs through it and it lights up.
  connect: (
    <>
      <path className="ln" data-draw d="M42,62 H198 A18,18 0 0 1 198,98 H42 A18,18 0 0 1 42,62 Z" />
      <text className="mono tiny" x={120} y={84} textAnchor="middle">
        you.vercel.app/mcp/••••
      </text>
      <path className="route" data-route d="M14,80 C30,80 30,80 46,80 H226" />
      <path className="ln dim" data-draw d="M60,124 H180" />
    </>
  ),
  // A chat window, and the connector clicking into it.
  chat: (
    <>
      <path className="ln" data-draw d="M44,24 H166 A12,12 0 0 1 178,36 V124 A12,12 0 0 1 166,136 H44 A12,12 0 0 1 32,124 V36 A12,12 0 0 1 44,24 Z" />
      <path className="ln dim" data-draw d="M32,46 H178" />
      <circle className="fill" cx={44} cy={35} r={2.4} />
      <circle className="fill dim" cx={54} cy={35} r={2.4} />
      <path className="ln dim" data-draw d="M48,66 H120 M48,82 H150 M48,98 H104" />
      <g data-dock>
        <rect className="ln pill" x={170} y={60} width={58} height={22} rx={11} />
        <Spark x={182} y={71} size={11} />
        <text className="mono tiny" x={192} y={75}>
          MCP
        </text>
      </g>
    </>
  ),
};

export function StepArt({ id }: { id: StepId }) {
  return (
    <svg className="film step-art" viewBox="0 0 240 160" aria-hidden="true" data-art={id}>
      {ART[id]}
      <Spark className="head" data-head />
    </svg>
  );
}
