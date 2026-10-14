import type { ReactNode } from 'react';
import { BrandMark } from './brand-mark';

/** Shared top bar: brand on the left, links in the middle, an action on the right. No background. */
export function SiteNav({ home, links, action }: { home: string; links?: ReactNode; action?: ReactNode }) {
  return (
    <header className="nav">
      <a className="nav-brand" href={home} aria-label="AI Gateway MCP, home">
        <BrandMark />
        <span>AI Gateway MCP</span>
      </a>
      {links ? (
        <nav className="nav-links" aria-label="Sections">
          {links}
        </nav>
      ) : null}
      {action ?? <span />}
    </header>
  );
}
