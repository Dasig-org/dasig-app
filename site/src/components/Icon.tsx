/** The same stroke icons as the Dasig app (apps/bayanihan/src/ui/icons.json). */
import icons from "@/lib/icons.json"; // copied from apps/bayanihan/src/ui/icons.json

export type IconName = keyof typeof icons.icons;
export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    dangerouslySetInnerHTML={{ __html: icons.icons[name] }} />;
}
