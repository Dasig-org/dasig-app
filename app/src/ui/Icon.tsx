import { SvgXml } from "react-native-svg";
import icons from "./icons.json";
import { c } from "./theme";

export type IconName = keyof typeof icons.icons;
export function Icon({ name, size = 20, color = c.accent }: { name: IconName; size?: number; color?: string }) {
  const xml = `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icons.icons[name]}</svg>`;
  return <SvgXml xml={xml} width={size} height={size} />;
}
