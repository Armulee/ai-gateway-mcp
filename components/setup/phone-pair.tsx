'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { encode } from 'uqr';
import { PAIR_PREFIX, useSetup } from './setup-store';

// "On your phone": a round button fixed at the bottom right of the setup page
// that opens a small panel. It says that Claude and ChatGPT on a phone already
// have the connector (added on the web, they sync by themselves); then, for a
// link that works, offers a QR code of this page with the secret after "#",
// so the phone's browser saves it without a paste (setup-store reads and
// clears it). Drawn in this browser; the secret never reaches a server. The
// code shows on a click. Escape or a click outside closes the panel.

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

function PhoneIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M10.5 18.5h3" />
    </svg>
  );
}

export function PhonePair() {
  const titleId = useId();
  const panelId = useId();
  const { secret, connected } = useSetup();
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const [origin, setOrigin] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => setOrigin(window.location.origin), []);
  const ready = connected && Boolean(secret.trim()) && Boolean(origin);
  const link = ready ? `${origin}/${PAIR_PREFIX}${encodeURIComponent(secret.trim())}` : '';

  // While open: Escape or a click outside closes it; focus moves into the panel and back.
  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      trigger.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  return (
    <div className="phone-fab" ref={root}>
      {open && (
        <section className="phone-card" id={panelId} role="dialog" aria-labelledby={titleId} tabIndex={-1} ref={panel} data-lenis-prevent>
          <div className="phone-card-copy">
            <h3 className="phone-card-title" id={titleId}>
              <PhoneIcon className="phone-card-icon" />
              On your phone
            </h3>
            <p>Claude and ChatGPT on your phone already have it: connectors you add on the web show up there by themselves.</p>
            <p>
              {ready
                ? 'Want this page on your phone too, with your link and usage? Scan a code: nothing to type or paste.'
                : 'Once your link works, you can open this page on your phone from here too.'}
            </p>
            {ready && (
              <button type="button" className={`btn btn-small ${shown ? 'btn-ghost' : 'btn-primary'}`} aria-expanded={shown} onClick={() => setShown((s) => !s)}>
                {shown ? 'Hide the QR code' : 'Show QR code'}
              </button>
            )}
          </div>
          {shown && link && (
            <figure className="phone-qr">
              <QrCode text={link} />
              <figcaption>
                Scan it with your phone&apos;s camera: this page opens there with your secret already saved. The address stays in that phone&apos;s browser
                history, so only scan it with your own phone.
              </figcaption>
            </figure>
          )}
        </section>
      )}
      <button
        type="button"
        ref={trigger}
        className={`phone-fab-button${open ? ' is-open' : ''}`}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'Close: on your phone' : 'On your phone'}
        title="On your phone"
        onClick={() => setOpen((o) => !o)}
      >
        <PhoneIcon className="phone-fab-icon" />
      </button>
    </div>
  );
}
