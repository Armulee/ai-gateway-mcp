import vercelIcon from '@lobehub/icons-static-svg/icons/vercel.svg';
import { assetUrl } from '@/lib/asset-url';

const BADGES = {
  vercel: { href: 'https://vercel.com', label: 'Vercel' },
  gateway: { href: 'https://vercel.com/ai-gateway', label: 'AI Gateway' },
} as const;

/** Inline pill with the Vercel mark that links to Vercel or to AI Gateway. Sized in em so it sits inside any sentence. */
export function VercelBadge({ kind }: { kind: keyof typeof BADGES }) {
  const { href, label } = BADGES[kind];
  return (
    <a className="badge" href={href} target="_blank" rel="noopener noreferrer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="badge-icon" src={assetUrl(vercelIcon)} alt="" width={16} height={16} />
      {kind === 'gateway' ? <span className="sr-only">Vercel </span> : null}
      {label}
    </a>
  );
}
