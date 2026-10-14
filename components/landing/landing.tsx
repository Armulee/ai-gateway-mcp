import type { CatalogSummary } from '@/lib/catalog-summary';
import { FALLBACK_COUNTS } from '@/lib/catalog-summary';
import { DEPLOY_URL, REPO_URL } from '@/lib/site';
import { GateCanvas } from '../gate/gate-canvas';
import { BrandMark } from '../brand-mark';
import { SplitText } from '../split-text';
import { LandingMotion } from './landing-motion';
import { ToolArt, type ToolArtVariant } from './tool-art';

const TOOLS: { name: string; signature: string; text: string; art: ToolArtVariant }[] = [
  {
    name: 'list_models',
    signature: 'list_models({ type?, query? })',
    text: 'Browse the live catalog by type or name, with prices.',
    art: 'catalog',
  },
  {
    name: 'generate_text',
    signature: 'generate_text({ model, prompt, system?, max_tokens? })',
    text: 'Any language model. You get the text and what it cost.',
    art: 'text',
  },
  {
    name: 'generate_image',
    signature: 'generate_image({ model, prompt, size_or_aspect?, n? })',
    text: 'Images land straight in the chat, plus a private download link.',
    art: 'image',
  },
  {
    name: 'start_video',
    signature: 'start_video({ model, prompt, image_url?, duration? })',
    text: 'Starts a video job and hands back a job id right away.',
    art: 'video',
  },
  {
    name: 'get_video',
    signature: 'get_video({ job_id })',
    text: 'Checks the job. When it is done, you get the file.',
    art: 'reel',
  },
];

const fmt = (n: number) => n.toLocaleString('en-US');

export function Landing({ catalog, linkTtlHours }: { catalog: CatalogSummary | null; linkTtlHours: number }) {
  const counts = catalog?.counts ?? FALLBACK_COUNTS;
  return (
    <>
      <GateCanvas counts={counts} initial={{ morph: 0, offsetX: 0.42, offsetY: 0.02, intensity: 1, scale: 0.86 }} />
      <LandingMotion />

      <header className="nav">
        <a className="nav-brand" href="#top" aria-label="Gateway MCP, back to top">
          <BrandMark />
          <span>Gateway MCP</span>
        </a>
        <nav className="nav-links" aria-label="Sections">
          <a href="#flow">How it works</a>
          <a href="#tools">Tools</a>
          <a href="#security">Security</a>
          <a href={REPO_URL}>GitHub</a>
        </nav>
        <a className="btn btn-primary btn-small" href={DEPLOY_URL}>
          Deploy to Vercel
        </a>
      </header>

      <main id="top" className="landing">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <h1 id="hero-title" className="display" aria-label="Every model. One link.">
              <SplitText lines={['Every model.', 'One link.']} accentLine={1} />
            </h1>
            <p className="hero-sub" data-hero-fade>
              Call any Vercel AI Gateway model from Claude or ChatGPT. Your own deployment, billed to your own credits.
            </p>
            <div className="hero-ctas" data-hero-fade>
              <a className="btn btn-primary" href={DEPLOY_URL} data-magnetic>
                Deploy to Vercel
              </a>
              <a className="btn btn-ghost" href={REPO_URL}>
                View source
              </a>
            </div>
          </div>
        </section>

        <section id="flow" className="flow" aria-labelledby="flow-title" data-flow>
          <div className="flow-pin" data-flow-pin>
            <h2 id="flow-title" className="flow-title">
              How a request travels
            </h2>
            <ol className="flow-steps">
              <li className="flow-step" data-flow-step>
                <h3>You ask in chat.</h3>
                <p>Claude or ChatGPT decides to call a tool, like generate_image.</p>
              </li>
              <li className="flow-step" data-flow-step>
                <h3>Your private link carries it.</h3>
                <p>One URL with your secret in it. Only your deployment answers.</p>
              </li>
              <li className="flow-step" data-flow-step>
                <h3>AI Gateway runs the model.</h3>
                <p>Text, image or video, billed to the Vercel team that owns the deployment.</p>
              </li>
            </ol>
            <div className="flow-progress" aria-hidden="true">
              <span data-flow-tick />
              <span data-flow-tick />
              <span data-flow-tick />
            </div>
            {catalog && (
              <div className="flow-kinds" data-flow-kinds aria-hidden="true">
                <span style={{ left: '25%' }}>
                  Text <b>{fmt(catalog.counts.text)}</b>
                </span>
                <span style={{ left: '50%' }}>
                  Image <b>{fmt(catalog.counts.image)}</b>
                </span>
                <span style={{ left: '75%' }}>
                  Video <b>{fmt(catalog.counts.video)}</b>
                </span>
              </div>
            )}
          </div>
        </section>

        <section className="catalog" aria-labelledby="catalog-title" data-catalog>
          <div className="catalog-head">
            <h2 id="catalog-title" className="h2">
              {catalog ? `${fmt(catalog.total)} models.` : 'Hundreds of models.'}
              <br />
              <span className="muted-strong">One connector.</span>
            </h2>
            <p className="lead">
              Read live from the AI Gateway catalog. New models show up in your chat without a redeploy.
            </p>
          </div>
          {catalog && (
            <dl className="catalog-stats">
              <div>
                <dt>Text</dt>
                <dd data-count={catalog.counts.text}>{fmt(catalog.counts.text)}</dd>
              </div>
              <div>
                <dt>Image</dt>
                <dd data-count={catalog.counts.image}>{fmt(catalog.counts.image)}</dd>
              </div>
              <div>
                <dt>Video</dt>
                <dd data-count={catalog.counts.video}>{fmt(catalog.counts.video)}</dd>
              </div>
            </dl>
          )}
          {catalog && (
            <div className="marquee" aria-label="Some of the models available" data-marquee>
              <div className="marquee-track" data-marquee-track>
                {[0, 1].map((copy) => (
                  <ul key={copy} aria-hidden={copy === 1 || undefined}>
                    {catalog.sampleIds.map((id) => (
                      <li key={id}>{id}</li>
                    ))}
                  </ul>
                ))}
              </div>
            </div>
          )}
        </section>

        <section id="tools" className="tools" aria-labelledby="tools-title" data-tools>
          <div className="tools-track" data-tools-track>
            <div className="tools-intro">
              <h2 id="tools-title" className="h2">
                Five tools your chat can call.
              </h2>
              <p className="lead">Small on purpose. Each one is a thin layer over AI Gateway.</p>
            </div>
            {TOOLS.map((tool) => (
              <article key={tool.name} className="tool">
                <ToolArt variant={tool.art} />
                <div className="tool-body">
                  <h3>{tool.name}</h3>
                  <p>{tool.text}</p>
                  <code>{tool.signature}</code>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="security" className="security" aria-labelledby="security-title">
          <p className="eyebrow" id="security-title">
            Before you share anything
          </p>
          <ul className="security-lines">
            <li data-line>
              <strong>Your link is a password.</strong> Anyone holding it can spend your credits. Keep it private.
            </li>
            <li data-line>
              <strong>Set a budget.</strong> AI Gateway enforces it. This server only caps each call.
            </li>
            <li data-line>
              <strong>Files stay private.</strong> Links you get in chat expire after {linkTtlHours} hours.
            </li>
            <li data-line>
              <strong>Nobody else holds your keys.</strong> Your deployment, your credits, your storage.
            </li>
          </ul>
        </section>

        <section id="deploy" className="deploy" aria-labelledby="deploy-title">
          <h2 id="deploy-title" className="h2">
            Live in three moves.
          </h2>
          <ol className="moves">
            <li data-reveal>
              <span className="move-verb">Deploy.</span>
              <p>One click creates the project and a private Blob store, then asks for your secret.</p>
            </li>
            <li data-reveal>
              <span className="move-verb">Paste.</span>
              <p>Open your deployment, paste the secret, and test the connection.</p>
            </li>
            <li data-reveal>
              <span className="move-verb">Connect.</span>
              <p>Add the URL as a custom connector in Claude or ChatGPT. Done.</p>
            </li>
          </ol>
          <div className="deploy-cta" data-reveal>
            <a className="btn btn-primary btn-large" href={DEPLOY_URL} data-magnetic>
              Deploy to Vercel
            </a>
            <p className="muted">
              A hosted version with Sign in with Vercel is planned. Watch the <a href={REPO_URL}>GitHub repo</a> for it.
            </p>
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
