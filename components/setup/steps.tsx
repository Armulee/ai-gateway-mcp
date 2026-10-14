'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { StepId, StepState } from '@/lib/status';
import { scrollToHash } from '../motion/smooth-scroll';
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
        {state === 'done' ? (
          <svg viewBox="0 0 24 24">
            <path d="M6 12.5 L10.5 17 L18 8" data-tick />
          </svg>
        ) : (
          String(index + 1).padStart(2, '0')
        )}
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

const RING = { c: 110, r: 88, gap: 7 };

function arc(i: number, total: number) {
  const span = 360 / total;
  const from = ((i * span + RING.gap / 2 - 90) * Math.PI) / 180;
  const to = (((i + 1) * span - RING.gap / 2 - 90) * Math.PI) / 180;
  const point = (a: number) => `${(RING.c + Math.cos(a) * RING.r).toFixed(2)},${(RING.c + Math.sin(a) * RING.r).toFixed(2)}`;
  return `M${point(from)} A${RING.r},${RING.r} 0 0 1 ${point(to)}`;
}

/** The overview: a ring with one arc per step, lit as steps are done, and what to do next. */
export function Progress({ steps }: { steps: StepView[] }) {
  const states = useStepStates(steps);
  const done = states.filter((s) => s === 'done').length;
  const next = states.indexOf('next');
  return (
    <div className="progress-block">
      <svg className="film progress-ring" viewBox="0 0 220 220" aria-hidden="true">
        <circle className="ln dim" cx={RING.c} cy={RING.c} r={RING.r - 14} />
        {steps.map((step, i) => (
          <path key={step.id} className={`ring-arc is-${states[i]}`} d={arc(i, steps.length)} data-arc />
        ))}
        <text className="ring-count" x={RING.c} y={RING.c + 8} textAnchor="middle">
          {done}/{steps.length}
        </text>
        <text className="mono tiny" x={RING.c} y={RING.c + 32} textAnchor="middle">
          STEPS DONE
        </text>
      </svg>
      <div className="progress-copy">
        <h1 className="setup-title">
          {next === -1 ? 'You are all set.' : done === 0 ? 'Let’s set up your copy.' : `${done} of ${steps.length} done.`}
        </h1>
        <p className="setup-lead">
          {next === -1
            ? 'Your chat app can use every model on AI Gateway now. Your usage is below.'
            : `Next: ${steps[next].title.toLowerCase()}. Each step below says what to do, and ticks itself off when it is done.`}
        </p>
        {next !== -1 && (
          <a className="btn btn-primary" href={`#${steps[next].id}`}>
            Go to the next step
          </a>
        )}
        {next === -1 && (
          <a className="btn btn-primary" href="#usage">
            See your usage
          </a>
        )}
      </div>
    </div>
  );
}
