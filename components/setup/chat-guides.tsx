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

const GUIDES = [
  {
    app: 'Claude',
    icon: claude,
    steps: [
      'On claude.ai open Settings, then Connectors.',
      'Choose Add custom connector and paste your link. Leave the OAuth fields empty.',
      'It then shows up in Claude on desktop and on your phone too.',
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
  },
  {
    app: 'Other apps',
    icon: cursor,
    steps: [
      'Any app that takes a remote MCP server over Streamable HTTP works: Cursor, VS Code, Claude Code and more.',
      'Add a remote server and paste your link as its URL.',
      'In Claude Code: claude mcp add --transport http ai-gateway <your link>',
    ],
  },
];

// A first call that costs a fraction of a cent and shows up in usage, which ticks this step.
const TEST_PROMPT =
  'Use the AI Gateway connector: call list_models to find a cheap text model, then call generate_text with it to say hello in five words.';

/** Proves the link works in a chat app: a prompt to try it, and a manual tick for when usage can't confirm it. */
function ChatCheck({ used }: { used: string[] }) {
  const { chatAdded } = useSetup();
  useEffect(restoreChatAdded, []);
  return (
    <div className="action-steps chat-check">
      <div className="action-row">
        <CopyButton value={TEST_PROMPT} label="Copy a test prompt" />
        <button
          type="button"
          className={`btn btn-small ${chatAdded ? 'btn-ghost' : 'btn-primary'}`}
          aria-pressed={chatAdded}
          onClick={() => setChatAdded(!chatAdded)}
        >
          {chatAdded ? '✓ Added' : 'I’ve added it'}
        </button>
      </div>
      <p className="action-hint" aria-live="polite">
        {used.length > 0
          ? `Seen in your usage: ${used.join(', ')}.`
          : chatAdded
            ? 'Ticked by you. Your usage will name the app once its first call comes in.'
            : 'Paste the prompt in a new chat. This step ticks itself once the call shows in your usage, which can take a few minutes.'}
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
      </section>
      <ChatCheck used={used} />
    </>
  );
}
