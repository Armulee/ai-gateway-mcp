'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { StepId, StepState } from '@/lib/status';
import { isReload, scrollToHash } from '../motion/smooth-scroll';
import { appsInUse, useSetup } from './setup-store';

export type StepView = { id: StepId; title: string; state: StepState; optional?: boolean };
export type LiveState = 'done' | 'next' | 'todo';

/**
 * Server checks cover the first four steps; this browser confirms the last
 * two (a link that tested fine; a chat app that has used it, or the owner
 * saying they added it). The first step
 * not done, skipping optional ones, is "next".
 */
export function useStepStates(steps: StepView[]): LiveState[] {
  const { connected, chatAdded, stats } = useSetup();
  const done = steps.map((step) => {
    if (step.id === 'connect') return connected;
    if (step.id === 'chat') return chatAdded || appsInUse(stats).length > 0;
    return step.state === 'done';
  });
  const next = done.findIndex((isDone, i) => !isDone && !steps[i].optional);
  return done.map((isDone, i) => (isDone ? 'done' : i === next ? 'next' : 'todo'));
}

/** Asks the guide to open one step (the arch's stones send it). */
export const OPEN_STEP = 'setup:open-step';

const FocusContext = createContext<{ open: StepId | null; toggle: (id: StepId) => void }>({ open: null, toggle: () => {} });

/** Brings a step's header into view once the cards have finished moving. */
function revealLater(id: StepId) {
  setTimeout(() => {
    const top = document.getElementById(id)?.getBoundingClientRect().top ?? 0;
    if (top < 72 || top > window.innerHeight * 0.6) scrollToHash(`#${id}`);
  }, 650);
}

/**
 * The guide in focus mode: one step open at a time, the next one by default.
 * When the open step gets done, it folds and the step after it opens.
 */
export function GuideFocus({ steps, children }: { steps: StepView[]; children: React.ReactNode }) {
  const states = useStepStates(steps);
  const next = steps[states.indexOf('next')]?.id ?? null;
  const [open, setOpen] = useState<StepId | null>(next);
  const seen = useRef(states);
  const key = states.join();

  useEffect(() => {
    const i = steps.findIndex((step) => step.id === open);
    if (i !== -1 && states[i] === 'done' && seen.current[i] !== 'done') {
      setOpen(next);
      if (next) revealLater(next);
    }
    seen.current = states;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // A stone in the arch (or a link like /#secret) opens its step outright.
  useEffect(() => {
    const show = (id: string) => {
      if (!steps.some((step) => step.id === id)) return;
      setOpen(id as StepId);
      revealLater(id as StepId);
    };
    // On a reload the page goes back to the top instead (smooth-scroll.tsx).
    const fromHash = isReload() ? '' : window.location.hash.slice(1);
    if (fromHash) show(fromHash);
    const onOpen = (event: Event) => show((event as CustomEvent<string>).detail);
    window.addEventListener(OPEN_STEP, onOpen);
    return () => window.removeEventListener(OPEN_STEP, onOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(id: StepId) {
    setOpen((current) => (current === id ? null : id));
    revealLater(id);
  }

  return (
    <FocusContext.Provider value={{ open, toggle }}>
      <ol className="guide">{children}</ol>
    </FocusContext.Provider>
  );
}

/** One step: a one-line header that opens to what to do. Its look follows the live state, and so does its star on the rail. */
export function GuideStep({ steps, index, children }: { steps: StepView[]; index: number; children: React.ReactNode }) {
  const state = useStepStates(steps)[index];
  const { id, title, optional } = steps[index];
  const focus = useContext(FocusContext);
  const open = focus.open === id;

  useEffect(() => {
    document.querySelector(`[data-rail="${id}"]`)?.classList.toggle('is-done', state === 'done');
  }, [id, state]);

  return (
    <li className={`guide-step is-${state}${open ? ' is-open' : ''}`} id={id} data-chapter={id} data-step-state={state}>
      <span className="guide-badge" aria-hidden="true">
        <MiniArch index={index} state={state} />
      </span>
      <div className="step-card">
        <h2 className="step-heading">
          <button type="button" className="step-head" aria-expanded={open} aria-controls={`${id}-body`} onClick={() => focus.toggle(id)}>
            <span className="sr-only">{state === 'done' ? 'Done: ' : state === 'next' ? 'Next step: ' : optional ? 'Optional: ' : 'To do: '}</span>
            <span className="step-title">{title}</span>
            <StepTag steps={steps} index={index} />
            <svg className="step-chevron" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 6 8 10 12 6" />
            </svg>
          </button>
        </h2>
        <div className="step-body" id={`${id}-body`} inert={!open}>
          <div className="step-body-inner">{children}</div>
        </div>
      </div>
    </li>
  );
}

/** "Next", "Done" or "Optional" beside a step's title. */
export function StepTag({ steps, index }: { steps: StepView[]; index: number }) {
  const state = useStepStates(steps)[index];
  if (state === 'todo') return steps[index].optional ? <span className="step-tag">Optional</span> : null;
  return <span className={`step-tag is-${state}`}>{state === 'done' ? 'Done' : 'Next'}</span>;
}

// The overview draws the project's own mark: a gateway arch with a point of
// light passing through it. Its six stones are the six steps, set from the
// bottom left, over the top, down to the bottom right. Set stones glow, the
// next one breathes, the rest are star dust. With all six set, the point lights
// up and shoots through: the gateway is open.

const ARCH = { cx: 200, cy: 210, outer: 168, inner: 104, foot: 420, gap: 6 };

type Stone = { d: string; label: { x: number; y: number; anchor: 'start' | 'middle' | 'end' } };

function polar(r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [ARCH.cx + r * Math.cos(a), ARCH.cy - r * Math.sin(a)];
}

const f = (n: number) => n.toFixed(1);

/** Six stones: two in each leg, two in the curve. */
function stones(): Stone[] {
  const { cx, cy, outer, inner, foot, gap } = ARCH;
  const mid = cy + (foot - cy) / 2;
  const leg = (left: boolean, top: number, bottom: number): Stone => {
    const [x0, x1] = left ? [cx - outer, cx - inner] : [cx + inner, cx + outer];
    return {
      d: `M${f(x0)},${f(top)} H${f(x1)} V${f(bottom)} H${f(x0)} Z`,
      label: { x: left ? x0 - 14 : x1 + 14, y: (top + bottom) / 2 + 4, anchor: left ? 'end' : 'start' },
    };
  };
  const curve = (from: number, to: number, side: 'start' | 'end'): Stone => {
    const g = (gap / inner) * (180 / Math.PI) * 0.5;
    const [a, b] = [from - g, to + g];
    const [o0, o1, i1, i0] = [polar(outer, a), polar(outer, b), polar(inner, b), polar(inner, a)];
    const at = polar(outer + 18, (a + b) / 2);
    return {
      d: `M${f(o0[0])},${f(o0[1])} A${outer},${outer} 0 0 1 ${f(o1[0])},${f(o1[1])} L${f(i1[0])},${f(i1[1])} A${inner},${inner} 0 0 0 ${f(i0[0])},${f(i0[1])} Z`,
      label: { x: at[0], y: at[1], anchor: side },
    };
  };
  return [
    leg(true, mid + gap / 2, foot),
    leg(true, cy + gap / 2, mid - gap / 2),
    curve(180, 90, 'end'),
    curve(90, 0, 'start'),
    leg(false, cy + gap / 2, mid - gap / 2),
    leg(false, mid + gap / 2, foot),
  ];
}

const SHORT: Record<StepId, string> = {
  deploy: 'Deploy',
  secret: 'Secret',
  gateway: 'AI Gateway',
  blob: 'Storage',
  connect: 'Your link',
  chat: 'Chat app',
};

/** A step's badge: the whole arch, small, with this step's own stone lit. */
export function MiniArch({ index, state }: { index: number; state: LiveState }) {
  return (
    <svg className="mini-arch" viewBox="0 0 400 440">
      {stones().map((stone, i) => (
        <path key={i} d={stone.d} className={i === index ? `is-this is-${state}` : undefined} />
      ))}
    </svg>
  );
}

/** The arch itself. Each stone links to its step. */
export function GatewayArch({ steps, states, guide = true }: { steps: StepView[]; states: LiveState[]; guide?: boolean }) {
  const open = states.every((s, i) => s === 'done' || steps[i].optional);
  const point = ARCH.cy + (ARCH.foot - ARCH.cy) * 0.42;
  return (
    <svg className={`film arch${open ? ' is-open' : ''}`} viewBox="0 0 400 440" role="group" aria-label="Setup progress" data-arch>
      <defs>
        <linearGradient id="arch-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {open && <rect className="arch-beam" x={ARCH.cx - 1.5} y={-40} width={3} height={520} fill="url(#arch-beam)" data-arch-beam />}
      {stones().map((stone, i) => {
        const step = steps[i];
        const state = states[i];
        return (
          <a
            key={step.id}
            // With the guide hidden, a stone brings it back at that step.
            href={guide ? `#${step.id}` : `/?steps#${step.id}`}
            onClick={guide ? () => window.dispatchEvent(new CustomEvent(OPEN_STEP, { detail: step.id })) : undefined}
            className={`arch-stone is-${state}`} aria-label={`Step ${i + 1}, ${step.title}: ${state === 'done' ? 'done' : state === 'next' ? 'next' : step.optional ? 'optional' : 'to do'}`} data-stone>
            <path d={stone.d} />
            <text className="arch-label" x={stone.label.x} y={stone.label.y} textAnchor={stone.label.anchor}>
              {SHORT[step.id]}
            </text>
          </a>
        );
      })}
      <g className="arch-point" transform={`translate(${ARCH.cx} ${point})`} data-arch-point>
        <circle className="arch-point-halo" r={30} />
        <circle className="arch-point-core" r={13} />
      </g>
    </svg>
  );
}

/**
 * With the gateway open, the browser steps were confirmed on an earlier visit:
 * every required stone is set; optional ones keep their own state.
 */
export function settle(steps: StepView[], live: LiveState[]): LiveState[] {
  return steps.map((step, i) => (step.optional ? (live[i] === 'done' ? 'done' : 'todo') : 'done'));
}

/** The overview: the arch on one side, where you are and what to do next on the other. */
export function Progress({ steps, settled = false, guide = true }: { steps: StepView[]; settled?: boolean; guide?: boolean }) {
  const live = useStepStates(steps);
  const states = settled ? settle(steps, live) : live;
  const done = states.filter((s) => s === 'done').length;
  const next = states.indexOf('next');
  return (
    <div className="progress-block">
      <div className="progress-copy">
        <h1 className="setup-title">
          {next === -1 ? (
            <>
              Your gateway
              <br />
              is open.
            </>
          ) : (
            <>
              Build your gateway.
              <br />
              <span className="dim">
                {done} of {steps.length} done.
              </span>
            </>
          )}
        </h1>
        <p className="setup-lead">
          {next === -1
            ? 'Every model on AI Gateway now runs from your chat app. Your usage is below.'
            : `Six steps, one stone each. Next: ${steps[next].title.toLowerCase()}.`}
        </p>
        <a className="btn btn-primary" href={next === -1 ? '#usage' : `#${steps[next].id}`} data-magnetic>
          {next === -1 ? 'See your usage' : 'Go to the next step'}
        </a>
      </div>
      <div className="progress-art" data-arch-stage>
        <GatewayArch steps={steps} states={states} guide={guide} />
      </div>
    </div>
  );
}
