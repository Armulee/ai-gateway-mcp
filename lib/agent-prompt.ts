import type { VercelProject } from './site';

// The setup prompt for an AI agent with Vercel access (Claude or Claude Code
// with the Vercel connector, or the vercel CLI). It does every step that
// happens in Vercel after the deploy: storage (when missing), MCP_SECRET and
// one redeploy. Adding the link to a chat app stays a click on the setup page.
// The prompt carries the secret, which goes to that chat anyway once the link
// is added as a connector.

export function agentPrompt({
  secret,
  origin,
  project,
  blobDone,
}: {
  /** Empty when MCP_SECRET is already set: the prompt then leaves it alone. */
  secret: string;
  origin: string;
  project?: VercelProject;
  blobDone: boolean;
}): string {
  const where = project ? `my Vercel project "${project.name}" (team "${project.owner}")` : `the Vercel project that serves ${origin}`;
  const steps = [
    !blobDone && 'Create a private Blob store and connect it to this project for Production and Preview. Skip this if the project already has one.',
    secret &&
      'Add the environment variable MCP_SECRET with the value below for Production and Preview. Make it readable later (type "encrypted", not "sensitive"). If it already exists, update it.',
    'Redeploy the latest Production deployment once and wait until it is ready.',
    secret ? "Tell me when it's live. Don't repeat the secret back to me." : "Tell me when it's live.",
  ].filter(Boolean);
  return [
    `Use the Vercel connector (or the vercel CLI) on ${where}. Do these in order:`,
    ...steps.map((step, i) => `${i + 1}. ${step}`),
    ...(secret ? ['', `MCP_SECRET=${secret}`] : []),
  ].join('\n');
}
