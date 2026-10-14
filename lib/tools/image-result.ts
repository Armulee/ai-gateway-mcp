import type { CallToolResult } from '@modelcontextprotocol/server';
import type { GeneratedFile } from 'ai';
import { storeAndLink } from '../media';

/**
 * Images shown inline in the chat, plus private expiring links when Blob is
 * connected. Shared by generate_image, edit_image and upscale_image.
 */
export async function imageResult(model: string, images: GeneratedFile[], cost: unknown, notes: string[]): Promise<CallToolResult> {
  const stored = await storeAndLink(
    'images',
    images.map((image) => ({ bytes: image.uint8Array, mediaType: image.mediaType })),
    'Image',
  );
  const summary = [
    `${images.length} image(s) from ${model}${cost != null ? `, cost: $${cost}` : ''}.`,
    ...stored.links,
    ...stored.notes,
    ...notes,
  ].join('\n');
  return {
    content: [
      ...images.map((image) => ({ type: 'image' as const, data: image.base64, mimeType: image.mediaType })),
      { type: 'text' as const, text: summary },
    ],
  };
}
