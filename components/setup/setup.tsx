import { REPO_URL } from '@/lib/site';
import type { Check } from '@/lib/status';
import { CosmosCanvas } from '../cosmos/cosmos-canvas';
import { Requirements } from '../requirements';
import { SiteNav } from '../site-nav';
import { VercelBadge } from '../vercel-badge';
import { ConnectorPanel } from './connector-panel';
import { SetupMotion } from './setup-motion';

export function Setup({ checks, linkTtlHours }: { checks: Check[]; linkTtlHours: number }) {
  const failing = checks.filter((c) => !c.ok).length;
  return (
    <>
      <CosmosCanvas
        calm
        initial={{ eclipse: 1, eclipseScale: 0.62, eclipseY: 0.27, horizon: 0, flash: 0, points: 0, stars: 0.7, dust: 0.8, travel: 0 }}
      />
      <SetupMotion />
      <SiteNav
        home="/"
        links={
          <>
            <a href="/">About</a>
            <a href={REPO_URL}>GitHub</a>
          </>
        }
      />

      <div className="setup">
        <div className="setup-intro" data-reveal data-intro>
          <h1 className="setup-title">Set up your deployment.</h1>
          <p className="setup-lead">
            Four steps to connect Claude or ChatGPT to every model on <VercelBadge kind="gateway" />, through your own copy running
            on <VercelBadge kind="vercel" />.
          </p>
          <p className={`summary ${failing ? 'is-fail' : 'is-ok'}`}>
            <span className="summary-icon" aria-hidden="true">
              {failing ? '!' : '✓'}
            </span>
            {failing ? `${failing} ${failing === 1 ? 'thing needs' : 'things need'} attention in step 1` : 'Everything checks out. Ready to connect.'}
          </p>
        </div>

        <div className="setup-needs" data-reveal>
          <Requirements title="Before you start" />
        </div>

        <ol className="timeline">
          <li className="step" id="check" data-reveal data-intro>
            <span className="step-index" aria-hidden="true">
              1
            </span>
            <h2 className="step-title">Check your deployment</h2>
            <ul className="checks">
              {checks.map((check) => (
                <li key={check.label} className={`check ${check.ok ? 'is-ok' : 'is-fail'}`}>
                  <span className="check-icon" aria-hidden="true">
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
          </li>

          <li className="step" id="connect" data-reveal>
            <span className="step-index" aria-hidden="true">
              2
            </span>
            <h2 className="step-title">Get your connector URL</h2>
            <ConnectorPanel />
          </li>

          <li className="step" id="add" data-reveal>
            <span className="step-index" aria-hidden="true">
              3
            </span>
            <h2 className="step-title">Add it to your chat app</h2>
            <div className="pair">
              <div className="card">
                <h3>Claude</h3>
                <ol>
                  <li>Open Settings, then Connectors.</li>
                  <li>Choose Add custom connector.</li>
                  <li>Paste the connector URL. Leave authentication empty.</li>
                </ol>
              </div>
              <div className="card">
                <h3>ChatGPT and others</h3>
                <ol>
                  <li>Add a custom MCP server.</li>
                  <li>Pick Streamable HTTP as the transport.</li>
                  <li>Paste the same connector URL.</li>
                </ol>
              </div>
            </div>
          </li>

          <li className="step" id="protect" data-reveal>
            <span className="step-index" aria-hidden="true">
              4
            </span>
            <h2 className="step-title">Protect your credits</h2>
            <dl className="facts">
              <div>
                <dt>The URL is a password</dt>
                <dd>Anyone holding it can spend your credits and generate content under your Vercel account.</dd>
              </div>
              <div>
                <dt>Set a budget</dt>
                <dd>
                  In the Vercel dashboard, open <VercelBadge kind="gateway" /> and set a spend budget. That is the real limit.
                </dd>
              </div>
              <div>
                <dt>Rotate if it leaks</dt>
                <dd>Change MCP_SECRET in Environment Variables and redeploy. The old URL stops working at once.</dd>
              </div>
              <div>
                <dt>Links expire</dt>
                <dd>Images and videos live in your private Blob store. Links shared in chat last {linkTtlHours} hours.</dd>
              </div>
            </dl>
          </li>
        </ol>

        <footer className="setup-footer">
          <span>AI Gateway MCP, MIT license. Not affiliated with Vercel.</span>
          <a href="/">About this project</a>
        </footer>
      </div>
    </>
  );
}
