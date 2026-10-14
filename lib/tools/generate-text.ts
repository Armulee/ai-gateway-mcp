import { generateText } from 'ai';
import { z } from 'zod';
import { isModelAllowed } from '../env';
import { errorResult, textResult, toolError, type ToolContext } from '../gateway';
import { findModel, kindsOf } from '../models';

export const generateTextTool = {
  name: 'generate_text',
  description:
    'Generate text with any AI Gateway language model (e.g. "openai/gpt-5.5", "anthropic/claude-sonnet-5"). Billed to this deployment owner\'s AI Gateway credits.',
  inputSchema: z.object({
    model: z.string().describe('Model id from list_models, e.g. "google/gemini-3-flash"'),
    prompt: z.string().min(1),
    system: z.string().optional().describe('Optional system instructions'),
    max_tokens: z.number().int().positive().max(128000).optional(),
  }),
  async run(
    { model, prompt, system, max_tokens }: { model: string; prompt: string; system?: string; max_tokens?: number },
    ctx: ToolContext,
  ) {
    if (!isModelAllowed(model)) return errorResult(`Model "${model}" is not in this server's ALLOWED_MODELS list.`);
    try {
      const info = await findModel(model);
      if (!info) return errorResult(`Unknown model "${model}". Call list_models with type "text" to see text models.`);
      if (!kindsOf(info).includes('text')) return errorResult(`Model "${model}" is not a text model. Call list_models with type "text".`);
      const result = await generateText({
        model: ctx.gateway.languageModel(model),
        prompt,
        instructions: system,
        maxOutputTokens: max_tokens,
        providerOptions: ctx.gatewayOptions('generate_text'),
      });
      const cost = result.providerMetadata?.gateway?.cost;
      const footer = `\n\n— model: ${model}${cost != null ? `, cost: $${cost}` : ''}`;
      return textResult(result.text + footer);
    } catch (error) {
      return toolError(error, model, 'text');
    }
  },
};
