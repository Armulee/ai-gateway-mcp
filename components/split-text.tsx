// Splits display lines into masked characters for the hero reveal. The heading
// that wraps this must carry the readable text in aria-label.

export function SplitText({ lines, accentLine }: { lines: string[]; accentLine?: number }) {
  return (
    <>
      {lines.map((line, li) => (
        <span key={line} className={`split-line${li === accentLine ? ' is-accent' : ''}`} aria-hidden="true">
          {line.split(' ').map((word, wi) => (
            <span key={wi} className="split-word">
              {[...word].map((char, ci) => (
                <span key={ci} className="split-char" data-hero-char>
                  {char}
                </span>
              ))}
            </span>
          ))}
        </span>
      ))}
    </>
  );
}
