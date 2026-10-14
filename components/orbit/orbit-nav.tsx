// The chapter rail on the right edge, which also serves as the page's
// scrollbar (see orbit-rail.ts). One star per chapter; `done` chapters glow
// as finished steps. Server-rendered: without JavaScript it is a list of links.

export type OrbitChapter = { id: string; label: string; done?: boolean };

const pad = (n: number) => String(n).padStart(2, '0');

export function OrbitNav({ chapters, label = 'Chapters' }: { chapters: readonly OrbitChapter[]; label?: string }) {
  return (
    <nav className="orbit" aria-label={label} data-orbit>
      <div className="orbit-rail" style={{ '--last': chapters.length - 1 } as React.CSSProperties}>
        <span className="orbit-track" aria-hidden="true" />
        <span className="orbit-fill" aria-hidden="true" />
        <ol>
          {chapters.map((chapter, i) => (
            <li key={chapter.id} style={{ '--i': i } as React.CSSProperties}>
              <a
                href={`#${chapter.id}`}
                data-rail={chapter.id}
                className={[i === 0 && 'is-active', chapter.done && 'is-done'].filter(Boolean).join(' ') || undefined}
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
            <span data-orbit-label>{chapters[0]?.label}</span>
          </span>
        </div>
      </div>
      <p className="orbit-count" aria-hidden="true">
        <span data-orbit-count>01</span> / {pad(chapters.length)}
        <span className="orbit-pct" data-orbit-pct>
          0%
        </span>
      </p>
    </nav>
  );
}
