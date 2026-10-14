import anthropic from '@lobehub/icons-static-svg/icons/anthropic.svg';
import bfl from '@lobehub/icons-static-svg/icons/bfl.svg';
import bytedance from '@lobehub/icons-static-svg/icons/bytedance.svg';
import deepseek from '@lobehub/icons-static-svg/icons/deepseek.svg';
import gemini from '@lobehub/icons-static-svg/icons/gemini.svg';
import grok from '@lobehub/icons-static-svg/icons/grok.svg';
import kling from '@lobehub/icons-static-svg/icons/kling.svg';
import meta from '@lobehub/icons-static-svg/icons/meta.svg';
import minimax from '@lobehub/icons-static-svg/icons/minimax.svg';
import mistral from '@lobehub/icons-static-svg/icons/mistral.svg';
import moonshot from '@lobehub/icons-static-svg/icons/moonshot.svg';
import nvidia from '@lobehub/icons-static-svg/icons/nvidia.svg';
import openai from '@lobehub/icons-static-svg/icons/openai.svg';
import qwen from '@lobehub/icons-static-svg/icons/qwen.svg';
import recraft from '@lobehub/icons-static-svg/icons/recraft.svg';
import zhipu from '@lobehub/icons-static-svg/icons/zhipu.svg';
import { assetUrl } from '@/lib/asset-url';

// Monochrome provider marks from LobeHub Icons (MIT). Keyed by the provider
// prefix used in AI Gateway model ids; only providers present in the live
// catalog are shown. Logos belong to their owners.
const LOGOS: { id: string; name: string; icon: unknown }[] = [
  { id: 'openai', name: 'OpenAI', icon: openai },
  { id: 'anthropic', name: 'Anthropic', icon: anthropic },
  { id: 'google', name: 'Google Gemini', icon: gemini },
  { id: 'spacexai', name: 'xAI Grok', icon: grok },
  { id: 'meta', name: 'Meta', icon: meta },
  { id: 'deepseek', name: 'DeepSeek', icon: deepseek },
  { id: 'mistral', name: 'Mistral', icon: mistral },
  { id: 'alibaba', name: 'Alibaba Qwen', icon: qwen },
  { id: 'moonshotai', name: 'Moonshot Kimi', icon: moonshot },
  { id: 'zai', name: 'Z.ai', icon: zhipu },
  { id: 'bytedance', name: 'ByteDance', icon: bytedance },
  { id: 'minimax', name: 'MiniMax', icon: minimax },
  { id: 'bfl', name: 'Black Forest Labs', icon: bfl },
  { id: 'klingai', name: 'Kling', icon: kling },
  { id: 'recraft', name: 'Recraft', icon: recraft },
  { id: 'nvidia', name: 'NVIDIA', icon: nvidia },
];

export function ProviderLogos({ providerIds }: { providerIds: string[] }) {
  const shown = LOGOS.filter((logo) => providerIds.includes(logo.id));
  const more = providerIds.length - shown.length;
  return (
    <div className="logos" data-logos>
      <ul className="logos-ring">
        {shown.map((logo, i) => (
          <li key={logo.id} style={{ '--i': i, '--n': shown.length } as React.CSSProperties} data-logo>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={assetUrl(logo.icon)} alt={logo.name} title={logo.name} width={40} height={40} />
          </li>
        ))}
      </ul>
      {more > 0 && <p className="logos-more">and {more} more providers</p>}
    </div>
  );
}
