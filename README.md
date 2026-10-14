<p align="center">
  <img src="docs/readme/banner.svg" width="100%" alt="AI Gateway MCP: every Vercel AI Gateway model in Claude, ChatGPT and any MCP app. Your own credits, no markup.">
</p>

<p align="center">
  <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Farmulee%2Fai-gateway-mcp&project-name=gateway-mcp&repository-name=gateway-mcp&env=MCP_SECRET&envDescription=A%20long%20random%20secret%20%28at%20least%2032%20characters%29.%20It%20becomes%20part%20of%20your%20connector%20URL%2C%20so%20keep%20it%20private.%20Generate%20one%20with%3A%20openssl%20rand%20-hex%2032&envLink=https%3A%2F%2Fgithub.com%2Farmulee%2Fai-gateway-mcp%23mcp_secret&stores=%5B%7B%22type%22%3A%22blob%22%2C%22access%22%3A%22private%22%7D%5D"><img src="https://vercel.com/button" alt="Deploy with Vercel" height="32"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-ededed?style=flat-square&labelColor=000" alt="MIT license">
  <img src="https://img.shields.io/badge/MCP-Streamable_HTTP-ededed?style=flat-square&labelColor=000" alt="MCP over Streamable HTTP">
  <img src="https://img.shields.io/badge/Next.js-16-ededed?style=flat-square&labelColor=000&logo=nextdotjs&logoColor=fff" alt="Next.js 16">
  <img src="https://img.shields.io/badge/AI_SDK-Vercel_AI_Gateway-ededed?style=flat-square&labelColor=000&logo=vercel&logoColor=fff" alt="AI SDK with Vercel AI Gateway">
</p>

<p align="center">
  <a href="#what-you-can-do">What you can do</a> ·
  <a href="#get-started-in-3-steps">Get started</a> ·
  <a href="#what-it-costs">What it costs</a> ·
  <a href="#tools">Tools</a> ·
  <a href="#keep-it-safe">Keep it safe</a> ·
  <a href="#reference">Reference</a>
</p>

<br>

**AI Gateway MCP lets you use any model on [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) (text, images and video) right inside Claude, ChatGPT and other chat apps.** You run your own copy on your Vercel account, so every call is billed to your own AI Gateway credits at the provider's price. No subscription, no API key, and nobody else holds your money.

> **What is MCP?** The Model Context Protocol is how chat apps like Claude and ChatGPT plug in outside tools. This project is one of those tools: once you add its link, your chat app can call any AI Gateway model for you.

<p align="center">
  <img src="docs/readme/how-it-works.svg" width="100%" alt="How it works: you ask in Claude, ChatGPT or any MCP app; your own copy on Vercel checks the secret and calls AI Gateway with its OIDC token, billed to your credits; any text, image or video model answers.">
</p>

## What you can do

Ask in plain words. Your chat app picks the tool and the model, or you name one.

<table>
  <tr>
    <th width="33%">Text</th>
    <th width="33%">Image</th>
    <th width="33%">Video</th>
  </tr>
  <tr>
    <td valign="top"><i>"Ask GPT-5 mini and Gemini 3 Flash the same question and compare their answers."</i></td>
    <td valign="top"><i>"Make a poster of a lighthouse at night with Flux, 3:4."</i></td>
    <td valign="top"><i>"Make a 5-second video of waves at sunset with Veo."</i></td>
  </tr>
  <tr>
    <td valign="top">The answer, plus what it cost.</td>
    <td valign="top">The image inline, plus a download link.</td>
    <td valign="top">A link to the video when it is ready.</td>
  </tr>
  <!-- Chat screenshots go here, one per column:
  <tr>
    <td><img src="docs/readme/chat-text.png" alt="Claude comparing two models' answers through AI Gateway MCP"></td>
    <td><img src="docs/readme/chat-image.png" alt="Claude returning an image made with Flux through AI Gateway MCP"></td>
    <td><img src="docs/readme/chat-video.png" alt="Claude returning a video made with Veo through AI Gateway MCP"></td>
  </tr>
  -->
</table>

## Get started in 3 steps

You need a [Vercel](https://vercel.com) account and a GitHub, GitLab or Bitbucket account.

1. **Deploy.** Click the button below. Vercel copies this repo to your account, asks for a [`MCP_SECRET`](#mcp_secret) and sets up file storage for you.

   <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Farmulee%2Fai-gateway-mcp&project-name=gateway-mcp&repository-name=gateway-mcp&env=MCP_SECRET&envDescription=A%20long%20random%20secret%20%28at%20least%2032%20characters%29.%20It%20becomes%20part%20of%20your%20connector%20URL%2C%20so%20keep%20it%20private.%20Generate%20one%20with%3A%20openssl%20rand%20-hex%2032&envLink=https%3A%2F%2Fgithub.com%2Farmulee%2Fai-gateway-mcp%23mcp_secret&stores=%5B%7B%22type%22%3A%22blob%22%2C%22access%22%3A%22private%22%7D%5D"><img src="https://vercel.com/button" alt="Deploy with Vercel" height="32"></a>

2. **Open your copy** at `https://<your-project>.vercel.app`. Its home page walks you through the rest: it checks your setup, builds your link and tests it.
3. **Add the link to your chat app.** In Claude: Settings → Connectors → Add custom connector, paste the link, leave authentication empty. ChatGPT and other apps take it as a custom MCP server (Streamable HTTP).

Then set a **spend budget** in the Vercel dashboard (AI Gateway → budgets). It is the real limit on what your link can spend.

### The setup page

Every copy's home page is a guide to its own setup. It checks your copy live, ticks off what is done and keeps only the step you are on open.

<p align="center">
  <img src="docs/readme/intro.webp" width="100%" alt="The setup page loading: a ring of six steps draws itself in around the count of steps done.">
</p>

<p align="center">
  <img src="docs/readme/flow.webp" width="100%" alt="Going through the guide: making a new secret, pasting the secret to build the link, testing it, then picking a chat app.">
</p>

<table>
  <tr>
    <td width="50%" valign="top">
      <img src="docs/readme/guide.png" alt="The guide in focus mode: done steps fold to one line, the next step is open.">
      <p><b>One step at a time.</b> Done steps fold to a line; the next one opens with what to do.</p>
    </td>
    <td width="50%" valign="top">
      <img src="docs/readme/secret.png" alt="Making a new MCP_SECRET: the secret decodes in a block with a copy button, then links to add it in Vercel and redeploy.">
      <p><b>A secret in one click.</b> Made in your browser, never sent anywhere, with links straight to your project's environment variables.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src="docs/readme/connect.png" alt="The link field: the deployment's /mcp/ address completed by the secret, and a passing connection test listing five tools.">
      <p><b>Your link, tested.</b> Paste the secret to build the URL, then test it against your own deployment.</p>
    </td>
    <td width="50%" valign="top">
      <img src="docs/readme/chat.png" alt="Adding the link to a chat app, with tabs for Claude, ChatGPT and other apps.">
      <p><b>Into your chat app.</b> Steps for Claude, ChatGPT and any other MCP app, and a test prompt to try it.</p>
    </td>
  </tr>
</table>

## What it costs

There is no plan and no fee from this project. You pay each provider's list price through your own AI Gateway credits, and every Vercel team gets free monthly credits for a set of models. In Vercel's words ([AI Gateway pricing](https://vercel.com/docs/ai-gateway/pricing)):

> AI Gateway charges no markup and no platform fee on tokens. You pay the provider's list price on a pay-as-you-go basis.

Some list prices from the catalog (October 2026; ask `list_models` for today's):

| You ask for | Model | Price |
| --- | --- | --- |
| A 500-word answer | `openai/gpt-5-mini` | about $0.002 |
| A 500-word answer | `anthropic/claude-sonnet-4.5` | about $0.01 |
| An image | `recraft/recraft-v4.1-flash` | $0.007 |
| An image | `bfl/flux-pro-1.1` | $0.04 |
| A 5-second 720p video | `bytedance/seedance-v1.0-pro-fast` | about $0.10 |
| A 5-second 720p video | `google/veo-3.1-fast-generate-001` | $0.50 to $0.75 |

This project is free and MIT licensed, and not made by or affiliated with Vercel. Version 1 means you run your own copy, so setup is as short as I could make it: the goal is for everyone to use AI at the price providers actually set.

## Tools

| Tool | What it does |
| --- | --- |
| `list_models({ type?, query? })` | Lists the models in the AI Gateway catalog with their type, capabilities (`t2v`, `i2v`, …) and price. |
| `generate_text({ model, prompt, system?, max_tokens? })` | Generates text. Returns the text plus its cost when AI Gateway reports one. |
| `generate_image({ model, prompt, size_or_aspect?, n? })` | Works with image models (`bfl/flux-2-pro`, `openai/gpt-image-2`, …) and with image-capable LLMs (`google/gemini-3-pro-image`). Images come back inline. They are also saved to Blob and returned as expiring links. |
| `start_video({ model, prompt, image_url?, duration?, aspect_ratio? })` | Starts an asynchronous AI Gateway video job and returns a `job_id` right away. |
| `get_video({ job_id })` | Reports whether the job is still generating. When it finishes, the video is copied into your Blob store and you get an expiring link. Call it again later for a fresh link. |

Errors are written to be readable and always name the model. They cover unknown models, missing credits, video not being available to your team, authentication failures and provider errors.

## Keep it safe

- **Your link works like a password that spends money.** Anyone who has it can use your AI Gateway credits. Keep it private.
- **Set an AI Gateway budget.** Only Vercel's budget limits your total spend.
- **If the link leaks, change `MCP_SECRET`** in Project Settings → Environment Variables and redeploy. The old link stops working at once.

<details>
<summary><b>More on security and costs</b></summary>

<br>

- **Your connector URL works like a password that spends money.** Anyone who has it can use your AI Gateway credits and generate content under your Vercel account. Keep it private.
- **Set an AI Gateway budget.** This server caps each call (`MAX_VIDEO_SECONDS`, `MAX_IMAGES_PER_CALL`, `ALLOWED_MODELS`), but only Vercel's budget limits your total spend.
- **Rotate the secret if the URL leaks.** Change `MCP_SECRET` in Project Settings → Environment Variables and redeploy. The old URL stops working right away, and any unfinished video jobs are abandoned.
- **Files are private, but links are not.** Images and videos are stored in a private Blob store. Anyone who holds one of the links returned in chat can open that file until the link expires (`SIGNED_URL_TTL_HOURS`).
- **Logs:** this app never logs the secret or request URLs. However, Vercel's own request logs record request paths, so members of your Vercel team can see the secret there.
- **Video costs more.** Video generation needs enough paid AI Gateway credits for the model you choose. Check prices with `list_models`.
- Generated media is stored exactly as the provider returns it. Watermarks and metadata are never removed.

</details>

## Reference

### MCP_SECRET

Your connector link is your deployment's address plus the secret. The setup page builds it in your browser:

```
https://<your-project>.vercel.app/mcp/<MCP_SECRET>
```

`MCP_SECRET` is a random value of at least 32 characters, for example the output of `openssl rand -hex 32`. Use URL-safe characters only; hex is ideal. The setup page can also generate one for you.

claude.ai custom connectors only support OAuth or no auth, and they can't send custom headers, so the secret goes in the URL path. If `MCP_SECRET` is missing or shorter than 32 characters, the MCP endpoint is disabled. A wrong secret gets the same 404 page as any unknown URL.

<details>
<summary><b>Configuration</b></summary>

<br>

| Variable | Default | Purpose |
| --- | --- | --- |
| `MCP_SECRET` | none (required) | Secret part of the connector URL. Must be at least 32 characters. |
| `MAX_VIDEO_SECONDS` | `8` | Longest video `start_video` accepts. |
| `MAX_IMAGES_PER_CALL` | `4` | Highest `n` that `generate_image` accepts. |
| `ALLOWED_MODELS` | empty (all models) | Comma-separated allowlist of model ids. |
| `SIGNED_URL_TTL_HOURS` | `24` | How long file links stay valid. The maximum is 168 (7 days). |
| `AI_GATEWAY_API_KEY` | unset | Optional. Use it for local development. When set, it replaces the OIDC token. |

Vercel sets the Blob variables (`BLOB_STORE_ID`, plus `BLOB_READ_WRITE_TOKEN` as a fallback) and `VERCEL_OIDC_TOKEN` automatically when the store is connected. If your project has no Blob store (for example, you imported the repo yourself), text and images still work; for video and image links, create a private Blob store under the project's Storage tab, connect it and redeploy. The setup page links there.

</details>

<details>
<summary><b>Local development</b></summary>

<br>

```bash
npm install
vercel link && vercel env pull   # pulls MCP_SECRET, Blob and a 12-hour OIDC token into .env.local
# or put AI_GATEWAY_API_KEY=... and MCP_SECRET=... in .env.local
npm run dev
```

Test the server with the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector@latest
```

Choose **Streamable HTTP** and connect to `http://localhost:3000/mcp/<MCP_SECRET>`.

</details>

<details>
<summary><b>How it works inside</b></summary>

<br>

- **Setup page:** `/` is a guide for your deployment: live checks, one step open at a time, how to add the link to each chat app, and your usage. Black and white, drawn in code, with motion that rests finished under reduced motion. Dashboard links go straight to your project, using the team and project names in the deployment's OIDC token. `/setup` redirects there.
- **Usage stats:** every call from this server carries AI Gateway tags (`ai-gateway-mcp`, `tool:<name>`, `client:<app>`, the app guessed from its User-Agent). The setup page reads AI Gateway's own spend report filtered by those tags, so there is no database. You unlock it with your secret, which is sent only to this deployment (`POST /api/stats`) and can be remembered in your browser. Credits shown are your whole team's balance.
- **Stack:** Next.js (App Router) and TypeScript. MCP is served over Streamable HTTP using [`mcp-handler`](https://github.com/vercel/mcp-handler) v2, and model calls go through the [AI SDK](https://ai-sdk.dev) with the AI Gateway provider.
- **Secret check:** `proxy.ts` rejects a wrong secret before routing by rewriting it to the standard 404 page. The route handler then checks the secret again, using a constant-time comparison.
- **Video jobs:** jobs don't need a database. Each `job_id` holds the model and the AI Gateway job id, signed with a key derived from `MCP_SECRET` so it can't be forged.

</details>

## License

MIT
