import type { CallToolResult } from '@modelcontextprotocol/server';
import { generateImage, generateText, type GeneratedFile } from 'ai';
import { z } from 'zod';
import { getConfig, isModelAllowed } from '../env';
import { errorResult, toolError, warningNote, type ToolContext } from '../gateway';
import { fetchMedia, MediaError, readCost, type Media } from '../media';
import { findModel, kindsOf } from '../models';
import { estimateImage, estimateResult } from '../pricing';
import { imageSizeOptions } from './generate-image';
import { estimateOnly } from './start-video';
import { imageResult } from './image-result';

type EditArgs = { model: string; prompt: string; images: Media[]; mask?: Media; size_or_aspect?: string; n: number; tool: string; estimate?: boolean };

/**
 * Sends input images and an instruction to an image model, or to an
 * image-capable LLM (Nano Banana etc.) as image parts of one message. With
 * `estimate`, nothing runs and the inputs are not needed: the reply is the list price.
 */
async function editImages({ model, prompt, images, mask, size_or_aspect, n, tool, estimate }: EditArgs, ctx: ToolContext): Promise<CallToolResult> {
  const sizeOptions = imageSizeOptions(model, size_or_aspect);
  if ('invalid' in sizeOptions) return errorResult(`size_or_aspect must look like "16:9" or "1024x1024", got "${size_or_aspect}".`);

  const info = await findModel(model);
  if (!info) return errorResult(`Unknown model "${model}". Call list_models with type "image" to see image models.`);
  if (!kindsOf(info).includes('image')) return errorResult(`Model "${model}" does not make images. Call list_models with type "image".`);
  if (estimate) return estimateResult(model, estimateImage(info, info.type === 'image' ? n : 1, sizeOptions.priceSize));

  let output: GeneratedFile[];
  let cost: unknown;
  const notes: string[] = [];
  if (info.type === 'image') {
    const { providerOptions, notes: sizeNotes, priceSize: _priceSize, ...size } = sizeOptions;
    const result = await generateImage({
      model: ctx.gateway.imageModel(model),
      prompt: { images: images.map((image) => image.bytes), text: prompt, ...(mask ? { mask: mask.bytes } : {}) },
      n,
      ...size,
      providerOptions: { ...providerOptions, ...ctx.gatewayOptions(tool) },
    });
    output = result.images;
    cost = readCost(result.providerMetadata);
    notes.push(...sizeNotes, ...result.warnings.map(warningNote));
  } else {
    if (n > 1) notes.push(`"${model}" is a multimodal LLM, so n is ignored; ask in the prompt for more images.`);
    if (mask) notes.push(`"${model}" does not take a mask, so it was ignored; describe the area in the prompt instead.`);
    const result = await generateText({
      model: ctx.gateway.languageModel(model),
      messages: [
        {
          role: 'user',
          content: [
            ...images.map((image) => ({ type: 'image' as const, image: image.bytes, mediaType: image.mediaType })),
            { type: 'text' as const, text: size_or_aspect ? `${prompt}\n\nAspect ratio / size: ${size_or_aspect}` : prompt },
          ],
        },
      ],
      providerOptions: ctx.gatewayOptions(tool),
    });
    output = result.files.filter((file) => file.mediaType.startsWith('image/'));
    cost = readCost(result.providerMetadata);
    if (result.text) notes.push(`Model said: ${result.text.slice(0, 500)}`);
    notes.push(...(result.warnings ?? []).map(warningNote));
  }
  if (output.length === 0) return errorResult(`"${model}" returned no images. Try rephrasing the instruction or another model.`);
  return imageResult(model, output, cost, notes);
}

function inputError(error: unknown, model: string): CallToolResult {
  return error instanceof MediaError ? errorResult(error.message) : toolError(error, model, 'image');
}

const MAX_INPUT_IMAGES = 4;

export const editImageTool = {
  name: 'edit_image',
  description:
    'Change existing images with an instruction: remove or replace the background, add or remove things, restyle, extend the canvas (outpaint), change the framing, or combine several images. Give https links to the images (links returned by this server work). Good models: "bfl/flux-kontext-pro", "openai/gpt-image-2", "google/gemini-3-pro-image". Pass mask_url (white = area to change) for precise edits with models that take one, e.g. "bfl/flux-pro-1.0-fill".',
  inputSchema: z.object({
    model: z.string().describe('Image model id from list_models with type "image"'),
    prompt: z.string().min(1).describe('What to change, e.g. "remove the background, keep the product"'),
    image_urls: z.array(z.string().url()).min(1).max(MAX_INPUT_IMAGES).describe('https links to 1–4 input images'),
    mask_url: z.string().url().optional().describe('https link to a mask image (white = change, black = keep)'),
    size_or_aspect: z.string().optional().describe('Aspect ratio like "16:9" or size like "1024x1024". Support varies by model.'),
    n: z.number().int().positive().optional().describe('Number of results (image-only models). Default 1.'),
    estimate_only: estimateOnly,
  }),
  async run(
    {
      model,
      prompt,
      image_urls,
      mask_url,
      size_or_aspect,
      n = 1,
      estimate_only,
    }: { model: string; prompt: string; image_urls: string[]; mask_url?: string; size_or_aspect?: string; n?: number; estimate_only?: boolean },
    ctx: ToolContext,
  ) {
    if (!isModelAllowed(model)) return errorResult(`Model "${model}" is not in this server's ALLOWED_MODELS list.`);
    const { maxImagesPerCall } = getConfig();
    if (n > maxImagesPerCall) return errorResult(`n=${n} is above this server's limit of ${maxImagesPerCall} images per call (MAX_IMAGES_PER_CALL).`);
    try {
      if (estimate_only) return await editImages({ model, prompt, images: [], size_or_aspect, n, tool: 'edit_image', estimate: true }, ctx);
      const images = await Promise.all(image_urls.map((url) => fetchMedia(url, 'image')));
      const mask = mask_url ? await fetchMedia(mask_url, 'image') : undefined;
      return await editImages({ model, prompt, images, mask, size_or_aspect, n, tool: 'edit_image' }, ctx);
    } catch (error) {
      return inputError(error, model);
    }
  },
};

const UPSCALE_MODEL = 'topaz/wonder-3.5';

export const upscaleImageTool = {
  name: 'upscale_image',
  description: `Make an image sharper and larger without changing what is in it. Uses "${UPSCALE_MODEL}" (Topaz) unless you name another model. Give an https link to the image (links returned by this server work).`,
  inputSchema: z.object({
    image_url: z.string().url().describe('https link to the image to upscale'),
    model: z.string().optional().describe(`Image model id. Default "${UPSCALE_MODEL}".`),
    prompt: z.string().optional().describe('Optional guidance, e.g. "restore the faces" or "keep the film grain"'),
    estimate_only: estimateOnly,
  }),
  async run(
    { image_url, model = UPSCALE_MODEL, prompt, estimate_only }: { image_url: string; model?: string; prompt?: string; estimate_only?: boolean },
    ctx: ToolContext,
  ) {
    if (!isModelAllowed(model)) return errorResult(`Model "${model}" is not in this server's ALLOWED_MODELS list.`);
    try {
      const instruction = prompt ?? 'Upscale this image to a higher resolution. Keep every detail and add nothing new.';
      if (estimate_only) return await editImages({ model, prompt: instruction, images: [], n: 1, tool: 'upscale_image', estimate: true }, ctx);
      const image = await fetchMedia(image_url, 'image');
      return await editImages({ model, prompt: instruction, images: [image], n: 1, tool: 'upscale_image' }, ctx);
    } catch (error) {
      return inputError(error, model);
    }
  },
};
