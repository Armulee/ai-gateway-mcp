import anthropic from '@lobehub/icons-static-svg/icons/anthropic.svg';
import antgroup from '@lobehub/icons-static-svg/icons/antgroup.svg';
import arcee from '@lobehub/icons-static-svg/icons/arcee.svg';
import aws from '@lobehub/icons-static-svg/icons/aws.svg';
import bfl from '@lobehub/icons-static-svg/icons/bfl.svg';
import bytedance from '@lobehub/icons-static-svg/icons/bytedance.svg';
import cohere from '@lobehub/icons-static-svg/icons/cohere.svg';
import deepseek from '@lobehub/icons-static-svg/icons/deepseek.svg';
import fireworks from '@lobehub/icons-static-svg/icons/fireworks.svg';
import gemini from '@lobehub/icons-static-svg/icons/gemini.svg';
import grok from '@lobehub/icons-static-svg/icons/grok.svg';
import inception from '@lobehub/icons-static-svg/icons/inception.svg';
import kling from '@lobehub/icons-static-svg/icons/kling.svg';
import liquid from '@lobehub/icons-static-svg/icons/liquid.svg';
import longcat from '@lobehub/icons-static-svg/icons/longcat.svg';
import meta from '@lobehub/icons-static-svg/icons/meta.svg';
import microsoft from '@lobehub/icons-static-svg/icons/microsoft.svg';
import minimax from '@lobehub/icons-static-svg/icons/minimax.svg';
import mistral from '@lobehub/icons-static-svg/icons/mistral.svg';
import moonshot from '@lobehub/icons-static-svg/icons/moonshot.svg';
import morph from '@lobehub/icons-static-svg/icons/morph.svg';
import nvidia from '@lobehub/icons-static-svg/icons/nvidia.svg';
import openai from '@lobehub/icons-static-svg/icons/openai.svg';
import perplexity from '@lobehub/icons-static-svg/icons/perplexity.svg';
import poolside from '@lobehub/icons-static-svg/icons/poolside.svg';
import qwen from '@lobehub/icons-static-svg/icons/qwen.svg';
import recraft from '@lobehub/icons-static-svg/icons/recraft.svg';
import sakana from '@lobehub/icons-static-svg/icons/sakana.svg';
import stepfun from '@lobehub/icons-static-svg/icons/stepfun.svg';
import tencent from '@lobehub/icons-static-svg/icons/tencent.svg';
import topaz from '@lobehub/icons-static-svg/icons/topazlabs.svg';
import xiaomi from '@lobehub/icons-static-svg/icons/xiaomimimo.svg';
import zhipu from '@lobehub/icons-static-svg/icons/zhipu.svg';
import { assetUrl } from '@/lib/asset-url';

// Monochrome provider marks from LobeHub Icons (MIT), keyed by the provider
// prefix used in AI Gateway model ids. Providers without a mark here are
// counted in "+N" instead. Logos belong to their owners.
const LOGOS: Record<string, { name: string; icon: unknown }> = {
  openai: { name: 'OpenAI', icon: openai },
  anthropic: { name: 'Anthropic', icon: anthropic },
  google: { name: 'Google Gemini', icon: gemini },
  spacexai: { name: 'xAI Grok', icon: grok },
  meta: { name: 'Meta', icon: meta },
  deepseek: { name: 'DeepSeek', icon: deepseek },
  mistral: { name: 'Mistral', icon: mistral },
  alibaba: { name: 'Alibaba Qwen', icon: qwen },
  moonshotai: { name: 'Moonshot Kimi', icon: moonshot },
  zai: { name: 'Z.ai', icon: zhipu },
  bytedance: { name: 'ByteDance', icon: bytedance },
  minimax: { name: 'MiniMax', icon: minimax },
  bfl: { name: 'Black Forest Labs', icon: bfl },
  klingai: { name: 'Kling', icon: kling },
  recraft: { name: 'Recraft', icon: recraft },
  nvidia: { name: 'NVIDIA', icon: nvidia },
  tencent: { name: 'Tencent', icon: tencent },
  xiaomi: { name: 'Xiaomi MiMo', icon: xiaomi },
  amazon: { name: 'Amazon', icon: aws },
  inclusionai: { name: 'inclusionAI', icon: antgroup },
  meituan: { name: 'Meituan LongCat', icon: longcat },
  microsoft: { name: 'Microsoft', icon: microsoft },
  topaz: { name: 'Topaz Labs', icon: topaz },
  sakana: { name: 'Sakana AI', icon: sakana },
  inception: { name: 'Inception', icon: inception },
  morph: { name: 'Morph', icon: morph },
  poolside: { name: 'Poolside', icon: poolside },
  stepfun: { name: 'StepFun', icon: stepfun },
  cohere: { name: 'Cohere', icon: cohere },
  perplexity: { name: 'Perplexity', icon: perplexity },
  'arcee-ai': { name: 'Arcee AI', icon: arcee },
  fireworks: { name: 'Fireworks AI', icon: fireworks },
  liquid: { name: 'Liquid AI', icon: liquid },
};

/** The providers behind one kind of model, as a small constellation of marks. */
export function KindLogos({ providerIds, max }: { providerIds: string[]; max: number }) {
  const known = providerIds.filter((id) => LOGOS[id]);
  const shown = known.slice(0, max);
  const more = providerIds.length - shown.length;
  return (
    <ul className="kind-logos">
      {shown.map((id, i) => (
        <li key={id} style={{ '--i': i } as React.CSSProperties} data-kind-logo>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={assetUrl(LOGOS[id].icon)} alt={LOGOS[id].name} title={LOGOS[id].name} width={20} height={20} />
        </li>
      ))}
      {more > 0 && (
        <li className="kind-more" data-kind-logo aria-label={`and ${more} more`}>
          +{more}
        </li>
      )}
    </ul>
  );
}
