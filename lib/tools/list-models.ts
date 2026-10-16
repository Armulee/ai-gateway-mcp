import { z } from 'zod';
import { isModelAllowed } from '../env';
import { errorResult, textResult, toolError, type ToolContext } from '../gateway';
import { capabilitiesOf, fetchModels, kindsOf, priceOf, type ModelKind } from '../models';

const MAX_RESULTS = 80;

export const listModels = {
  name: 'list_models',
  description:
    'List AI Gateway models this server can call. Filter by type (text, image, video, speech for text-to-speech, transcription for speech-to-text) and/or a search query. Returns one line per model: id | type | capabilities | price.',
  inputSchema: z.object({
    type: z.enum(['text', 'image', 'video', 'speech', 'transcription']).optional().describe('Only models of this type'),
    query: z.string().optional().describe('Case-insensitive match on model id or name, e.g. "veo" or "flux"'),
  }),
  async run({ type, query }: { type?: ModelKind; query?: string }, _ctx: ToolContext) {
    try {
      const needle = query?.toLowerCase();
      const rows = (await fetchModels())
        .map((model) => ({ model, kinds: kindsOf(model) }))
        .filter(({ model, kinds }) =>
          kinds.length > 0 &&
          (!type || kinds.includes(type)) &&
          (!needle || model.id.toLowerCase().includes(needle) || model.name?.toLowerCase().includes(needle)) &&
          isModelAllowed(model.id),
        );
      if (rows.length === 0) return errorResult('No models match. Try a broader query or no filter.');

      const lines = rows.slice(0, MAX_RESULTS).map(({ model, kinds }) => {
        const caps = capabilitiesOf(model).join(',');
        return [model.id, kinds.join('+'), caps || '-', priceOf(model)].join(' | ');
      });
      const more = rows.length > MAX_RESULTS ? `\n…and ${rows.length - MAX_RESULTS} more; narrow with query.` : '';
      return textResult(`${rows.length} model(s). id | type | capabilities | price\n${lines.join('\n')}${more}`);
    } catch (error) {
      return toolError(error, 'model catalog', 'models');
    }
  },
};
