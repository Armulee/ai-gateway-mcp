'use client';

import { useEffect } from 'react';
import type { StepId, StepState } from '@/lib/status';
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

/** One step of the guide; its look follows the live state, and so does its star on the rail. */
export function GuideStep({ steps, index, children }: { steps: StepView[]; index: number; children: React.ReactNode }) {
  const state = useStepStates(steps)[index];
  const { id, optional } = steps[index];

  useEffect(() => {
    document.querySelector(`[data-rail="${id}"]`)?.classList.toggle('is-done', state === 'done');
  }, [id, state]);

  return (
    <li className={`guide-step is-${state}`} id={id} data-chapter={id} data-step-state={state}>
      <span className="guide-badge" aria-hidden="true">
        {state === 'done' ? (
          <svg viewBox="0 0 24 24">
            <path d="M6 12.5 L10.5 17 L18 8" data-tick />
          </svg>
        ) : (
          String(index + 1).padStart(2, '0')
        )}
      </span>
      <span className="sr-only">{state === 'done' ? 'Done: ' : state === 'next' ? 'Next step: ' : optional ? 'Optional: ' : 'To do: '}</span>
      {children}
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
