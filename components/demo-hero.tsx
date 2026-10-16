'use client';

import { useEffect } from 'react';
import { DEPLOY_URL, LANDING_URL } from '@/lib/site';
import { cosmos } from './cosmos/store';
import { VercelMark } from './vercel-badge';

/**
 * The public demo's opening (DEMO_MODE), borrowed from the project's landing
 * site: the eclipse over the starfield and its headline, then the two ways
 * on: deploy a copy, or read the whole story. The eclipse sinks away as the
 * page scrolls. Without WebGL the text stands on the plain sky.
 */
export function DemoHero() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const place = () => {
      // Keep the disk clear of the headline: smaller and higher on narrow screens.
      const narrow = window.innerWidth < 760;
      const k = Math.min(1, window.scrollY / (window.innerHeight * 0.85));
      cosmos.eclipse = 1 - k;
      cosmos.eclipseScale = narrow ? 0.56 : 0.8;
      cosmos.eclipseY = (narrow ? 0.33 : 0.25) + (reduce ? 0 : k * 0.2);
    };
    place();
    window.addEventListener('scroll', place, { passive: true });
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place);
      window.removeEventListener('resize', place);
      cosmos.eclipse = 0;
    };
  }, []);

  return (
    <section className="demo-hero" id="overview" data-chapter="overview">
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
