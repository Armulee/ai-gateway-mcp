import type { VercelProject } from './site';

// The setup prompt for an AI agent with Vercel access (Claude or Claude Code
// with the Vercel connector, or the vercel CLI). It does every step that
// happens in Vercel after the deploy: storage (when missing), the secret's
// fingerprint (MCP_SECRET_SHA256) and one redeploy. Adding the link to a chat
// app stays a click on the setup page. The prompt carries only the
// fingerprint, which can't open the connector, so the chat transcript and
// the agent's tool calls never hold the secret itself.

export function agentPrompt({
  fingerprint,
  origin,
  project,
  blobDone,
}: {
  /** Empty when the secret is already set: the prompt then leaves it alone. */
  fingerprint: string;
  origin: string;
  project?: VercelProject;
  blobDone: boolean;
}): string {
  const where = project ? `my Vercel project "${project.name}" (team "${project.owner}")` : `the Vercel project that serves ${origin}`;
  const steps = [
    !blobDone && 'Create a private Blob store and connect it to this project for Production and Preview. Skip this if the project already has one.',
    fingerprint &&
      'Add the environment variable MCP_SECRET_SHA256 with the value below for Production and Preview. It is a fingerprint of my secret, not the secret, so any type is fine. If it already exists, update it.',
    'Redeploy the latest Production deployment once and wait until it is ready.',
    "Tell me when it's live.",
  ].filter(Boolean);
  return [
    `Use the Vercel connector (or the vercel CLI) on ${where}. Do these in order:`,
    ...steps.map((step, i) => `${i + 1}. ${step}`),
    ...(fingerprint ? ['', `MCP_SECRET_SHA256=${fingerprint}`] : []),
  ].join('\n');
}
