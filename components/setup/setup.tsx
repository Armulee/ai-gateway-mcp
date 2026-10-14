import type { KindCounts } from '@/lib/catalog-summary';
import { REPO_URL } from '@/lib/site';
import type { Check } from '@/lib/status';
import { BrandMark } from '../brand-mark';
import { GateCanvas } from '../gate/gate-canvas';
import { ConnectorPanel } from './connector-panel';
import { SetupMotion } from './setup-motion';

const STEPS = [
  { id: 'check', label: 'Check' },
  { id: 'connect', label: 'Connect' },
  { id: 'add', label: 'Add' },
  { id: 'protect', label: 'Protect' },
];

export function Setup({ checks, counts, linkTtlHours }: { checks: Check[]; counts: KindCounts; linkTtlHours: number }) {
  const failing = checks.filter((c) => !c.ok).length;
  return (
    <>
      <GateCanvas counts={counts} initial={{ morph: 1, offsetX: 0.62, offsetY: 0.05, intensity: 0.3, scale: 0.8 }} />
      <SetupMotion />

      <div className="setup">
        <header className="setup-head" data-reveal data-intro>
          <a className="nav-brand" href={REPO_URL}>
            <BrandMark />
            <span>Gateway MCP</span>
          </a>
          <h1 className="h1">Connect your chat to AI Gateway.</h1>
          <p className="lead">
            Four short steps. Everything stays in your own Vercel account, and every call is billed to its AI Gateway credits.
          </p>
          <p className={`summary ${failing ? 'is-fail' : 'is-ok'}`}>
            {failing ? `${failing} ${failing === 1 ? 'thing needs' : 'things need'} attention below` : 'Everything checks out. Ready to connect.'}
          </p>
        </header>

        <div className="setup-grid">
          <nav className="rail" aria-label="Setup steps">
            <ol>
              {STEPS.map((step, i) => (
                <li key={step.id}>
                  <a href={`#${step.id}`} data-rail={step.id}>
                    <span className="rail-index">{i + 1}</span>
                    {step.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="steps">
            <section id="check" className="panel" aria-labelledby="check-title" data-step data-reveal data-intro>
              <h2 id="check-title" className="h2-panel">
                Check your deployment
              </h2>
              <ul className="checks">
                {checks.map((check) => (
                  <li key={check.label} className={`check ${check.ok ? 'is-ok' : 'is-fail'}`}>
                    <span className="check-mark" aria-hidden="true">
                      {check.ok ? '✓' : '!'}
                    </span>
                    <div>
                      <h3>
                        {check.label}
                        <span className="sr-only">{check.ok ? ': passed' : ': needs attention'}</span>
                      </h3>
                      <p>{check.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section id="connect" className="panel" aria-labelledby="connect-title" data-step data-reveal>
              <h2 id="connect-title" className="h2-panel">
                Get your connector URL
              </h2>
              <ConnectorPanel />
            </section>

            <section id="add" className="panel" aria-labelledby="add-title" data-step data-reveal>
              <h2 id="add-title" className="h2-panel">
                Add it to your chat app
              </h2>
              <div className="guides">
                <div className="guide">
                  <h3>Claude</h3>
                  <ol>
                    <li>Open Settings, then Connectors.</li>
                    <li>Choose Add custom connector.</li>
                    <li>Paste the connector URL. Leave authentication empty.</li>
                  </ol>
                </div>
                <div className="guide">
                  <h3>ChatGPT and other clients</h3>
                  <ol>
                    <li>Add a custom MCP server.</li>
                    <li>Pick Streamable HTTP as the transport.</li>
                    <li>Paste the same connector URL.</li>
                  </ol>
                </div>
              </div>
            </section>

            <section id="protect" className="panel" aria-labelledby="protect-title" data-step data-reveal>
              <h2 id="protect-title" className="h2-panel">
                Protect your credits
              </h2>
              <div className="facts">
                <div className="fact">
                  <h3>The URL is a password</h3>
                  <p>Anyone holding it can spend your credits and generate content under your Vercel account.</p>
                </div>
                <div className="fact">
                  <h3>Set a budget</h3>
                  <p>In the Vercel dashboard, open AI Gateway and set a spend budget. That is the real limit.</p>
                </div>
                <div className="fact">
                  <h3>Rotate if it leaks</h3>
                  <p>Change MCP_SECRET in Environment Variables and redeploy. The old URL stops working at once.</p>
                </div>
                <div className="fact">
                  <h3>Links expire</h3>
                  <p>Images and videos live in your private Blob store. Links shared in chat last {linkTtlHours} hours.</p>
                </div>
              </div>
            </section>
          </div>
        </div>

        <footer className="footer footer-setup">
          <span>Gateway MCP, MIT license.</span>
          <a href={REPO_URL}>Source on GitHub</a>
        </footer>
      </div>
    </>
  );
}
