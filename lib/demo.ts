// DEMO_MODE=1 turns a deployment into the project's public demo: the setup
// page opens as if setup were done, usage shows made-up sample numbers, and a
// banner says so and links to the Deploy button. The connector itself stays
// off: no secret ever matches (lib/secret.ts), so /mcp and /api/stats answer
// 404 and nobody can spend the demo team's credits.
//
// next.config.ts copies DEMO_MODE into the client build, so this works in
// server and client components alike.

export const isDemo = (): boolean => process.env.DEMO_MODE === '1';
