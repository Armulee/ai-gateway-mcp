import type { CallToolResult } from '@modelcontextprotocol/server';
import { generateImage, generateText, type GeneratedFile } from 'ai';
import { z } from 'zod';
import { getConfig, isModelAllowed } from '../env';
import { errorResult, toolError, warningNote, type ToolContext } from '../gateway';
import { readCost } from '../media';
import { findModel, kindsOf } from '../models';
import { estimateImage, estimateResult } from '../pricing';
import { imageResult } from './image-result';

type Args = { model: string; prompt: string; size_or_aspect?: string; n?: number; estimate_only?: boolean };

type SizeOptions =
  | { invalid: true }
  | {
      size?: `${number}x${number}`;
      aspectRatio?: `${number}:${number}`;
      providerOptions: Record<string, Record<string, string>>;
      notes: string[];
      /** The catalog size to price this request at, for estimate_only. */
      priceSize?: string;
    };

const FLUX3_RESOLUTIONS = [
  [768, '768sq'],
  [1024, '1k'],
  [1536, '1.5k'],
  [2048, '2k'],
  [4096, '4k'],
] as const;

// Models that take only an exact pixel size: a ratio is ignored with a warning
// ("aspectRatio is not supported. Use size instead."), so ratios are mapped to
// the nearest size they accept. Sizes from the AI SDK's OpenAI provider and
// Recraft's API reference (1K for V4 and V4.1, 2K for their Pro models).
const RECRAFT_V3 = ['1024x1024', '2048x1024', '1024x2048', '1536x1024', '1024x1536', '1365x1024', '1024x1365', '1280x1024', '1024x1280', '1024x1707', '1434x1024', '1024x1434', '1820x1024', '1024x1820'];
const RECRAFT_1K = ['1024x1024', '1536x768', '768x1536', '1280x832', '832x1280', '1216x896', '896x1216', '1152x896', '896x1152', '832x1344', '1280x896', '896x1280', '1344x768', '768x1344'];
const RECRAFT_2K = ['2048x2048', '3072x1536', '1536x3072', '2560x1664', '1664x2560', '2432x1792', '1792x2432', '2304x1792', '1792x2304', '1664x2688', '2560x1792', '1792x2560', '2688x1536', '1536x2688'];

function fixedSizes(model: string): string[] | undefined {
  if (model.startsWith('openai/gpt-image')) return ['1024x1024', '1536x1024', '1024x1536'];
  if (!model.startsWith('recraft/')) return undefined;
  if (/recraft-v[23]\b/.test(model)) return RECRAFT_V3;
  return model.endsWith('-pro') ? RECRAFT_2K : RECRAFT_1K;
}

/** The listed size closest in shape to w:h, then in area. */
function nearestSize(sizes: string[], w: number, h: number): string {
  const score = (size: string) => {
    const [sw, sh] = size.split('x').map(Number);
    return Math.abs(Math.log(sw / sh / (w / h))) * 10 + Math.abs(Math.log((sw * sh) / (w * h)));
  };
  return sizes.reduce((best, size) => (score(size) < score(best) ? size : best));
}

/**
 * Size options for an image model call from "16:9" or "1024x1024". Size-only
 * models (fixedSizes) get the nearest size they accept. FLUX 3
 * ignores `size` and picks its output from a resolution class
 * (providerOptions.blackForestLabs.resolution), so a WxH goes as its aspect
 * ratio plus the class nearest to its pixel area.
 */
export function imageSizeOptions(model: string, value: string | undefined): SizeOptions {
  const v = value?.trim();
  if (!v) return { providerOptions: {}, notes: [] };
  const ratio = /^(\d+):(\d+)$/.exec(v);
  const match = /^(\d+)x(\d+)$/.exec(v);
  if (!ratio && !match) return { invalid: true };
  const [w, h] = (ratio ?? match)!.slice(1, 3).map(Number);

  const sizes = fixedSizes(model);
  if (sizes && w && h && !sizes.includes(v)) {
    const size = nearestSize(sizes, w, h);
    const why = ratio ? 'takes an exact size, not a ratio' : `takes only ${sizes.length} sizes`;
    return { size: size as `${number}x${number}`, providerOptions: {}, notes: [`"${model}" ${why}: ${v} goes as ${size}.`], priceSize: size };
  }
  if (ratio) return { aspectRatio: v as `${number}:${number}`, providerOptions: {}, notes: [] };
  if (!model.startsWith('bfl/flux-3') || !w || !h) return { size: v as `${number}x${number}`, providerOptions: {}, notes: [], priceSize: v };

  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const aspectRatio = `${w / gcd(w, h)}:${h / gcd(w, h)}` as `${number}:${number}`;
  const side = Math.sqrt(w * h);
  const [px, resolution] = FLUX3_RESOLUTIONS.reduce((best, r) => (Math.abs(Math.log(r[0] / side)) < Math.abs(Math.log(best[0] / side)) ? r : best));
  return {
    aspectRatio,
    providerOptions: { blackForestLabs: { resolution } },
    notes: [`FLUX 3 picks a resolution class, not an exact size: ${v} was sent as aspect ratio ${aspectRatio} at resolution "${resolution}".`],
    // The catalog prices FLUX 3 by square class sizes (768x768 … 4096x4096).
    priceSize: `${px}x${px}`,
  };
}

export const generateImageTool = {
  name: 'generate_image',
  description:
    'Generate images with an AI Gateway image model (e.g. "bfl/flux-2-pro", "openai/gpt-image-2") or an image-capable LLM (e.g. "google/gemini-3-pro-image"). Images are returned inline; if a Blob store is connected, private download links that expire are returned too.',
  inputSchema: z.object({
    model: z.string().describe('Image model id from list_models with type "image"'),
    prompt: z.string().min(1),
    size_or_aspect: z.string().optional().describe('Aspect ratio like "16:9" or size like "1024x1024". Support varies by model.'),
    n: z.number().int().positive().optional().describe('Number of images (image-only models). Default 1.'),
    estimate_only: z.boolean().optional().describe("Only return the estimated price from AI Gateway's list prices. Nothing is generated or charged."),
  }),
  async run({ model, prompt, size_or_aspect, n = 1, estimate_only }: Args, ctx: ToolContext): Promise<CallToolResult> {
    if (!isModelAllowed(model)) return errorResult(`Model "${model}" is not in this server's ALLOWED_MODELS list.`);
    const { maxImagesPerCall } = getConfig();
    if (n > maxImagesPerCall) return errorResult(`n=${n} is above this server's limit of ${maxImagesPerCall} images per call (MAX_IMAGES_PER_CALL).`);
    const sizeOptions = imageSizeOptions(model, size_or_aspect);
    if ('invalid' in sizeOptions) return errorResult(`size_or_aspect must look like "16:9" or "1024x1024", got "${size_or_aspect}".`);

    try {
      const info = await findModel(model);
      if (!info) return errorResult(`Unknown model "${model}". Call list_models with type "image" to see image models.`);
      if (!kindsOf(info).includes('image')) return errorResult(`Model "${model}" does not generate images. Call list_models with type "image".`);
      if (estimate_only) return estimateResult(model, estimateImage(info, info.type === 'image' ? n : 1, sizeOptions.priceSize), sizeOptions.notes);

      let images: GeneratedFile[];
      let cost: unknown;
      const notes: string[] = [];
      if (info.type === 'image') {
        const { providerOptions, notes: sizeNotes, priceSize: _priceSize, ...size } = sizeOptions;
        const result = await generateImage({
          model: ctx.gateway.imageModel(model),
          prompt,
          n,
          ...size,
          providerOptions: { ...providerOptions, ...ctx.gatewayOptions('generate_image') },
        });
        images = result.images;
        cost = readCost(result.providerMetadata);
        notes.push(...sizeNotes, ...result.warnings.map(warningNote));
      } else {
        // Image-capable LLMs (Nano Banana etc.) return images as files from generateText.
        if (n > 1) notes.push(`"${model}" is a multimodal LLM, so n is ignored; ask in the prompt for more images.`);
        const result = await generateText({
          model: ctx.gateway.languageModel(model),
          prompt: size_or_aspect ? `${prompt}\n\nAspect ratio / size: ${size_or_aspect}` : prompt,
          providerOptions: ctx.gatewayOptions('generate_image'),
        });
        images = result.files.filter((file) => file.mediaType.startsWith('image/'));
        cost = readCost(result.providerMetadata);
        if (result.text) notes.push(`Model said: ${result.text.slice(0, 500)}`);
        notes.push(...(result.warnings ?? []).map(warningNote));
      }
      if (images.length === 0) return errorResult(`"${model}" returned no images. Try rephrasing the prompt.`);

      return imageResult(model, images, cost, notes);
    } catch (error) {
      return toolError(error, model, 'image');
    }
  },
};
