'use client';

import claude from '@lobehub/icons-static-svg/icons/claude.svg';
import cursor from '@lobehub/icons-static-svg/icons/cursor.svg';
import openai from '@lobehub/icons-static-svg/icons/openai.svg';
import { assetUrl } from '@/lib/asset-url';
import { useEffect, useState } from 'react';
import { CopyButton } from './copy-button';
import { appsInUse, restoreChatAdded, setChatAdded, useSetup } from './setup-store';

// How to add the link in each chat app. Menu names move around between
// releases, so each guide names what to look for rather than exact paths.

const NAME = 'AI Gateway';

/**
 * One-click installs, built in this browser from the pasted secret. Each opens
 * the app with the link filled in, and the owner still confirms there.
 * claude.ai: https://claude.com/docs/connectors/building/directory-vs-custom
 * Cursor: https://cursor.com/docs/context/mcp/install-links
 * VS Code: https://code.visualstudio.com/docs/copilot/guides/mcp-developer-guide
 */
type Install = { label: string; href: (url: string) => string } | { label: string; copy: (url: string) => string };

const GUIDES: { app: string; icon: string; steps: string[]; installs: Install[] }[] = [
  {
    app: 'Claude',
    icon: claude,
    steps: [
      'Click Add to Claude: claude.ai opens Add custom connector with the name and your link filled in. Check them and click Add.',
      'Or on claude.ai open Customize, then Connectors, choose Add custom connector and paste your link. Leave the OAuth fields empty.',
      'It then shows up in Claude on desktop and on your phone too.',
    ],
    installs: [
      {
        label: 'Add to Claude',
        href: (url) =>
          `https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=${encodeURIComponent(NAME)}&connectorUrl=${encodeURIComponent(url)}`,
      },
    ],
  },
  {
    app: 'ChatGPT',
    icon: openai,
    steps: [
      'Open Settings, then Apps & Connectors. Custom connectors may sit under Advanced or developer mode.',
      'Create a connector and paste your link. Choose no authentication.',
      'Turn it on in a chat from the tools menu.',
    ],
    installs: [],
  },
  {
    app: 'Other apps',
    icon: cursor,
    steps: [
      'Cursor and VS Code: click their button and confirm in the app.',
      'Claude Code: copy the command and run it in your terminal.',
      'Any other app that takes a remote MCP server over Streamable HTTP: add a remote server and paste your link as its URL.',
    ],
    installs: [
      { label: 'Add to Cursor', href: (url) => `cursor://anysphere.cursor-deeplink/mcp/install?name=ai-gateway&config=${encodeURIComponent(btoa(JSON.stringify({ url })))}` },
      { label: 'Add to VS Code', href: (url) => `vscode:mcp/install?${encodeURIComponent(JSON.stringify({ name: 'ai-gateway', type: 'http', url }))}` },
      { label: 'Copy Claude Code command', copy: (url) => `claude mcp add --transport http ai-gateway ${url}` },
    ],
  },
];

/**
 * The owner's own tick for this step, for when usage can't confirm it (plans
 * without a usage report, or an app added by hand). Clicking an install
 * button ticks it too; clicking this again unticks it.
 */
function AddedToggle() {
  const { chatAdded } = useSetup();
  return (
    <button type="button" className="btn btn-small btn-ghost" aria-pressed={chatAdded} onClick={() => setChatAdded(!chatAdded)}>
      {chatAdded ? '✓ Added' : 'I’ve added it'}
    </button>
  );
}

/** The buttons under a guide: installs, live once the link works, then "I've added it". */
function Installs({ installs }: { installs: Install[] }) {
  const { secret, connected } = useSetup();
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  // Only a link that works: the secret saved before the redeploy would add a dead connector.
  const url = connected && secret.trim() && origin ? `${origin}/mcp/${encodeURIComponent(secret.trim())}` : '';
  return (
    <div className="action-steps guide-installs">
      <div className="action-row">
        {installs.map((install) =>
          !url ? (
            <button key={install.label} type="button" className="btn btn-small btn-ghost" disabled>
              {install.label}
            </button>
          ) : 'copy' in install ? (
            <CopyButton key={install.label} value={install.copy(url)} label={install.label} />
          ) : (
            <a
              key={install.label}
              className="btn btn-small btn-primary"
              href={install.href(url)}
              // Clicking means adding: tick the step (the owner can untick it if they cancel there).
              onClick={() => setChatAdded(true)}
              {...(install.href(url).startsWith('https:') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              {install.label}
            </a>
          ),
        )}
        <AddedToggle />
      </div>
      <p className="action-hint">
        {installs.length === 0
          ? 'Added it? Tick it here.'
          : url
          ? 'Each opens the app with your link filled in; you confirm there, and the step ticks itself. Your link goes to that app, the same as pasting it.'
          : secret.trim()
            ? 'These turn on once your link works: finish the redeploy and reload this page, or test it above.'
            : 'These turn on once your link works: set your secret above and redeploy, or paste it under “Test your link”.'}
      </p>
    </div>
  );
}

// A first call that costs a fraction of a cent and shows up in usage, which ticks this step.
const TEST_PROMPT =
  'Use the AI Gateway connector: call list_models to find a cheap text model, then call generate_text with it to say hello in five words.';

/** Proves the link works in a chat app: a prompt to try it, and what usage has seen. */
function ChatCheck({ used }: { used: string[] }) {
  const { chatAdded, stats } = useSetup();
  useEffect(restoreChatAdded, []);
  // Without a usage report (Hobby plans), only the owner can tick this step.
  const noReport = stats.state === 'ready' && stats.stats.paidPlanOnly;
  return (
    <div className="action-steps chat-check">
      <div className="action-row">
        <CopyButton value={TEST_PROMPT} label="Copy a test prompt" />
      </div>
      <p className="action-hint" aria-live="polite">
        {used.length > 0
          ? `Seen in your usage: ${used.join(', ')}.`
          : noReport
            ? chatAdded
              ? 'Ticked. Paste the prompt in a new chat to try it.'
              : 'Paste the prompt in a new chat to try it. Your plan has no usage report to confirm this step, so tick “I’ve added it” above.'
            : chatAdded
              ? 'Ticked. Your usage will name the app once its first call comes in.'
              : 'Paste the prompt in a new chat. This step ticks itself once the call shows in your usage (a few minutes), or tick “I’ve added it” above.'}
      </p>
    </div>
  );
}

export function ChatGuides() {
  const { stats } = useSetup();
  const used = appsInUse(stats);
  const [tab, setTab] = useState(0);
  const isLive = (app: string) => (app === 'Other apps' ? used.some((u) => !['Claude', 'ChatGPT'].includes(u)) : used.includes(app));
  const guide = GUIDES[tab];
  return (
    <>
      <div className="app-tabs" role="tablist" aria-label="Chat app">
        {GUIDES.map((g, i) => (
          <button
            key={g.app}
            type="button"
            role="tab"
            id={`app-tab-${i}`}
            aria-selected={i === tab}
            aria-controls="app-panel"
            className={`app-tab${i === tab ? ' is-active' : ''}`}
            onClick={() => setTab(i)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="guide-icon" src={assetUrl(g.icon)} alt="" width={16} height={16} />
            {g.app === 'Other apps' ? 'Other' : g.app}
            {isLive(g.app) && <span className="app-live" aria-label="in use" />}
          </button>
        ))}
      </div>
      <section key={guide.app} className={`guide-card${isLive(guide.app) ? ' is-live' : ''}`} role="tabpanel" id="app-panel" aria-labelledby={`app-tab-${tab}`}>
        <ol>
          {guide.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <Installs installs={guide.installs} />
      </section>
      <ChatCheck used={used} />
    </>
  );
}
