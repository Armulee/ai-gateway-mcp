'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The public demo's first section (DEMO_MODE): a real claude.ai chat where
 * the connector paints a picture and then turns it into a video, each time
 * picking the cheapest model. Muted and looping; the poster shows the video
 * mid-play. Under reduced motion, or when autoplay is refused, it waits
 * with native controls for the viewer to press play.
 */
export function DemoClip() {
  const ref = useRef<HTMLVideoElement>(null);
  // The recording has its own player inside it, so native controls only show when it isn't playing by itself.
  const [controls, setControls] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      video.pause();
      setControls(true);
      return;
    }
    void video.play().catch(() => {
      // Autoplay refused (data saver, battery mode): show the controls.
      setControls(true);
    });
  }, []);

  return (
    <section className="setup-section is-first" id="in-chat" data-chapter="in-chat">
      <h2 className="section-title">In your chat</h2>
      <p className="demo-clip-lede">
        Ask in plain words. Claude picks the cheapest model on AI Gateway, makes the picture, then turns it into a video: <b>$0.007</b> for the picture,
        and <b>$0.05–$0.25</b> in the catalog for five seconds of video.
      </p>
      <figure className="demo-clip">
        <video ref={ref} className="demo-clip-video" src="/demo/in-claude.mp4" poster="/demo/in-claude.jpg" width={1280} height={720} muted loop playsInline controls={controls} preload="metadata">
          A recording of Claude making a watercolour fox picture, then a short video of it, with this connector.
        </video>
        <figcaption>Recorded from a real chat on claude.ai, October 2026. Waiting while models work is shortened.</figcaption>
      </figure>
    </section>
  );
}
