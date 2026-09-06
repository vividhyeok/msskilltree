import {
  Flame,
  Zap,
  CloudLightning,
  CloudSnow,
  Snowflake,
  Tornado,
  Orbit,
  Sparkles,
  Waves,
  Shield,
  Ghost,
  CircleDot,
  Crosshair,
  Moon,
  Mountain,
  Radio,
  Sun,
  WandSparkles,
  Focus,
  Brain,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties } from "react";

// Navigation symbols, not game artwork. The same symbol follows a magic everywhere.
const symbols: Record<string, [LucideIcon, string]> = {
  magic_bolt: [WandSparkles, "#c2a4ff"],
  fireball: [Flame, "#ffa36f"],
  thunderstorm: [CloudLightning, "#f4d078"],
  meteor: [Flame, "#ffb38d"],
  cyclone: [Tornado, "#8bd8c5"],
  electric_shock: [Zap, "#e5d28b"],
  energy_bolt: [CircleDot, "#afc2ff"],
  incineration: [Sun, "#f18f7d"],
  blizzard: [CloudSnow, "#a6d4fa"],
  tsunami: [Waves, "#77c9f4"],
  spirit: [Sparkles, "#c9b4ff"],
  satellite: [Orbit, "#efc499"],
  arcane_ray: [Crosshair, "#c7a4eb"],
  flash_shock: [Sun, "#f0daa6"],
  electric_zone: [Radio, "#d6ce91"],
  frost_nova: [Snowflake, "#9adbe4"],
  lava_zone: [Mountain, "#efab85"],
  shield: [Shield, "#8eccae"],
  cloaking: [Ghost, "#a5b9d8"],
  magic_circle: [CircleDot, "#c5a8df"],
  armageddon: [Moon, "#e8a7b3"],
  intelligence: [Brain, "#a4b7e6"],
  arcane_effuse: [Sparkles, "#a6d5bd"],
  concentration: [Focus, "#c9bca1"],
};
export function MagicSymbol({ id }: { id: string }) {
  const [Icon, color] = symbols[id] ?? [Sparkles, "#aabace"];
  return (
    <span
      className="magic-symbol"
      style={{ "--magic-color": color } as CSSProperties}
      aria-hidden="true"
    >
      <Icon size={20} strokeWidth={1.8} />
    </span>
  );
}
