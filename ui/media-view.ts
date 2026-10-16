// The MCP Apps view for pictures, video and audio (bundled into one HTML file
// by scripts/build-ui.mjs and served as ui://gateway-mcp/media.html). It shows
// a tool's result inline in the chat: a grid of images, a video player, or the
// owner's files, with Download, Upscale and Extend. Upscale and Extend ask the
// chat to run the tool, so nothing is spent without the model and the owner.

import { App, applyDocumentTheme, applyHostFonts, applyHostStyleVariables, type McpUiHostContext } from '@modelcontextprotocol/ext-apps';
import type { MediaItem, MediaView } from '../lib/ui/media-types';

type Result = Parameters<NonNullable<App['ontoolresult']>>[0];

const app = new App({ name: 'AI Gateway media', version: '1.0.0' });
const root = document.getElementById('root') as HTMLElement;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> = {}, ...children: (Node | string)[]) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

function button(label: string, onClick: () => void, primary = false) {
  return el('button', { type: 'button', className: primary ? 'btn primary' : 'btn', textContent: label, onclick: onClick });
}

function ask(text: string) {
  void app.sendMessage({ role: 'user', content: [{ type: 'text', text }] });
}

function open(url: string) {
  void app.openLink({ url });
}

/** Inline images from the result itself (base64), so nothing is fetched twice. */
function imageParts(result: Result): string[] {
  return (result.content ?? []).flatMap((part) => (part.type === 'image' ? [`data:${part.mimeType};base64,${part.data}`] : []));
}

function mediaFor(item: MediaItem, inline: string[]): HTMLElement | null {
  const src = item.imagePart !== undefined ? inline[item.imagePart] : item.url;
  if (!src) return null;
  if (item.kind === 'image') {
    const img = el('img', { src, alt: '', loading: 'lazy', decoding: 'async' });
    img.addEventListener('click', () => img.closest('.card')?.classList.toggle('wide'));
    return img;
  }
  if (item.kind === 'video') return el('video', { src, controls: true, playsInline: true, preload: 'metadata' });
  return el('audio', { src, controls: true, preload: 'metadata' });
}

function card(item: MediaItem, n: number, total: number, inline: string[]): HTMLElement | null {
  const media = mediaFor(item, inline);
  if (!media) return null;
  const actions = el('div', { className: 'actions' });
  const name = total > 1 ? `${item.kind} ${n}` : `this ${item.kind}`;
  if (item.url) {
    const url = item.url;
    actions.append(button('Download', () => open(url), true));
    if (item.kind === 'image') actions.append(button('Upscale', () => ask(`Upscale ${name} with upscale_image: ${url}`)));
    if (item.kind === 'video') actions.append(button('Extend', () => ask(`Extend ${name} with extend_video. Ask me what should happen next. Video: ${url}`)));
  }
  const meta = [item.sizeKb ? `${item.sizeKb} KB` : '', item.uploadedAt ? new Date(item.uploadedAt).toLocaleString() : ''].filter(Boolean).join(' · ');
  return el('figure', { className: `card is-${item.kind}` }, media, ...(meta || actions.childElementCount ? [el('figcaption', {}, meta, actions)] : []));
}

function render(result: Result) {
  const view = result.structuredContent as MediaView | undefined;
  const text = (result.content ?? []).flatMap((part) => (part.type === 'text' ? [part.text] : [])).join('\n');
  root.replaceChildren();
  if (result.isError || !view?.items?.length) {
    // Nothing to show (still generating, an error, or no files): the chat has the text.
    root.append(el('p', { className: 'note', textContent: text.split('\n')[0] || 'Nothing to show yet.' }));
    return;
  }
  const inline = imageParts(result);
  const cards = view.items.flatMap((item, i) => card(item, i + 1, view.items.length, inline) ?? []);
  const head = [view.model, view.cost != null ? `$${view.cost}` : ''].filter(Boolean).join(' · ');
  if (head) root.append(el('p', { className: 'head', textContent: head }));
  root.append(el('div', { className: `grid${cards.length === 1 ? ' single' : ''}` }, ...cards));
  if (view.items.some((item) => item.expiresAt)) {
    root.append(el('p', { className: 'note', textContent: 'Links are private and expire. Ask the chat for list_files to get fresh ones.' }));
  }
}

function applyContext(ctx: McpUiHostContext | undefined) {
  if (!ctx) return;
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
  const inset = ctx.safeAreaInsets;
  if (inset) document.body.style.padding = `${inset.top}px ${inset.right}px ${inset.bottom}px ${inset.left}px`;
}

app.ontoolresult = render;
app.onhostcontextchanged = applyContext;
void app.connect().then(() => applyContext(app.getHostContext()));
