import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Read by lib/demo.ts in client components too.
  env: { DEMO_MODE: process.env.DEMO_MODE ?? '' },
};

export default nextConfig;
