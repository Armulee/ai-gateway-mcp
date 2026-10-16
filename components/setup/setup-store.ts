'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { OPEN_COOKIE } from '@/lib/site';
import type { Stats } from '@/lib/stats';

// Browser-side state of the setup page: the owner's secret (kept in this
// browser only if they choose), whether the link has been tested, and the
// usage stats it unlocks. The secret is only ever sent to this deployment:
// to its MCP endpoint (Test connection) and to /api/stats (usage), until the
// owner clicks an install button to hand the link to a chat app.

const KEY = 'ai-gateway-mcp:secret';
const CHAT_KEY = 'ai-gateway-mcp:chat-added';

// OPEN_COOKIE (lib/site.ts): set once every required step is done, cleared the
// moment a remembered secret stops matching.

export function markGatewayOpen() {
  document.cookie = `${OPEN_COOKIE}=1; path=/; max-age=31536000; samesite=lax`;
}

export function clearGatewayOpen() {
  document.cookie = `${OPEN_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

export type StatsState =
  | { state: 'locked' }
  | { state: 'loading' }
  | { state: 'ready'; stats: Stats }
  | { state: 'fail'; message: string; /** The secret no longer matches MCP_SECRET (changed or removed). */ mismatch?: boolean };

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

/**
 * Restores a remembered secret. It is checked (by loading usage) only once
 * the server has MCP_SECRET: before the redeploy the endpoint is off, and a
 * check would only fail, so the saved value just waits.
 */
export function restoreSecret(secretSet: boolean) {
  const saved = storage()?.getItem(KEY);
  if (saved && !state.secret) {
    set({ secret: saved });
    if (secretSet) void loadStats();
  }
}

/** The address part the "Open on your phone" QR code uses to hand the secret over (phone-pair.tsx). */
export const PAIR_PREFIX = '#pair=';

/**
 * Takes a secret handed over by the phone QR code: saves it in this browser
 * (if Remember is on) and removes it from the address bar at once. True when
 * there was one.
 */
export function adoptFromPairLink(): boolean {
  const { hash, pathname, search } = window.location;
  if (!hash.startsWith(PAIR_PREFIX)) return false;
  let secret = '';
  try {
    secret = decodeURIComponent(hash.slice(PAIR_PREFIX.length)).trim();
  } catch {
    // A mangled link: nothing to take.
  }
  history.replaceState(null, '', pathname + search);
  if (!secret) return false;
  set({ secret, connected: false, stats: { state: 'locked' } });
  if (state.remember) storage()?.setItem(KEY, secret);
  return true;
}

/** The secret kept in this browser, if any. */
export function savedSecret(): string {
  return storage()?.getItem(KEY) ?? '';
}

export function setSecret(secret: string) {
  set({ secret, connected: false, stats: { state: 'locked' } });
}

/** The SHA-256 fingerprint (hex) of a secret: what goes into Vercel as MCP_SECRET_SHA256 (lib/secret.ts). */
export async function fingerprintOf(secret: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** A secret's fingerprint, worked out in this browser; empty until it is ready, or for no secret. */
export function useFingerprint(secret: string): string {
  const [print, setPrint] = useState({ of: '', value: '' });
  useEffect(() => {
    let live = true;
    if (secret) void fingerprintOf(secret).then((value) => live && setPrint({ of: secret, value }));
    return () => {
      live = false;
    };
  }, [secret]);
  return secret && print.of === secret ? print.value : '';
}

/** 32 random bytes as hex: a new secret, made in this browser. */
export function randomSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * The secret to set while MCP_SECRET isn't: the one already in use on this
 * page, else the saved one, else a new one, kept at once. The agent card and
 * the secret step both call it, so they always show the same value.
 */
export function draftSecret(): string {
  const value = state.secret.trim() || savedSecret() || randomSecret();
  if (value !== state.secret || !savedSecret()) adoptGeneratedSecret(value);
  return value;
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
      // Keep the saved value: a redeploy may still be finishing. Only "Forget" removes it.
      clearGatewayOpen();
      set({
        stats: {
          state: 'fail',
          message:
            "The secret saved in this browser doesn't open this deployment. If you just redeployed, wait for it to finish and reload; otherwise paste the one from Vercel or make a new one.",
          mismatch: true,
        },
        connected: false,
      });
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
