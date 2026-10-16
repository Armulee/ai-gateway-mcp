'use client';

import { gsap } from 'gsap';
import { useEffect, useRef, useState } from 'react';
import { agentPrompt } from '@/lib/agent-prompt';
import { scrollToHash } from '../motion/smooth-scroll';
import type { DashboardLinks } from '@/lib/site';
import { CopyButton } from './copy-button';
import { draftSecret, useFingerprint, useSetup } from './setup-store';

// "Set up with your agent": three moves on the left (copy, paste, reload) and,
// on the right, a little code-drawn chat that plays what the agent will do:
// your prompt goes in, its Vercel tool calls tick off one by one, then "Live".
// The chat is decoration (aria-hidden). Neither it nor the prompt holds the
// secret: only its fingerprint, which can't open the connector.

const VERCEL_MCP_URL = 'https://vercel.com/docs/agent-resources/vercel-mcp';

function motionOk() {
  return document.documentElement.classList.contains('motion-ok');
}

export function AgentPanel({ id, open, blobDone, secretSet, links }: { id: string; open: boolean; blobDone: boolean; secretSet: boolean; links: DashboardLinks }) {
  const { secret } = useSetup();
  const [origin, setOrigin] = useState('');
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    // A secret to hand the agent, only while MCP_SECRET isn't set: never a silent rotation.
    if (!secretSet) draftSecret();
  }, [secretSet]);

  const tools = [
    !blobDone && { name: 'create_storage_stores_blob', what: 'private storage' },
    !secretSet && { name: 'create_project_env', what: 'fingerprint' },
    { name: 'create_deployment', what: 'redeploy' },
  ].filter((tool): tool is { name: string; what: string } => Boolean(tool));
  const does = [!blobDone && 'connects your storage', !secretSet && 'adds your secret', 'redeploys once'].filter(Boolean).join(', ').replace(/, (?=[^,]*$)/, ' and ');
  const print = useFingerprint(secretSet ? '' : secret.trim());
  const prompt = origin && (print || secretSet) ? agentPrompt({ fingerprint: print, origin, project: links.project, blobDone }) : '';
  const project = links.project ? `"${links.project.name}"` : 'my project';

  // Opening plays the panel in, then the chat: prompt, tool calls, "Live".
  useEffect(() => {
    const el = root.current;
    if (!open || !el) return;
    // Bring the panel up under the nav as it opens (smoothly, unless motion is reduced).
    // Its scroll-margin-top keeps it clear of the nav, for Lenis and plain scrolling alike.
    scrollToHash(`#${el.id}`, 0);
    const rows = Array.from(el.querySelectorAll<HTMLElement>('[data-tool]'));
    const reset = () => rows.forEach((row) => row.classList.remove('is-running', 'is-done'));
    if (!motionOk()) {
      rows.forEach((row) => row.classList.add('is-done'));
      return reset;
    }
    reset();
    const tl = gsap.timeline();
    tl.fromTo(el, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.8, ease: 'expo.out', clearProps: 'height' }, 0)
      .fromTo(
        el.querySelectorAll('[data-rise]'),
        { y: 18, opacity: 0, filter: 'blur(8px)' },
        { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.7, ease: 'expo.out', stagger: 0.08, clearProps: 'filter' },
        0.1,
      )
      .fromTo(el.querySelector('[data-you]'), { y: 14, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.6)' }, 0.45);
    rows.forEach((row, i) => {
      const at = 1 + i * 0.85;
      tl.fromTo(row, { x: -10, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }, at)
        .call(() => row.classList.add('is-running'), undefined, at)
        .call(() => row.classList.replace('is-running', 'is-done'), undefined, at + 0.7);
    });
    tl.fromTo(el.querySelector('[data-live]'), { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'back.out(1.6)' }, 1 + rows.length * 0.85 + 0.1);
    return () => {
      tl.progress(1).kill();
      reset();
    };
  }, [open]);

  return (
    <div id={id} ref={root} className="agent-panel" hidden={!open}>
      <div className="agent-moves">
        <p className="agent-kicker" data-rise>
          Set up with your agent
        </p>
        <h2 className="agent-heading" data-rise>
          One prompt.
          <br />
          <span className="dim">Your agent does the rest.</span>
        </h2>
        <ol className="agent-flow">
          <li data-rise>
            <span className="agent-num">1</span>
            <div>
              <b>Copy the prompt</b>
              <p>
                {secretSet
                  ? 'Your secret is already set, so it leaves it alone.'
                  : 'It holds only a fingerprint of your secret, which can’t open your connector. The secret itself stays in this browser.'}
              </p>
              {prompt ? (
                <CopyButton value={prompt} label="Copy setup prompt" primary />
              ) : (
                <button type="button" className="btn btn-ghost btn-small" disabled>
                  Copy setup prompt
                </button>
              )}
            </div>
          </li>
          <li data-rise>
            <span className="agent-num">2</span>
            <div>
              <b>Paste it into Claude</b>
              <p>
                Claude or Claude Code with the{' '}
                <a href={VERCEL_MCP_URL} target="_blank" rel="noopener noreferrer">
                  Vercel connector
                </a>
                . It {does}.
              </p>
            </div>
          </li>
          <li data-rise>
            <span className="agent-num">3</span>
            <div>
              <b>Reload when it&apos;s live</b>
              <p>Your link is checked by itself. Then add it to your chat app in one click.</p>
              <button type="button" className="btn btn-ghost btn-small" onClick={() => window.location.reload()}>
                Reload this page
              </button>
            </div>
          </li>
        </ol>
      </div>

      <figure className="agent-chat" aria-hidden="true" data-rise>
        <div className="chat-bar">
          <i />
          <i />
          <i />
          <span>Claude · Vercel connector</span>
        </div>
        <div className="chat-bubble is-you" data-you>
          Use the Vercel connector on {project}…
          {!secretSet && <code>MCP_SECRET_SHA256={print ? `${print.slice(0, 12)}…` : '…'}</code>}
        </div>
        <ul className="chat-tools">
          {tools.map((tool) => (
            <li key={tool.name} data-tool>
              <span className="tool-state" />
              <code>{tool.name}</code>
              <span className="tool-what">{tool.what}</span>
            </li>
          ))}
        </ul>
        <div className="chat-bubble is-agent" data-live>
          <span className="live-dot" />
          Live. Reload your setup page.
        </div>
      </figure>
    </div>
  );
}
