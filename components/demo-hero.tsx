import { DEPLOY_URL, LANDING_URL } from '@/lib/site';
import { VercelMark } from './vercel-badge';

/**
 * The public demo's opening (DEMO_MODE): the logo, large, over the starfield.
 * The arch draws itself, the point of light lands inside it and a beam passes
 * through, then the headline and the two ways on: deploy a copy, or read the
 * whole story on the landing site. Without motion it is simply there.
 */
export function DemoHero() {
  return (
    <section className="demo-hero" id="overview" data-chapter="overview">
      <div className="demo-logo" aria-hidden="true">
        <span className="demo-logo-beam" />
        {/* Same drawing as app/icon.svg and BrandMark. */}
        <svg viewBox="5 5.5 22 22">
          <path className="demo-logo-arch" d="M9.5 25V14.5a6.5 6.5 0 0 1 13 0V25" pathLength={1} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <circle className="demo-logo-point" cx="16" cy="18.5" r="2.4" fill="currentColor" />
        </svg>
      </div>
      <p className="demo-hero-name">AI Gateway MCP</p>
      <h1 className="demo-hero-title">
        Every AI model.
        <br />
        <span>No extra fees.</span>
      </h1>
      <p className="demo-hero-lede">Make pictures and video right inside Claude or ChatGPT. Pay the model’s own price on AI Gateway. Nothing more.</p>
      <div className="demo-hero-actions">
        <a className="btn btn-primary" href={DEPLOY_URL} target="_blank" rel="noopener noreferrer">
          <VercelMark />
          Deploy your own
          <span className="sr-only"> (opens Vercel in a new tab)</span>
        </a>
        <a className="btn btn-ghost" href={LANDING_URL}>
          Read the story
        </a>
      </div>
      <a className="demo-hero-cue" href="#in-chat">
        See it in a real chat
      </a>
    </section>
  );
}
