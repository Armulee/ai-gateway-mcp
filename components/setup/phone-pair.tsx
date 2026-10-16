'use client';

import { useEffect, useMemo, useState } from 'react';
import { encode } from 'uqr';
import { PAIR_PREFIX, useSetup } from './setup-store';

// "Open on your phone": a QR code of this page with the secret after "#", so
// the phone's browser saves it without a paste (setup-store reads and clears
// it). Drawn in this browser; the secret never reaches a server. Shown only
// on a click, for a link that works. Claude on a phone needs none of this:
// connectors added on claude.ai show up there by themselves.

function QrCode({ text }: { text: string }) {
  const { data, size } = useMemo(() => encode(text, { ecc: 'M', border: 2 }), [text]);
  const path = data.flatMap((row, y) => row.map((on, x) => (on ? `M${x} ${y}h1v1h-1z` : ''))).join('');
  return (
    <svg className="phone-qr-code" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="QR code that opens this page on your phone" shapeRendering="crispEdges">
      <rect width={size} height={size} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  );
}

export function PhonePair() {
  const { secret, connected } = useSetup();
  const [shown, setShown] = useState(false);
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  if (!connected || !secret.trim() || !origin) return null;
  const link = `${origin}/${PAIR_PREFIX}${encodeURIComponent(secret.trim())}`;

  return (
    <div className="phone-pair">
      <button type="button" className="btn btn-ghost btn-small" aria-expanded={shown} onClick={() => setShown((s) => !s)}>
        {shown ? 'Hide the QR code' : 'Open on your phone'}
      </button>
      {shown && (
        <figure className="phone-qr">
          <QrCode text={link} />
          <figcaption>
            Scan it with your phone&apos;s camera: this page opens there with your secret already saved. The address stays in that phone&apos;s
            browser history, so only scan it with your own phone. Claude on your phone doesn&apos;t need this: connectors you add on claude.ai show
            up there by themselves.
          </figcaption>
        </figure>
      )}
    </div>
  );
}
