'use client';

import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { useEffect, useId, useRef, useState } from 'react';
import type { DashboardLinks } from '@/lib/site';
import { ActionSteps } from './action-steps';
import { CopyButton } from './copy-button';
import { adoptGeneratedSecret, savedSecret } from './setup-store';

gsap.registerPlugin(DrawSVGPlugin);

// Makes a secret in the browser and points to where it goes in Vercel. The
// value never leaves this page: the owner pastes it into Vercel themselves,
// since this app holds no token that could write Environment Variables. The
// link is shown right away. Until MCP_SECRET is set, the secret is made and
// saved in this browser as soon as the step shows (reloads keep the same
// one), so after the redeploy the link is already there: nobody has to
// remember it or rotate it just to get their link back.

const HEX = '0123456789abcdef';

function randomSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function motionOk() {
  return document.documentElement.classList.contains('motion-ok');
}

/** Types the secret in as a decode: every character flickers through hex until it locks, left to right. */
function decode(el: HTMLElement, value: string) {
  const state = { p: 0 };
  return gsap.to(state, {
    p: 1,
    duration: 1.1,
    ease: 'power2.out',
    onUpdate() {
      const locked = Math.floor(state.p * value.length);
      let out = value.slice(0, locked);
      for (let i = locked; i < value.length; i++) out += HEX[(Math.random() * 16) | 0];
      el.textContent = out;
    },
    onComplete() {
      el.textContent = value;
    },
  });
}

/** Under "Set MCP_SECRET": one button that makes a secret, then opens the steps to put it in Vercel. */
export function SecretPanel({ isSet, links }: { isSet: boolean; links: DashboardLinks }) {
  const id = useId();
  const [secret, setSecret] = useState('');
  const [origin, setOrigin] = useState('');
  // Whether this browser holds a secret (read after mount: storage is browser-only).
  const [hasSaved, setHasSaved] = useState(true);
  useEffect(() => {
    setOrigin(window.location.origin);
    const saved = savedSecret();
    setHasSaved(Boolean(saved));
    if (isSet) return;
    // Not set yet: show the saved one, or make one and keep it right away.
    const value = saved || randomSecret();
    if (!saved) adoptGeneratedSecret(value);
    setSecret(value);
  }, [isSet]);

  /** A fresh secret. Before MCP_SECRET is set it is saved at once; when rotating, on copy (the old link still works until the redeploy). */
  const makeAnother = () => {
    const value = randomSecret();
    if (!isSet) adoptGeneratedSecret(value);
    setSecret(value);
  };
  const panel = useRef<HTMLDivElement>(null);
  const code = useRef<HTMLElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    const el = panel.current;
    const out = code.current;
    if (!secret || !el || !out) return;
    const opening = !wasOpen.current;
    wasOpen.current = true;
    if (!motionOk()) {
      out.textContent = secret;
      return;
    }
    const tl = gsap.timeline();
    if (opening) {
      tl.fromTo(el, { height: 0 }, { height: 'auto', duration: 0.8, ease: 'expo.out', clearProps: 'height' }, 0).fromTo(
        el.querySelectorAll('[data-rise]'),
        { y: 18, opacity: 0, filter: 'blur(8px)' },
        { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.7, ease: 'expo.out', stagger: 0.09, clearProps: 'filter' },
        0.08,
      );
    }
    tl.add(decode(out, secret), opening ? 0.25 : 0)
      .fromTo(el.querySelector('[data-trace]'), { drawSVG: '0% 0%', opacity: 1 }, { drawSVG: '0% 100%', duration: 1, ease: 'power2.inOut' }, opening ? 0.25 : 0)
      .to(el.querySelector('[data-trace]'), { opacity: 0, duration: 0.6 }, '>-0.1')
      .fromTo(el.querySelector('[data-sweep]'), { xPercent: -100, opacity: 1 }, { xPercent: 260, opacity: 0, duration: 1.2, ease: 'power2.inOut' }, opening ? 0.4 : 0.15);
    return () => {
      tl.progress(1).kill();
    };
  }, [secret]);

  const open = secret !== '';
  const link = origin && secret ? `${origin}/mcp/${secret}` : '';

  return (
    <div className={`generator${isSet ? ' is-set' : ''}`}>
      {isSet && !hasSaved && !open && (
        <p className="gen-find">
          This browser doesn&apos;t have your secret. Find it in{' '}
          <a href={links.envVars} target="_blank" rel="noopener noreferrer">
            Vercel → Environment Variables
          </a>{' '}
          (readable if it was saved as Config) and paste it under &ldquo;Test your link&rdquo;, or make a new one here.
        </p>
      )}
      <button
        type="button"
        className={`btn ${isSet || open ? 'btn-ghost' : 'btn-primary'} gen-trigger`}
        aria-expanded={open}
        aria-controls={id}
        onClick={makeAnother}
      >
        <svg className="gen-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3c.6 4.6 3.4 7.4 8 8-4.6.6-7.4 3.4-8 8-.6-4.6-3.4-7.4-8-8 4.6-.6 7.4-3.4 8-8z" />
        </svg>
        {open ? 'Make another' : 'Make a new secret'}
      </button>

      <div id={id} ref={panel} className="gen-panel" hidden={!open}>
        <div className="gen-inner">
          {isSet && (
            <p className="gen-warn" data-rise>
              Your old link stops working after the redeploy. Update it in your chat apps.
            </p>
          )}

          <figure className="secret-block" data-rise>
            <svg className="secret-trace" aria-hidden="true">
              <rect data-trace x="0.75" y="0.75" rx="12" />
            </svg>
            <span className="secret-sweep" data-sweep aria-hidden="true" />
            <figcaption className="secret-label">
              <span>MCP_SECRET</span>
              {open && <CopyButton value={secret} onCopy={() => adoptGeneratedSecret(secret)} />}
            </figcaption>
            <code ref={code} className="secret-value" aria-hidden="true" />
            <span className="sr-only">{secret}</span>
          </figure>

          {link && (
            <div className="gen-link" data-rise>
              <p className="gen-link-text">
                <span className="gen-link-label">Your link</span>
                <code className="gen-link-value">
                  {origin.replace(/^https?:\/\//, '')}/mcp/{secret.slice(0, 6)}…
                </code>
                {!isSet && <span className="gen-link-label">Saved in this browser, so you don&apos;t need to remember it.</span>}
              </p>
              <CopyButton value={link} label="Copy link" onCopy={() => adoptGeneratedSecret(secret)} />
            </div>
          )}

          <div data-rise>
            <ActionSteps
              actions={[
                { label: 'Add it in Vercel', href: links.envVars },
                { label: 'Redeploy', href: links.deployments },
              ]}
              hints={[
                <>
                  Copy it, then {links.direct ? 'add' : 'pick this project and add'} it as <code>MCP_SECRET</code>. Choose type{' '}
                  <b>Config</b> so you can look it up in Vercel later.
                </>,
                'Redeploy once: it applies the secret and the storage. Then reload this page: your link is checked by itself.',
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
