import { DEPLOY_URL, LANDING_URL, REPO_URL, type DashboardLinks } from '@/lib/site';
import type { ServerStep, StepId } from '@/lib/status';
import { CosmosCanvas } from '../cosmos/cosmos-canvas';
import { StarDefs } from '../motion/star-defs';
import { OrbitNav } from '../orbit/orbit-nav';
import { SiteNav } from '../site-nav';
import { VercelBadge, VercelMark } from '../vercel-badge';
import { ChatGuides } from './chat-guides';
import { ConnectorPanel } from './connector-panel';
import { BlobPanel } from './blob-panel';
import { SecretPanel } from './secret-panel';
import { SetupMotion } from './setup-motion';
import { StatsPanel } from './stats-panel';
import { StepArt } from './step-art';
import { GuideFocus, GuideStep, Progress, type StepView } from './steps';

// The home page of every deployment: where you are in the setup, what to do
// next, how to add the link to a chat app, and (once unlocked with your
// secret) what it has cost. Server-rendered from live checks; reads fine
// without JavaScript, and the secret is never part of the HTML.

const RAIL_LABELS: Record<StepId, string> = {
  deploy: 'Deploy',
  secret: 'Secret',
  gateway: 'AI Gateway',
  blob: 'Storage',
  connect: 'Your link',
  chat: 'Chat app',
};

/** Extra content under a step's own explanation. */
function StepExtra({ id }: { id: StepId }) {
  switch (id) {
    case 'gateway':
      return (
        <p className="guide-note">
          Requests run on <VercelBadge kind="gateway" /> and bill your own Vercel team at each provider&apos;s price.
        </p>
      );
    case 'connect':
      return <ConnectorPanel />;
    case 'chat':
      return <ChatGuides />;
    default:
      return null;
  }
}

export function Setup({ steps, linkTtlHours, links }: { steps: ServerStep[]; linkTtlHours: number; links: DashboardLinks }) {
  const views: StepView[] = steps.map(({ id, title, state, optional }) => ({ id, title, state, optional }));
  const chapters = [
    { id: 'overview', label: 'Overview' },
    ...steps.map((step) => ({ id: step.id, label: RAIL_LABELS[step.id], done: step.state === 'done' })),
    { id: 'usage', label: 'Usage' },
    { id: 'safety', label: 'Safety' },
  ];

  return (
    <>
      <CosmosCanvas calm initial={{ eclipse: 0, horizon: 0, flash: 0, points: 0, stars: 0.75, dust: 0.8, travel: 0 }} />
      <StarDefs />
      <SetupMotion />
      <SiteNav
        home="#overview"
        links={
          <>
            <a href={LANDING_URL}>About</a>
            <a href={REPO_URL}>GitHub</a>
          </>
        }
      />
      <OrbitNav chapters={chapters} label="Setup steps" />

      <main className="setup">
        <section className="setup-hero" id="overview" data-chapter="overview">
          <Progress steps={views} />
        </section>

        <GuideFocus steps={views}>
          {steps.map((step, i) => (
            <GuideStep key={step.id} steps={views} index={i}>
              <div className="guide-art">
                <StepArt id={step.id} />
              </div>
              <div className="guide-copy" data-guide-copy>
                <p className="guide-detail">{step.detail}</p>
                {step.id === 'deploy' && step.state !== 'done' && (
                  <a className="btn btn-primary step-cta" href={DEPLOY_URL} target="_blank" rel="noopener noreferrer">
                    <VercelMark />
                    Deploy to Vercel
                    <span className="sr-only"> (opens Vercel in a new tab)</span>
                  </a>
                )}
                {step.id === 'gateway' && <StepExtra id={step.id} />}
                {step.id === 'secret' && <SecretPanel isSet={step.state === 'done'} links={links} />}
                {step.id === 'blob' && step.state !== 'done' && <BlobPanel links={links} />}
              </div>
              {(step.id === 'connect' || step.id === 'chat') && (
                <div className="guide-extra" data-guide-copy>
                  <StepExtra id={step.id} />
                </div>
              )}
            </GuideStep>
          ))}
        </GuideFocus>

        <section className="setup-section" id="usage" data-chapter="usage">
          <h2 className="section-title">Your usage</h2>
          <p className="section-lead">What your chat apps have spent through this connector, straight from AI Gateway.</p>
          <StatsPanel />
        </section>

        <section className="setup-section" id="safety" data-chapter="safety">
          <h2 className="section-title">Keep it safe</h2>
          <dl className="facts">
            <div>
              <dt>Your link is a password</dt>
              <dd>Anyone holding it can spend your credits and generate content under your Vercel account.</dd>
            </div>
            <div>
              <dt>Set a budget</dt>
              <dd>
                In <VercelBadge kind="gateway" /> set a spend budget. That is the real limit.
              </dd>
            </div>
            <div>
              <dt>Change it if it leaks</dt>
              <dd>Change MCP_SECRET in Environment Variables and redeploy. The old link stops working at once.</dd>
            </div>
            <div>
              <dt>Links expire</dt>
              <dd>Images and videos live in your private Blob store. Links shared in chat last {linkTtlHours} hours.</dd>
            </div>
          </dl>
        </section>

        <footer className="setup-footer">
          <span>AI Gateway MCP, MIT license. Not affiliated with Vercel.</span>
          <a href={LANDING_URL}>About this project</a>
        </footer>
      </main>
    </>
  );
}
