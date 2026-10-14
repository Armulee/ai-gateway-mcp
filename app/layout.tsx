import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import { SmoothScroll } from '@/components/motion/smooth-scroll';
import 'lenis/dist/lenis.css';
import './globals.css';

const sans = Geist({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'AI Gateway MCP',
  description: 'Call any Vercel AI Gateway model from Claude, ChatGPT and other MCP clients.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#0b0c0f',
  colorScheme: 'dark',
};

// Marks the page before first paint so intro animations can start hidden
// without a flash. Reduced-motion visitors never get the class.
const MOTION_FLAG = `try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('motion-ok')}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // MOTION_FLAG adds a class before hydration, so the className differs by design.
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MOTION_FLAG }} />
      </head>
      <body>
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
