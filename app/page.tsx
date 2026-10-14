import { getConfig } from '@/lib/env';
import { getStatusChecks } from '@/lib/status';
import { ConnectorTools } from './setup-client';

export const dynamic = 'force-dynamic';

const REPO_URL = 'https://github.com/armulee/ai-gateway-mcp';

export default async function Home() {
  if (getConfig().siteMode === 'landing') return <Landing />;

  const checks = await getStatusChecks();
  const ttl = getConfig().signedUrlTtlHours;
  return (
    <main>
      <header>
        <h1>Gateway MCP</h1>
        <p className="muted">
          Your own MCP server for Vercel AI Gateway. Every call is billed to this Vercel team&apos;s AI Gateway credits.
        </p>
      </header>

      <section className="card">
        <h2>Status</h2>
        <ul className="checks">
          {checks.map((check) => (
            <li key={check.label}>
              <span className={check.ok ? 'pass' : 'fail'}>{check.ok ? '✓' : '✗'}</span>
              <div>
                <strong>{check.label}</strong>
                <p className="muted">{check.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <ConnectorTools />

      <section className="card">
        <h2>How to use it</h2>
        <ol>
          <li>
            <strong>Claude:</strong> Settings → Connectors → Add custom connector. Paste the connector URL and leave authentication empty.
          </li>
          <li>
            <strong>ChatGPT and other MCP clients:</strong> add a custom MCP server (Streamable HTTP) with the same URL.
          </li>
          <li>
            <strong>Set a budget.</strong> Anyone with the URL can spend your credits. In the Vercel dashboard, open AI Gateway and set a
            spend budget. That is the real limit; this server only caps each call.
          </li>
          <li>
            <strong>Rotate the secret</strong> if the URL leaks: change <code>MCP_SECRET</code> in Project Settings → Environment
            Variables and redeploy. The old URL stops working immediately, and unfinished video jobs are abandoned.
          </li>
          <li>
            <strong>Files:</strong> images and videos are stored in your private Blob store. Links shared in chat expire after {ttl}{' '}
            hours; anyone holding a link can open the file until then.
          </li>
        </ol>
      </section>

      <footer className="muted">
        <a href={REPO_URL}>Source on GitHub</a> · MIT license
      </footer>
    </main>
  );
}

function Landing() {
  return (
    <main>
      <header>
        <h1>Gateway MCP</h1>
        <p className="muted">Call any Vercel AI Gateway model (text, image, video) from Claude, ChatGPT and other MCP clients.</p>
      </header>
      <p>
        <a href={REPO_URL}>Deploy your own copy</a>
      </p>
    </main>
  );
}
