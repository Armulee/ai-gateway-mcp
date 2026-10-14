import type { CatalogSummary } from '@/lib/catalog-summary';
import { FALLBACK_COUNTS } from '@/lib/catalog-summary';
import { DEPLOY_URL, REPO_URL } from '@/lib/site';
import { CosmosCanvas } from '../cosmos/cosmos-canvas';
import { Requirements } from '../requirements';
import { SiteNav } from '../site-nav';
import { SplitText } from '../split-text';
import { VercelBadge } from '../vercel-badge';
import { WordReveal } from '../word-reveal';
import { LandingMotion } from './landing-motion';
import { HowArt } from './film/how-art';
import { OpenArt } from './film/open-art';
import { PayingArt } from './film/paying-art';
import { PriceArt } from './film/price-art';
import { SafetyArt } from './film/safety-art';
import { StarDefs } from './film/star-defs';
import { ToolsArt } from './film/tools-art';
import { IdleHint } from './idle-hint';
import { KindLogos } from './provider-logos';

/** "author": the project's own site. "instance": someone's self-hosted deployment. */
const KINDS = ['text', 'image', 'video'] as const;

export type LandingMode = 'author' | 'instance';

/** Chapters of the story, in order. Also drives the progress rail. */
export const CHAPTERS = [
  { id: 'top', label: 'Intro' },
  { id: 'price', label: 'Price' },
  { id: 'models', label: 'Models' },
  { id: 'how', label: 'How it works' },
  { id: 'tools', label: 'What it does' },
  { id: 'paying', label: 'Paying' },
  { id: 'open', label: 'Open source' },
  { id: 'safety', label: 'Safety' },
  { id: 'start', label: 'Get started' },
] as const;

const TOOLS: { label: string; name: string; signature: string; text: string }[] = [
  { label: 'Find a model', name: 'list_models', signature: 'list_models({ type?, query? })', text: 'Search every model by type or name, with its price.' },
  { label: 'Write', name: 'generate_text', signature: 'generate_text({ model, prompt })', text: 'Answers, drafts and code from any language model, with what each reply cost.' },
  { label: 'Make images', name: 'generate_image', signature: 'generate_image({ model, prompt })', text: 'Pictures show up right in the chat, with a private download link.' },
  { label: 'Make videos', name: 'start_video', signature: 'start_video({ model, prompt })', text: 'Video takes minutes, so you get a ticket right away instead of waiting.' },
  { label: 'Get your video', name: 'get_video', signature: 'get_video({ job_id })', text: 'Checks on the ticket. When the video is ready, you get the file.' },
];

const fmt = (n: number) => n.toLocaleString('en-US');
const pad = (n: number) => String(n).padStart(2, '0');

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
      <StarDefs />
      <LandingMotion />
      <IdleHint />

      <SiteNav
        home="#top"
        links={
          <>
            <a href="#price">Price</a>
            <a href="#how">How it works</a>
            <a href="#paying">Paying</a>
            <a href={REPO_URL}>GitHub</a>
          </>
        }
        action={
          <a className="btn btn-primary btn-small" href={primary.href}>
            {primary.label}
          </a>
        }
      />

      <nav className="orbit" aria-label="Chapters" data-orbit>
        <div className="orbit-rail" style={{ '--last': CHAPTERS.length - 1 } as React.CSSProperties}>
          <span className="orbit-track" aria-hidden="true" />
          <span className="orbit-fill" aria-hidden="true" />
          <ol>
            {CHAPTERS.map((chapter, i) => (
              <li key={chapter.id} style={{ '--i': i } as React.CSSProperties}>
                <a
                  href={`#${chapter.id}`}
                  data-rail={chapter.id}
                  className={i === 0 ? 'is-active' : undefined}
                  aria-current={i === 0 ? 'step' : undefined}
                >
                  <span className="orbit-star" aria-hidden="true" />
                  <span className="orbit-name">{chapter.label}</span>
                </a>
              </li>
            ))}
          </ol>
          <div className="orbit-ship" aria-hidden="true">
            <span className="orbit-ring">
              <i />
            </span>
            <span className="orbit-tag" data-orbit-tag>
              <b data-orbit-num>01</b>
              <span data-orbit-label>{CHAPTERS[0].label}</span>
            </span>
          </div>
        </div>
        <p className="orbit-count" aria-hidden="true">
          <span data-orbit-count>01</span> / {pad(CHAPTERS.length)}
          <span className="orbit-pct" data-orbit-pct>
            0%
          </span>
        </p>
      </nav>
      <main className="story">
        {/* Intro: an eclipse. Its ring is the private link every request passes through. */}
        <section id="top" className="scene scene-hero" data-scene="hero" data-chapter="top" aria-labelledby="hero-title">
          <div className="scene-pin">
            <div className="hero-copy" data-hero>
              <h1 id="hero-title" className="display" aria-label="Every AI model. No markup.">
                <SplitText lines={['Every AI model.', 'No markup.']} accentLine={1} />
              </h1>
              <p className="hero-sub" data-hero-fade>
                Use text, image and video models{catalog ? ` from ${catalog.providers} providers` : ''} right inside Claude or
                ChatGPT, at each provider&apos;s own price on <VercelBadge kind="gateway" />. No subscription, no extra charges.
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
            <div className="scroll-cue" data-scroll-cue aria-hidden="true">
              <span>Scroll</span>
              <i />
            </div>
          </div>
        </section>

        {/* Price: why this costs less than a typical AI app. */}
        <section id="price" className="scene scene-film" data-scene="price" data-chapter="price" aria-labelledby="price-title">
          <div className="scene-pin">
            <div className="film-copy">
              <div className="beats">
                <h2 id="price-title" className="sr-only">
                  Price
                </h2>
                <div className="beat" data-beat>
                  <h3 className="beat-title">
                    Many AI apps add a margin.
                    <br />
                    <span className="dim">A monthly plan, or a markup on every request.</span>
                  </h3>
                  <p className="beat-sub">Part of what you pay goes to the app, not to the model you are using.</p>
                </div>
                <div className="beat beat-quote" data-beat>
                  <h3 className="beat-title">This one does not.</h3>
                  <p className="beat-sub">
                    Requests run on <VercelBadge kind="gateway" />, which bills at the provider&apos;s own price. In Vercel&apos;s words:
                  </p>
                  <figure className="quote">
                    <blockquote>
                      <p>
                        &ldquo;AI Gateway charges <span className="hl">no markup</span> and <span className="hl">no platform fee</span> on tokens. You pay the provider&apos;s list price on a
                        pay-as-you-go basis.&rdquo;
                      </p>
                    </blockquote>
                    <figcaption>
                      <a href="https://vercel.com/docs/ai-gateway/pricing" target="_blank" rel="noopener noreferrer">
                        Vercel AI Gateway docs, Pricing
                      </a>
                    </figcaption>
                  </figure>
                </div>
              </div>
            </div>
            <div className="film-stage">
              <PriceArt />
            </div>
          </div>
        </section>

        {/* Models: a galaxy where every point is a real model. */}
        <section id="models" className="scene" data-scene="catalog" data-chapter="models" aria-labelledby="models-title">
          <div className="scene-pin">
            <h2 id="models-title" className="sr-only">
              Models
            </h2>
            <div className="beat" data-beat>
              <h3 className="beat-title">
                {catalog ? `${fmt(catalog.total)} models.` : 'Hundreds of models.'}
                <br />
                <span className="dim">{catalog ? `${catalog.providers} providers. One place.` : 'One place.'}</span>
              </h3>
              <p className="beat-sub">
                {catalog
                  ? 'Every point of light here is a real model on AI Gateway, read live. New ones appear on their own.'
                  : 'Read live from AI Gateway. New models appear on their own.'}
              </p>
            </div>
            <div className="beat" data-beat>
              <h3 className="beat-title">
                Text, image and video.
                <br />
                <span className="dim">All behind the same link.</span>
              </h3>
            </div>
            {catalog && (
              <ul className="kinds" data-kinds aria-label="Models by kind">
                {KINDS.map((kind, i) => (
                  <li key={kind} className="kind" style={{ '--x': `${25 + i * 25}%` } as React.CSSProperties} data-kind>
                    <p className="kind-label">
                      <b>{fmt(catalog.counts[kind])}</b> {kind}
                    </p>
                    <KindLogos providerIds={catalog.kindProviders[kind]} max={8} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* How it works, in plain words. */}
        <section id="how" className="scene scene-film" data-scene="how" data-chapter="how" aria-labelledby="how-title">
          <div className="scene-pin">
            <div className="film-copy">
              <div className="beats">
                <h2 id="how-title" className="sr-only">
                  How it works
                </h2>
                <div className="beat" data-beat>
                  <h3 className="beat-title">
                    <WordReveal text="Claude and ChatGPT can plug in extra tools." />
                  </h3>
                  <p className="beat-sub">
                    They are called connectors. This project is one: it connects your chat to every model on{' '}
                    <VercelBadge kind="gateway" />.
                  </p>
                </div>
                <div className="beat" data-beat>
                  <h3 className="beat-title">
                    <WordReveal text="You ask in chat." />
                  </h3>
                  <p className="beat-sub">Claude or ChatGPT picks the right tool, like making an image, and uses it.</p>
                </div>
                <div className="beat" data-beat>
                  <h3 className="beat-title">
                    <WordReveal text="Your private link carries it." />
                  </h3>
                  <p className="beat-sub">A web address with your secret inside. Only your own copy of this project answers it.</p>
                </div>
                <div className="beat" data-beat>
                  <h3 className="beat-title">
                    <WordReveal text="AI Gateway runs the model." />
                  </h3>
                  <p className="beat-sub">
                    The result comes back to your chat. The cost goes to your own <VercelBadge kind="vercel" /> account.
                  </p>
                </div>
              </div>
            </div>
            <div className="film-stage">
              <HowArt />
            </div>
          </div>
        </section>

        {/* What it does: five tools, in everyday words. */}
        <section id="tools" className="scene scene-tools" data-scene="tools" data-chapter="tools" aria-labelledby="tools-title">
          <div className="scene-pin">
            <h2 id="tools-title" className="tools-heading">
              What your chat can do with it
            </h2>
            <div className="tools-stage">
              <div className="film-stage tools-film">
                <ToolsArt />
              </div>
              {TOOLS.map((tool) => (
                <article key={tool.name} className="tool" data-tool>
                  <div className="tool-text">
                    <h3>{tool.label}</h3>
                    <p className="tool-name">{tool.name}</p>
                    <p>{tool.text}</p>
                    <code>{tool.signature}</code>
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

        {/* Paying: usage, not plans. */}
        <section id="paying" className="scene scene-film" data-scene="paying" data-chapter="paying" aria-labelledby="paying-title">
          <div className="scene-pin">
            <div className="film-copy">
              <h2 id="paying-title" className="scene-heading" data-heading>
                Pay only for what you use.
              </h2>
              <div className="beats">
                <div className="beat" data-beat>
                  <h3 className="beat-title">No plan.</h3>
                  <p className="beat-sub">No subscription and no monthly fee. Each request costs what that model costs, nothing more.</p>
                </div>
                <div className="beat" data-beat>
                  <h3 className="beat-title">Your own credits.</h3>
                  <p className="beat-sub">
                    Top up <VercelBadge kind="gateway" /> credits on your Vercel account, or turn on auto top-up. Every team also gets free
                    monthly credits for a set of models.
                  </p>
                </div>
                <div className="beat" data-beat>
                  <h3 className="beat-title">Your own limit.</h3>
                  <p className="beat-sub">Set a spend budget in AI Gateway to cap what your link can ever spend.</p>
                </div>
              </div>
            </div>
            <div className="film-stage">
              <PayingArt />
            </div>
          </div>
        </section>

        {/* Open source and independent. */}
        <section id="open" className="scene scene-film" data-scene="open" data-chapter="open" aria-labelledby="open-title">
          <div className="scene-pin">
            <div className="film-copy">
              <h2 id="open-title" className="scene-heading" data-heading>
                Free. Open source. <span className="dim">Yours to run.</span>
              </h2>
              <div className="beats">
                <div className="beat" data-beat>
                  <h3 className="beat-title">I charge nothing.</h3>
                  <p className="beat-sub">No fee, no markup, no sign-up with me. The code is MIT licensed, so anyone can use it, change it or share it.</p>
                </div>
                <div className="beat" data-beat>
                  <h3 className="beat-title">You run your own copy.</h3>
                  <p className="beat-sub">
                    Version 1 runs on your own <VercelBadge kind="vercel" /> account. It takes a few clicks, and the setup page walks you
                    through each one.
                  </p>
                </div>
                <div className="beat" data-beat>
                  <h3 className="beat-title">Why I made it.</h3>
                  <p className="beat-sub">So everyone can use AI at the price providers actually set, from the chat app they already use.</p>
                  <p className="beat-note">Built independently. Not made by or affiliated with Vercel.</p>
                </div>
              </div>
            </div>
            <div className="film-stage">
              <OpenArt />
            </div>
          </div>
        </section>

        {/* Safety: one paragraph that lights up word by word. */}
        <section id="safety" className="scene scene-film scene-keys" data-scene="keys" data-chapter="safety" aria-labelledby="keys-title">
          <div className="scene-pin">
            <div className="film-copy">
              <h2 id="keys-title" className="eyebrow">
                Your keys, your credits
              </h2>
              <p className="keys-text" data-words>
                <WordReveal
                  text={`Your link works like a password, so keep it private. Set a budget in AI Gateway, because that is the real limit. Files stay in your own private storage, and the links you get expire after ${linkTtlHours} hours. Nobody else ever holds your keys.`}
                />
              </p>
            </div>
            <div className="film-stage">
              <SafetyArt hours={linkTtlHours} />
            </div>
          </div>
        </section>

        {/* Get started, over a rising planet horizon. */}
        <section id="start" className="finale" data-scene="finale" data-chapter="start" aria-labelledby="finale-title">
          <h2 id="finale-title" className="finale-title" data-reveal>
            Live in three moves.
          </h2>
          <div data-reveal>
            <Requirements title="What you need" />
          </div>
          <ol className="moves">
            <li data-reveal>
              <span className="move-verb">Deploy</span>
              <p>One click creates your copy and its private storage on Vercel, then asks for your secret.</p>
            </li>
            <li data-reveal>
              <span className="move-verb">Paste</span>
              <p>Open the setup page, paste the secret, and test the connection.</p>
            </li>
            <li data-reveal>
              <span className="move-verb">Connect</span>
              <p>Add the link as a custom connector in Claude or ChatGPT.</p>
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
        <span>AI Gateway MCP is open source under the MIT license.</span>
        <span>Not affiliated with Vercel. Logos belong to their owners.</span>
        <a href={REPO_URL}>GitHub</a>
      </footer>
    </>
  );
}
