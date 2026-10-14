import type { CatalogSummary } from '@/lib/catalog-summary';
import { FALLBACK_COUNTS } from '@/lib/catalog-summary';
import { DEPLOY_URL, REPO_URL } from '@/lib/site';
import { BrandMark } from '../brand-mark';
import { CosmosCanvas } from '../cosmos/cosmos-canvas';
import { SplitText } from '../split-text';
import { WordReveal } from '../word-reveal';
import { LandingMotion } from './landing-motion';
import { ToolArt, type ToolArtVariant } from './tool-art';

/** "author": the project's own site. "instance": someone's self-hosted deployment. */
export type LandingMode = 'author' | 'instance';

const TOOLS: { name: string; signature: string; text: string; art: ToolArtVariant }[] = [
  { name: 'list_models', signature: 'list_models({ type?, query? })', text: 'Browse the live catalog by type or name, with prices.', art: 'catalog' },
  {
    name: 'generate_text',
    signature: 'generate_text({ model, prompt, system?, max_tokens? })',
    text: 'Any language model. You get the answer and what it cost.',
    art: 'text',
  },
  {
    name: 'generate_image',
    signature: 'generate_image({ model, prompt, size_or_aspect?, n? })',
    text: 'Images land right in the chat, with a private download link.',
    art: 'image',
  },
  {
    name: 'start_video',
    signature: 'start_video({ model, prompt, image_url?, duration? })',
    text: 'Starts a video job and hands back a job id right away.',
    art: 'video',
  },
  { name: 'get_video', signature: 'get_video({ job_id })', text: 'Checks the job. When it is done, you get the file.', art: 'reel' },
];

const HOW = [
  { title: 'You ask in chat.', text: 'Claude or ChatGPT picks a tool, like generate_image, and calls it.' },
  { title: 'Your private link carries it.', text: 'One URL with your secret inside. Only your deployment answers it.' },
  { title: 'AI Gateway runs the model.', text: 'The result comes back to your chat. The cost goes to your Vercel team.' },
];

const fmt = (n: number) => n.toLocaleString('en-US');

export function Landing({
  catalog,
  linkTtlHours,
  mode,
}: {
  catalog: CatalogSummary | null;
  linkTtlHours: number;
  mode: LandingMode;
}) {
  const primary =
    mode === 'author' ? { href: DEPLOY_URL, label: 'Deploy to Vercel' } : { href: '/setup', label: 'Set up this deployment' };

  return (
    <>
      <CosmosCanvas counts={catalog?.counts ?? FALLBACK_COUNTS} />
      <LandingMotion />

      <header className="nav">
        <a className="nav-brand" href="#top" aria-label="Gateway MCP, back to top">
          <BrandMark />
          <span>Gateway MCP</span>
        </a>
        <nav className="nav-links" aria-label="Sections">
          <a href="#how">How it works</a>
          <a href="#tools">Tools</a>
          <a href="#keys">Security</a>
          <a href={REPO_URL}>GitHub</a>
        </nav>
        <a className="btn btn-primary btn-small" href={primary.href}>
          {primary.label}
        </a>
      </header>

      <main id="top" className="story">
        {/* 1. Hero: an eclipse. The ring is the gate your requests pass through. */}
        <section className="scene scene-hero" data-scene="hero" aria-labelledby="hero-title">
          <div className="scene-pin">
            <div className="hero-copy" data-hero>
              <h1 id="hero-title" className="display" aria-label="Every model. One link.">
                <SplitText lines={['Every model.', 'One link.']} accentLine={1} />
              </h1>
              <p className="hero-sub" data-hero-fade>
                Call any Vercel AI Gateway model from Claude or ChatGPT. Your own deployment, billed to your own credits.
              </p>
              <div className="ctas" data-hero-fade>
                <a className="btn btn-primary" href={primary.href} data-magnetic>
                  {primary.label}
                </a>
                <a className="btn btn-ghost" href={REPO_URL}>
                  View source
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Through the gate: a galaxy where every star is a model. */}
        <section className="scene" data-scene="catalog" aria-label="The catalog">
          <div className="scene-pin">
            <div className="beat" data-beat>
              <h2 className="beat-title">
                {catalog ? `${fmt(catalog.total)} models.` : 'Hundreds of models.'}
                <br />
                <span className="dim">{catalog ? `${catalog.providers} providers. One catalog.` : 'One catalog.'}</span>
              </h2>
              <p className="beat-sub">
                {catalog
                  ? 'Every point of light here is a real model on AI Gateway, read live. New ones appear without a redeploy.'
                  : 'Read live from AI Gateway. New models appear without a redeploy.'}
              </p>
            </div>
            <div className="beat" data-beat>
              <h2 className="beat-title">
                Text, image and video.
                <br />
                <span className="dim">All behind the same link.</span>
              </h2>
            </div>
            {catalog && (
              <div className="kinds" data-kinds aria-hidden="true">
                <span style={{ left: '25%' }}>
                  <b>{fmt(catalog.counts.text)}</b> text
                </span>
                <span style={{ left: '50%' }}>
                  <b>{fmt(catalog.counts.image)}</b> image
                </span>
                <span style={{ left: '75%' }}>
                  <b>{fmt(catalog.counts.video)}</b> video
                </span>
              </div>
            )}
          </div>
        </section>

        {/* 3. How a request travels. */}
        <section id="how" className="scene" data-scene="how" aria-labelledby="how-title">
          <div className="scene-pin">
            <h2 id="how-title" className="sr-only">
              How it works
            </h2>
            {HOW.map((beat) => (
              <div key={beat.title} className="beat" data-beat>
                <h3 className="beat-title">
                  <WordReveal text={beat.title} />
                </h3>
                <p className="beat-sub">{beat.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 4. The five tools. */}
        <section id="tools" className="scene scene-tools" data-scene="tools" aria-labelledby="tools-title">
          <div className="scene-pin">
            <h2 id="tools-title" className="tools-heading">
              Five tools your chat can call.
            </h2>
            <div className="tools-stage">
              {TOOLS.map((tool) => (
                <article key={tool.name} className="tool" data-tool>
                  <div className="tool-text">
                    <h3>{tool.name}</h3>
                    <p>{tool.text}</p>
                    <code>{tool.signature}</code>
                  </div>
                  <div className="tool-visual">
                    <ToolArt variant={tool.art} />
                  </div>
                </article>
              ))}
            </div>
            <div className="ticks" aria-hidden="true">
              {TOOLS.map((tool) => (
                <span key={tool.name} data-tick />
              ))}
            </div>
          </div>
        </section>

        {/* 5. Security, as one paragraph that lights up word by word. */}
        <section id="keys" className="scene scene-keys" data-scene="keys" aria-labelledby="keys-title">
          <div className="scene-pin">
            <h2 id="keys-title" className="eyebrow">
              Your keys, your credits
            </h2>
            <p className="keys-text" data-words>
              <WordReveal
                text={`Your link works like a password, so keep it private. Set a budget in AI Gateway, because that is the real limit. Files stay in your own private storage, and the links you get expire after ${linkTtlHours} hours. Nobody else ever holds your keys.`}
              />
            </p>
          </div>
        </section>

        {/* 6. Finale over a rising planet horizon. */}
        <section id="deploy" className="finale" data-scene="finale" aria-labelledby="finale-title">
          <h2 id="finale-title" className="finale-title" data-reveal>
            Live in three moves.
          </h2>
          <ol className="moves">
            <li data-reveal>
              <span className="move-verb">Deploy</span>
              <p>One click creates the project and a private Blob store, then asks for your secret.</p>
            </li>
            <li data-reveal>
              <span className="move-verb">Paste</span>
              <p>Open the setup page, paste the secret, and test the connection.</p>
            </li>
            <li data-reveal>
              <span className="move-verb">Connect</span>
              <p>Add the URL as a custom connector in Claude or ChatGPT.</p>
            </li>
          </ol>
          <div className="finale-cta" data-reveal>
            <a className="btn btn-primary btn-large" href={primary.href} data-magnetic>
              {primary.label}
            </a>
            {mode === 'author' ? (
              <p className="note">
                A hosted version with Sign in with Vercel is planned. Follow the <a href={REPO_URL}>GitHub repo</a> for it.
              </p>
            ) : (
              <p className="note">
                Not your deployment? <a href={DEPLOY_URL}>Deploy your own copy</a>.
              </p>
            )}
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>Gateway MCP is open source under the MIT license.</span>
        <span>Not affiliated with Vercel.</span>
        <a href={REPO_URL}>GitHub</a>
      </footer>
    </>
  );
}
