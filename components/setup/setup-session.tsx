'use client';

import { useEffect } from 'react';
import { clearGatewayOpen, markGatewayOpen, restoreChatAdded, restoreSecret, useSetup } from './setup-store';
import { useStepStates, type StepView } from './steps';

/**
 * Keeps the page's "gateway open" mode honest, with or without the guide on
 * screen. It restores this browser's remembered secret (which loads usage) and
 * chat-app note; marks the gateway open once every required step is done; and
 * when an open page finds its remembered secret no longer matches MCP_SECRET,
 * clears the mark and reloads so the guide comes back.
 */
export function SetupSession({ steps, open }: { steps: StepView[]; open: boolean }) {
  const { stats } = useSetup();
  const states = useStepStates(steps);
  const complete = states.every((state, i) => state === 'done' || steps[i].optional);
  const secretSet = steps.some((step) => step.id === 'secret' && step.state === 'done');

  useEffect(() => {
    restoreSecret(secretSet);
    restoreChatAdded();
  }, [secretSet]);

  useEffect(() => {
    if (!open && complete) markGatewayOpen();
  }, [open, complete]);

  const mismatch = stats.state === 'fail' && stats.mismatch === true;
  useEffect(() => {
    if (!mismatch) return;
    clearGatewayOpen();
    if (open) window.location.reload();
  }, [mismatch, open]);

  return null;
}
