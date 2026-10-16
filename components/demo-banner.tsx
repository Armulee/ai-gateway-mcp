import { DEPLOY_URL } from '@/lib/site';
import { VercelMark } from './vercel-badge';

/**
 * The public demo's banner (DEMO_MODE): a white pill floating at the bottom,
 * saying the numbers are samples and offering the Deploy button. Shown on
 * every page of the demo, never on a real deployment.
 */
export function DemoBanner() {
  return (
    <aside className="demo-banner" aria-label="About this demo">
      <span className="demo-chip">Demo</span>
      <span className="demo-text">
        <span className="demo-text-long">Sample numbers, no live connector. Your copy runs on your own Vercel credits.</span>
        <span className="demo-text-short">Sample numbers</span>
      </span>
      <a className="demo-cta" href={DEPLOY_URL} target="_blank" rel="noopener noreferrer">
        <VercelMark />
        Deploy your own
        <span className="sr-only"> (opens Vercel in a new tab)</span>
      </a>
    </aside>
  );
}
