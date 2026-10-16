// What the media tools put in `structuredContent` for the MCP Apps view
// (ui/media-view.ts). Hosts don't add it to the model's context; the plain
// `content` (inline images, text with links) stays for every other host.

export type MediaKind = 'image' | 'video' | 'audio';

export type MediaItem = {
  kind: MediaKind;
  /** Private Blob link that expires; absent when no Blob store is connected. */
  url?: string;
  expiresAt?: string;
  /** For images returned inline: which of the result's image parts (0-based) shows this item. */
  imagePart?: number;
  sizeKb?: number;
  uploadedAt?: string;
};

export type MediaView = {
  /** "result": a tool just made these; "files": list_files. */
  source: 'result' | 'files';
  model?: string;
  cost?: number;
  items: MediaItem[];
};

/** The one view every media tool renders with. */
export const MEDIA_VIEW_URI = 'ui://gateway-mcp/media.html';
