'use client';

import claude from '@lobehub/icons-static-svg/icons/claude.svg';
import cursor from '@lobehub/icons-static-svg/icons/cursor.svg';
import openai from '@lobehub/icons-static-svg/icons/openai.svg';
import { assetUrl } from '@/lib/asset-url';
import { appsInUse, useSetup } from './setup-store';

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

export function ChatGuides() {
  const { stats } = useSetup();
  const used = appsInUse(stats);
  return (
    <div className="guides">
      {GUIDES.map((guide) => {
        const inUse = guide.app === 'Other apps' ? used.some((app) => !['Claude', 'ChatGPT'].includes(app)) : used.includes(guide.app);
        return (
          <section key={guide.app} className={`guide-card${inUse ? ' is-live' : ''}`}>
            <h3>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="guide-icon" src={assetUrl(guide.icon)} alt="" width={18} height={18} />
              {guide.app}
              {inUse && <span className="step-tag is-done">In use</span>}
            </h3>
            <ol>
              {guide.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
