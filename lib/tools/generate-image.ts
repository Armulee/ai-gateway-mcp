import type { CallToolResult } from '@modelcontextprotocol/server';
import { generateImage, generateText, type GeneratedFile } from 'ai';
import { z } from 'zod';
import { getConfig, isModelAllowed } from '../env';
import { errorResult, toolError, type ToolContext } from '../gateway';
import { readCost } from '../media';
import { findModel, kindsOf } from '../models';
import { estimateImage, estimateResult } from '../pricing';
import { imageResult } from './image-result';

type Args = { model: string; prompt: string; size_or_aspect?: string; n?: number; estimate_only?: boolean };

export function parseSize(value: string | undefined) {
  if (!value) return {};
  const v = value.trim();
  if (/^\d+:\d+$/.test(v)) return { aspectRatio: v as `${number}:${number}` };
  if (/^\d+x\d+$/.test(v)) return { size: v as `${number}x${number}` };
  return { invalid: true as const };
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
    const size = parseSize(size_or_aspect);
    if ('invalid' in size) return errorResult(`size_or_aspect must look like "16:9" or "1024x1024", got "${size_or_aspect}".`);

    try {
      const info = await findModel(model);
      if (!info) return errorResult(`Unknown model "${model}". Call list_models with type "image" to see image models.`);
      if (!kindsOf(info).includes('image')) return errorResult(`Model "${model}" does not generate images. Call list_models with type "image".`);
      if (estimate_only) return estimateResult(model, estimateImage(info, info.type === 'image' ? n : 1, 'size' in size ? size.size : undefined));

      let images: GeneratedFile[];
      let cost: unknown;
      const notes: string[] = [];
      if (info.type === 'image') {
        const result = await generateImage({
          model: ctx.gateway.imageModel(model),
          prompt,
          n,
          ...size,
          providerOptions: ctx.gatewayOptions('generate_image'),
        });
        images = result.images;
        cost = readCost(result.providerMetadata);
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
      }
      if (images.length === 0) return errorResult(`"${model}" returned no images. Try rephrasing the prompt.`);

      return imageResult(model, images, cost, notes);
    } catch (error) {
      return toolError(error, model, 'image');
    }
  },
};
