# AI Gateway MCP — project brief

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

## Website

Two repos:
- **This repo** is the app people deploy: the MCP server plus its setup page at `/` (`/setup` redirects there).
- **`armulee/ai-gateway-mcp-landing`** is the project's own website (black-and-white scrollytelling story). Its buttons open Vercel's clone flow for this repo directly; it has no setup or secret pages of its own. The waitlist for the hosted version belongs there; its storage is not decided yet: ask before choosing.

Setup page at `/` (every self-hoster lands here on their own deployment):
- A guide in steps, each with a code-drawn motion graphic: deploy, AI Gateway via OIDC, Blob (checked on the server), `MCP_SECRET` (generated in the browser, with a link to the project's Environment Variables), then test the link and add it to a chat app (confirmed in the owner's browser). Shows what is done and what is next.
- The secret step comes after storage so one redeploy applies both. Until `MCP_SECRET` is set, the page makes the secret and saves it in that browser as soon as the step shows (reloads keep it), shows the link, and suggests the Vercel **Config** type so it can be looked up later. A saved secret is only checked once the server has `MCP_SECRET`, and a 404 never deletes it (only Forget does): earlier, a reload during the redeploy wiped it and owners had to rotate. After the redeploy the link is checked by itself and the chat-app install buttons turn on; they stay off until the link works.
- While storage or `MCP_SECRET` is missing, the overview offers two buttons instead of "Go to the next step": **Set up with your agent** opens a panel (`components/setup/agent-panel.tsx`) with three moves (copy the prompt, paste it into Claude with the Vercel connector, reload) beside a code-drawn chat that plays the agent's tool calls (decoration only, secret masked; final state under reduced motion). **Set up manually** links to the next step and unfolds the guide, which waits folded until then (`guide-fold.tsx`; any link to a step unfolds it; open without JavaScript). The prompt (`lib/agent-prompt.ts`) creates a private Blob store if there is none, sets `MCP_SECRET` readable (`encrypted`, not `sensitive`) unless it is already set (never a silent rotation), and redeploys once. It holds the secret; the page sends nothing. The panel and the secret step share one draft secret (`draftSecret()` in `setup-store.ts`).
- The secret step keeps the same prompt. For a working link there is **Open on your phone**: a QR code drawn in the browser with `uqr` of `/#pair=<secret>`. The page saves that secret and removes it from the address bar at once; the caption says it stays in the phone's history, so scan it only with your own phone.
- Never render the secret or the full connector URL by default. The owner pastes the secret into a field; the URL is built in the browser, "Test connection" calls the MCP endpoint's tools list, and the secret may be remembered in that browser (localStorage) with a way to forget it.
- Usage stats, unlocked with the secret via `POST /api/stats` (constant-time check, 404 when wrong): team credits, and this connector's spend per day, per model and per chat app from AI Gateway's spend report filtered by the tags every call carries. No database. The report is paid-plan only: on Hobby the page and `check_credits` say so (`PAID_PLAN_NOTE`) and still show credits.
- How-to for Claude, ChatGPT and other MCP apps; set a Gateway budget; rotate the secret.

## Security

Threat: a leaked connector URL lets anyone spend the owner's Gateway credits and generate content under their Vercel account. Defaults:

- `MCP_SECRET` must be at least 32 characters and not easy to guess (at least 8 different characters, not one short block repeated). If missing, shorter or weak, the MCP endpoint refuses to run and the setup page shows the error.
- Wrong secret returns 404, identical to any unknown route. Constant-time comparison.
- Never log the secret, full request URLs or auth headers.
- Rotation: change `MCP_SECRET` and redeploy; the old URL dies. Document this in the README and on the setup page.
- Per-call caps via env with safe defaults: `MAX_VIDEO_SECONDS` (default 8), `MAX_IMAGES_PER_CALL` (default 4), `MAX_SPEECH_CHARACTERS` (default 5000), optional `ALLOWED_MODELS` allowlist (comma separated; empty means all).
- The real spend cap is the AI Gateway budget, which Vercel enforces. The setup page and README must tell owners to set one.
- Blob store is private; uploads use unguessable paths. Say plainly that anyone holding a returned link can view that file until the link expires.
- v1 relies on a secret in the URL because claude.ai connectors cannot send headers. OAuth replaces this in v2.

## Tools

1. `list_models({ type?: "text" | "image" | "video" | "speech" | "transcription", query?: string })`
   - Read from `https://ai-gateway.vercel.sh/v1/models`. Return id, type, capability tags (e.g. t2v, i2v) and price fields. Keep output compact.
2. `generate_text({ model, prompt, system?, max_tokens?, file_urls? })`
   - Return the text plus cost from `providerMetadata.gateway.cost` when present.
   - `file_urls`: up to 10 https links (20 MB in total) to images, video, audio or PDFs, downloaded by the server and sent as file parts. Refuse a file kind the model's catalog `modalities.input` does not list, before any charge.
3. `generate_image({ model, prompt, size_or_aspect?, n? })`
   - Return images as MCP image content (base64) so they show in chat without storage.
   - If Blob is configured, also upload and return the URL.
   - FLUX 3 ignores `size`: a WxH goes as its aspect ratio plus `providerOptions.blackForestLabs.resolution` (the nearest class). AI SDK warnings are shown in the reply.
   - Size-only models (`openai/gpt-image*`, `recraft/*`) ignore `aspectRatio`: a ratio, or a WxH they don't list, goes as their nearest listed size (`fixedSizes` in `lib/tools/generate-image.ts`, from the AI SDK OpenAI provider and Recraft's API reference), with a note.
4. `start_video({ model, prompt, image_url?, duration?, aspect_ratio? })`
   - Video can take minutes, longer than a tool call or function should wait. Use AI Gateway's asynchronous video generation (start, then poll status). Return a `job_id` immediately.
5. `get_video({ job_id })`
   - Return status. When done, upload the video to Blob and return the URL, plus the billed cost from `gateway.getGenerationInfo({ id: generationId })` (async video metadata carries no cost); leave the cost out if the lookup fails.
   - If Blob is not configured, return a clear error telling the user to connect a Blob store.

6. `edit_image({ model, prompt, image_urls, mask_url?, size_or_aspect?, n? })` and `upscale_image({ image_url, model?, prompt? })`
   - Image models take the inputs as `generateImage({ prompt: { images, text, mask } })`; image-capable LLMs as image parts of one message.
   - Input files (images, audio) are downloaded by the server (https only, size-capped) and passed as bytes, so this server's own private Blob links work as input.
7. `generate_speech({ model, text, voice?, instructions?, speed?, language?, format? })` and `transcribe({ model, audio_url, timestamps? })`
   - `generateSpeech` / `transcribe` with the gateway's speech and transcription models. Speech returns MCP audio content plus a Blob link.
8. Video from existing media, each returning a `job_id` for `get_video` (shapes from Vercel's video docs and model pages):
   - `start_video` also takes `end_image_url` (`frameImages` first/last frame), `reference_urls` (`inputReferences`; videos as `{ data, mediaType }`) and `sound` (`generateAudio`).
   - `motion_control`: Kling motion-control, `prompt: { image, text }` + `providerOptions.klingai: { videoUrl, characterOrientation, mode, keepOriginalSound }`. Orientation "video" (up to 30 s) only when `MAX_VIDEO_SECONDS` ≥ 30.
   - `upscale_video`: `topaz/proteus`, the video as an `inputReferences` entry plus a required `resolution`.
   - `edit_video` / `extend_video`: Grok Imagine Video with `providerOptions.spacexai.videoUrl` (and `mode: 'extend-video'`).
   - Async starts are capped at 300 KiB, so inputs go by hosted https URL, never inline bytes. Output length of motion control, upscale and edit follows the input, which `MAX_VIDEO_SECONDS` cannot see; the Gateway budget is the cap.
9. `check_credits()` and `list_files({ kind?, limit? })`
   - Team credits and this connector's 30-day spend; the files in Blob, newest first, with fresh links.
10. `estimate_only` on the image and video tools
   - Returns the price from the AI Gateway catalog (`lib/pricing.ts`) instead of running; nothing is called or charged, and no Blob store or input download is needed. Often a range (resolution, audio and mode are left to model defaults). Token-priced models get no estimate.
   - Every tool that starts a paid video job tells the chat app not to retry on its own after a timeout.
11. MCP Apps inline viewer (`@modelcontextprotocol/ext-apps`)
   - `generate_image`, `edit_image`, `upscale_image`, `get_video` and `list_files` register with `registerAppTool` and `_meta.ui.resourceUri = ui://gateway-mcp/media.html`. Their results add `structuredContent` (`MediaView`, `lib/ui/media-types.ts`); `content` stays unchanged for hosts without MCP Apps.
   - The view (`ui/media-view.ts` + `ui/media-view.html`) is bundled by `scripts/build-ui.mjs` (esbuild, zod English locale only) into the gitignored `lib/ui/media-view.generated.ts` before `dev`, `build` and `typecheck`.
   - Resource `_meta.ui`: CSP `resourceDomains: https://*.blob.vercel-storage.com`, `prefersBorder: false`, and for Claude only `domain` = first 32 hex of sha256(connector URL) + `.claudemcpcontent.com` (the URL holds the secret: hashed, never logged).
   - Upscale and Extend in the view send a chat message (`app.sendMessage`) instead of calling tools, so spending stays with the model and the owner. No `vh` units in the view: the host sizes the frame to its content.

Not offered, by design: 3D (no 3D models on AI Gateway), joining audio into video (needs ffmpeg), a talking-avatar tool (HeyGen Video on the Gateway is a general video model; put the dialogue in a `start_video` prompt), and app-level studios (ads, shorts, influencers, publishing). The chat app composes those from the tools above.

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
- Billing vs the catalog (real calls, Oct 15–16 2026): AI Gateway bills the provider's "market cost" with `surcharge_cost: 0`, but the catalog is not always that price. `bfl/flux-3-image` 1024x1024: catalog $0.024, billed $0.048 (BFL's own price). `google/veo-3.1-fast-generate-001` 4 s 720p with sound: billed $0.60 = catalog $0.15/s, though Vertex and the Gemini API list $0.10/s. `spacexai/grok-imagine-video` 2 s 720p: billed $0.14 = catalog $0.07/s; xAI's docs list $0.05/s. So provider pages are not a better source than the catalog.
- `GET /v1/models/{id}/endpoints` (no auth) names the provider route Gateway uses (Veo goes through `vertex`). `gateway.getGenerationInfo({ id })` returns a generation's billed cost; it worked locally with the OIDC token.
- AI Gateway's spend report (`GET /v1/report`, `getSpendReport`) answers 403 `Spend report access requires a paid plan` on Hobby, for both OIDC and API keys; credits work. A self-kept usage log in Blob is allowed by the AUP but unsafe on Hobby (2,000 Blob advanced operations a month, shared with media uploads; going over blocks Blob for 30 days), so there is none.
- FLUX.2 (pro, max, flex, klein), `prodia/flux-fast-schnell` and `bfl/flux-3-video` have no price in the catalog (`input`/`output` "0"): `list_models` says "price not listed by AI Gateway". The FLUX 3 Image catalog price was corrected to $0.048 by Oct 16 2026.
- Only BFL publishes prices as JSON-LD; Google, OpenAI, xAI, MiniMax, Alibaba, Recraft and Topaz have markdown docs; Kling and BytePlus render prices with JavaScript.

Still unverified (check on a real deployment):
- Whether `topaz/wonder-3.5` (upscale_image) and each edit model accept input images through `generateImage`, and which speech models honour `voice`/`instructions`. Speech and transcription were checked against the Gateway (tts-1 → whisper-1 round trip).
- Whether an agent's `create_storage_stores_blob` with `projectId` connects the store like the Deploy button does (same env vars), and whether `encrypted` env vars show as **Config** in the dashboard.
- Whether video providers can fetch this server's presigned Blob links (needed by every video tool that takes a file).
- Exact Gateway error shape for "out of credits" and "video not on plan" (matched by status/message today).
- Whether the deployment's OIDC token may call the spend report on a paid plan and the generation lookup (`getGenerationInfo`) on Vercel (the lookup works locally), and whether image and video calls honour request `tags` like text calls do.
- MCP Apps in real hosts: the inline viewer was tested with ext-apps' `AppBridge` in a browser (desktop and 375px), not yet in Claude (web, desktop, mobile) or ChatGPT, and the Blob CSP and Claude `domain` are untested there.
- Which User-Agent each chat app sends (used to name the app in usage; unknown apps count as "other").

## Deploy experience (README)

- Deploy button that clones the repo without asking for `MCP_SECRET`: the fresh copy starts with its endpoint off, and the setup page makes the secret in the browser (remembered there), links to the project's Environment Variables, and asks for one redeploy. Secrets never travel in URLs (Vercel's `envDefaults` and URL fragments end up in browser history).
- The Deploy button creates and connects a private Blob store itself (`stores=[{"type":"blob","access":"private"}]`).
- Steps: deploy → open `https://<app>.vercel.app` → make `MCP_SECRET`, add it in Vercel, redeploy → test the link (already filled in) → add it to Claude or ChatGPT (one-click install link for Claude).
- Warnings: anyone with the URL can spend your credits, so keep it private. Set an AI Gateway budget. Video needs enough paid Gateway credits (whether the free monthly credit covers video is unverified, so the README does not claim it).
- License: MIT.

## Definition of done (v1)

- Works locally with the MCP Inspector against `AI_GATEWAY_API_KEY`.
- Deployed to Vercel and works with OIDC only (no API key set).
- Added to claude.ai as a custom connector: list models, generate text, generate image, start and fetch a video all work.
- Wrong secret returns 404; a short or missing secret disables the endpoint.
- Setup page shows correct status checks and never exposes the secret.
- README is complete and the Deploy button works from a clean account.
- Setup page at `/` works, including reduced motion and without WebGL; the landing site (separate repo) works the same way.

## v2 notes (do not build yet)

- Sign in with Vercel (OAuth 2.0 + PKCE), scopes `openid` + `offline_access`, team permissions "AI Gateway: Use" and "Blob: Read and Write".
- The server becomes an MCP OAuth authorization server so claude.ai can connect with OAuth instead of a secret URL.
- Store refresh tokens encrypted at rest. Let users disconnect and delete their data.
- Unverified: whether the Gateway accepts the OAuth access token directly, whether the app can create a Blob store for the user, and whether per-app spend limits exist.

## Working rules

- Build v1 only. Ask before adding dependencies beyond Next.js, the AI SDK, the MCP handler, MCP Apps (`@modelcontextprotocol/ext-apps`), Vercel Blob, zod, esbuild (dev, for the viewer) and `uqr` (the phone QR code).
- Ask before changing scope or architecture.
- Keep it small. This is meant to ship in half a day.
