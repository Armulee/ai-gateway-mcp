'use client';

import { useSyncExternalStore } from 'react';
import type { Stats } from '@/lib/stats';

// Browser-side state of the setup page: the owner's secret (kept in this
// browser only if they choose), whether the link has been tested, and the
// usage stats it unlocks. The secret is only ever sent to this deployment:
// to its MCP endpoint (Test connection) and to /api/stats (usage).

const KEY = 'ai-gateway-mcp:secret';
const CHAT_KEY = 'ai-gateway-mcp:chat-added';

export type StatsState =
  | { state: 'locked' }
  | { state: 'loading' }
  | { state: 'ready'; stats: Stats }
  | { state: 'fail'; message: string };

type SetupState = {
  secret: string;
  remember: boolean;
  connected: boolean;
  /** The owner said they added the link to a chat app (for when usage can't confirm it). */
  chatAdded: boolean;
  stats: StatsState;
};

let state: SetupState = { secret: '', remember: true, connected: false, chatAdded: false, stats: { state: 'locked' } };
const listeners = new Set<() => void>();
const SERVER_STATE = state;

function set(patch: Partial<SetupState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

export function useSetup(): SetupState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => SERVER_STATE,
  );
}

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Restores a remembered secret, then confirms it by loading usage. */
export function restoreSecret() {
  const saved = storage()?.getItem(KEY);
  if (saved && !state.secret) {
    set({ secret: saved });
    void loadStats();
  }
}

export function setSecret(secret: string) {
  set({ secret, connected: false, stats: { state: 'locked' } });
}

/** A secret just made under "Set MCP_SECRET": fill it in, and keep it (if allowed) so it is still there after the redeploy. */
export function adoptGeneratedSecret(secret: string) {
  setSecret(secret);
  if (state.remember) storage()?.setItem(KEY, secret);
}

export function setRemember(remember: boolean) {
  set({ remember });
  if (!remember) storage()?.removeItem(KEY);
}

export function forgetSecret() {
  storage()?.removeItem(KEY);
  set({ secret: '', connected: false, stats: { state: 'locked' } });
}

/** Called after Test connection succeeds: the secret is right, so keep it (if allowed) and load usage. */
export function markConnected() {
  set({ connected: true });
  if (state.remember) storage()?.setItem(KEY, state.secret.trim());
  void loadStats();
}

export async function loadStats() {
  const secret = state.secret.trim();
  if (!secret) return;
  set({ stats: { state: 'loading' } });
  try {
    const res = await fetch('/api/stats', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret }),
    });
    if (res.status === 404) {
      storage()?.removeItem(KEY);
      set({ stats: { state: 'fail', message: 'This secret does not match MCP_SECRET on this deployment.' } });
      return;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const stats = (await res.json()) as Stats;
    // A secret that unlocks usage is a working secret: the link works too.
    set({ stats: { state: 'ready', stats }, connected: true });
    if (state.remember) storage()?.setItem(KEY, secret);
  } catch (error) {
    set({ stats: { state: 'fail', message: `Could not load usage (${error instanceof Error ? error.message : 'network error'}).` } });
  }
}

export function restoreChatAdded() {
  if (storage()?.getItem(CHAT_KEY)) set({ chatAdded: true });
}

export function setChatAdded(chatAdded: boolean) {
  set({ chatAdded });
  if (chatAdded) storage()?.setItem(CHAT_KEY, '1');
  else storage()?.removeItem(CHAT_KEY);
}

/** The chat apps that have used this connector in the last 30 days. */
export function appsInUse(stats: StatsState): string[] {
  if (stats.state !== 'ready' || !stats.stats.apps) return [];
  return stats.stats.apps.filter((app) => app.requests > 0).map((app) => app.app);
}
