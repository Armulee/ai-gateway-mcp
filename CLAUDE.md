# Gateway MCP — project brief

An open-source MCP server that lets people call any Vercel AI Gateway model (text, image, video) from Claude, ChatGPT and other MCP clients. Every call is billed to the user's own Vercel AI Gateway credits. The author never holds anyone's money or keys.

## Scope

### v1 — build now: self-host
- Each user deploys their own copy with a "Deploy to Vercel" button.
- Gateway auth uses the deployment's OIDC token (`VERCEL_OIDC_TOKEN`), so no Gateway API key is needed. `AI_GATEWAY_API_KEY` overrides it for local dev.
- Billing goes to the Vercel team that owns the deployment.

### v2 — later, blocked on Vercel private beta: hosted
- One shared endpoint. Users connect with Sign in with Vercel.
- Needs team permissions "AI Gateway: Use" and "Blob: Read and Write", which are in private beta. Access has been requested.
- Do not build v2 now. Keep v1 code structured so a per-user auth layer can be added later (see "v2 notes").

### Non-goals
- No hosted mode where users paste their Gateway API key into our site.
- No markup, no own billing, no own model routing. Stay a thin client on top of AI Gateway (Vercel AUP forbids competing/substantially similar products and reselling access).
- Never strip watermarks or metadata from generated media.

## Architecture (v1)

- Next.js (App Router) on Vercel, TypeScript.
- MCP over Streamable HTTP with `mcp-handler` v2 (`@modelcontextprotocol/server` v2, zod v4). No Redis, stateless.
- Endpoint: `/mcp/[secret]`. claude.ai custom connectors only support OAuth or no auth, and cannot send custom headers, so the secret lives in the path.
  - Compare against env `MCP_SECRET` with a constant-time comparison. Return 404 on mismatch: `proxy.ts` rewrites wrong secrets to the standard 404 page, and the route checks again.
  - Never log the secret or full request URLs.
- AI calls through the AI SDK with the AI Gateway provider.
- Media storage: a **private** Vercel Blob store in the user's own team. Auth via OIDC (`BLOB_STORE_ID`), `BLOB_READ_WRITE_TOKEN` as fallback. Files are shared with presigned URLs that expire (`SIGNED_URL_TTL_HOURS`, default 24, max 168).
- Video jobs are stateless: `job_id` = model + AI Gateway job id, HMAC-signed with a key derived from `MCP_SECRET`. No database.

## Website (part of v1)

The same Next.js app serves a small website. It is free to host on Vercel.

1. Instance setup page at `/` (every self-hoster sees this on their own deployment)
   - Status checks: Gateway reachable via OIDC, Blob connected, `MCP_SECRET` set and long enough. Show pass/fail and a fix hint for each.
   - Never render the secret or the full connector URL by default. Provide a field where the owner pastes their secret; build the connector URL in the browser only (nothing sent to the server) and offer a "Test connection" button that calls the MCP endpoint's tools list.
   - Short how-to: add as a custom connector in Claude and ChatGPT, set a Gateway budget, rotate the secret.
2. Project landing page (only on the author's own deployment, enabled with env `SITE_MODE=landing`; default is `instance`)
   - What it is, a demo GIF or video, Deploy button, GitHub link.
   - Waitlist signup for the future hosted version. Storage for the waitlist is not decided yet: ask before choosing.
   - Build this after the MCP server and setup page work.

## Security

Threat: a leaked connector URL lets anyone spend the owner's Gateway credits and generate content under their Vercel account. Defaults:

- `MCP_SECRET` must be at least 32 characters. If missing or shorter, the MCP endpoint refuses to run and the setup page shows the error.
- Wrong secret returns 404, identical to any unknown route. Constant-time comparison.
- Never log the secret, full request URLs or auth headers.
- Rotation: change `MCP_SECRET` and redeploy; the old URL dies. Document this in the README and on the setup page.
- Per-call caps via env with safe defaults: `MAX_VIDEO_SECONDS` (default 8), `MAX_IMAGES_PER_CALL` (default 4), optional `ALLOWED_MODELS` allowlist (comma separated; empty means all).
- The real spend cap is the AI Gateway budget, which Vercel enforces. The setup page and README must tell owners to set one.
- Blob store is private; uploads use unguessable paths. Say plainly that anyone holding a returned link can view that file until the link expires.
- v1 relies on a secret in the URL because claude.ai connectors cannot send headers. OAuth replaces this in v2.

## Tools

1. `list_models({ type?: "text" | "image" | "video", query?: string })`
   - Read from `https://ai-gateway.vercel.sh/v1/models`. Return id, type, capability tags (e.g. t2v, i2v) and price fields. Keep output compact.
2. `generate_text({ model, prompt, system?, max_tokens? })`
   - Return the text plus cost from `providerMetadata.gateway.cost` when present.
3. `generate_image({ model, prompt, size_or_aspect?, n? })`
   - Return images as MCP image content (base64) so they show in chat without storage.
   - If Blob is configured, also upload and return the URL.
4. `start_video({ model, prompt, image_url?, duration?, aspect_ratio? })`
   - Video can take minutes, longer than a tool call or function should wait. Use AI Gateway's asynchronous video generation (start, then poll status). Return a `job_id` immediately.
5. `get_video({ job_id })`
   - Return status. When done, upload the video to Blob and return the URL.
   - If Blob is not configured, return a clear error telling the user to connect a Blob store.

Every tool must return readable errors for: insufficient Gateway credits, video not available on the user's plan, unknown model, provider error. Include the model id in errors.

## Verify before coding (do not trust this brief over the docs)

Read the current docs first and follow them where they differ from this file:
- MCP on Vercel: https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel
- AI SDK with MCP: https://vercel.com/docs/mcp/integrations/ai-sdk
- Gateway auth and OIDC: https://vercel.com/docs/ai-gateway/authentication-and-byok
- Image generation: https://vercel.com/docs/ai-gateway/capabilities/image-generation
- Video generation (incl. async): https://vercel.com/docs/ai-gateway/capabilities/video-generation
- Video quickstart: https://vercel.com/docs/ai-gateway/getting-started/video
- Deploy button: https://vercel.com/docs/deploy-button
- Vercel Blob: https://vercel.com/docs/vercel-blob

Verified (Oct 2026):
- AI SDK 7. Video is still experimental: `experimental_startVideo` / `experimental_getVideoStatus` (ai >= 7.0.76); a job resumes from `{ gatewayJobId }`.
- The Deploy button can create and connect a Blob store (`stores` param).
- Image-only models use `generateImage` (base64); image-capable LLMs (Nano Banana) use `generateText` and return `files`.

Still unverified (check on a real deployment):
- Whether providers can fetch Blob presigned URLs for image-to-video.
- Exact Gateway error shape for "out of credits" and "video not on plan" (matched by status/message today).

## Deploy experience (README)

- Deploy button that clones the repo and prompts for `MCP_SECRET` (suggest a long random value).
- The Deploy button creates and connects a private Blob store itself (`stores=[{"type":"blob","access":"private"}]`).
- Steps: deploy → open the setup page → copy `https://<app>.vercel.app/mcp/<MCP_SECRET>` → add as a custom connector in Claude or ChatGPT.
- Warnings: anyone with the URL can spend your credits, so keep it private. Set an AI Gateway budget. Video needs enough paid Gateway credits (whether the free monthly credit covers video is unverified, so the README does not claim it).
- License: MIT.

## Definition of done (v1)

- Works locally with the MCP Inspector against `AI_GATEWAY_API_KEY`.
- Deployed to Vercel and works with OIDC only (no API key set).
- Added to claude.ai as a custom connector: list models, generate text, generate image, start and fetch a video all work.
- Wrong secret returns 404; a short or missing secret disables the endpoint.
- Setup page shows correct status checks and never exposes the secret.
- README is complete and the Deploy button works from a clean account.
- Landing page (`SITE_MODE=landing`) comes after all of the above.

## v2 notes (do not build yet)

- Sign in with Vercel (OAuth 2.0 + PKCE), scopes `openid` + `offline_access`, team permissions "AI Gateway: Use" and "Blob: Read and Write".
- The server becomes an MCP OAuth authorization server so claude.ai can connect with OAuth instead of a secret URL.
- Store refresh tokens encrypted at rest. Let users disconnect and delete their data.
- Unverified: whether the Gateway accepts the OAuth access token directly, whether the app can create a Blob store for the user, and whether per-app spend limits exist.

## Working rules

- Build v1 only. Ask before adding dependencies beyond Next.js, the AI SDK, the MCP handler, Vercel Blob and zod.
- Ask before changing scope or architecture.
- Keep it small. This is meant to ship in half a day.
