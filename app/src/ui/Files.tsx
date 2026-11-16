import { useEffect, useState, useEffectEvent } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { extOf, fileUri, kindOf, type Attachment, type FileKind } from "@/lib/files";
import { FileViewer } from "./FileViewer";
import { Icon } from "./Icon";
import { c } from "./theme";

/*
 * A page's files (DESIGN_STANDARD §1a, §1b; UI_REIMAGINE §7.2g). Photos as real thumbnails; documents as a tile with
 * a coloured type badge (PDF, DOCX, XLSX…), the name and the size, so you know what it is before opening it. Tap any
 * of them: the viewer opens on it, full screen, and swipes through the page's files.
 */
export const kb = (n: number) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1000))} KB`);

const TONE: Record<FileKind, [string, string]> = {
  pdf: ["#FDE2E1", "#B3261E"], doc: ["#DCE7FF", "#1D4ED8"], sheet: ["#DCF5E3", "#166534"], slides: ["#FFE9D2", "#B4500F"],
  text: ["#ECEEF2", "#475569"], image: ["#ECEEF2", "#475569"], other: ["#ECEEF2", "#475569"],
};
/** The file's type at a glance: its extension on its colour (PDF red, Word blue, Excel green, slides orange). */
export function FileBadge({ a, size = 40 }: { a: Attachment; size?: number }) {
  const [bg, fg] = TONE[kindOf(a)];
  return <View style={{ width: size, height: size * 1.2, borderRadius: size * 0.18, backgroundColor: bg, alignItems: "center", justifyContent: "flex-end", paddingBottom: size * 0.16 }}>
    <View style={{ position: "absolute", top: 0, right: 0, width: size * 0.3, height: size * 0.3, borderBottomLeftRadius: size * 0.12, backgroundColor: fg, opacity: 0.25 }} />
    <Text style={{ fontSize: Math.max(9, size * 0.24), fontWeight: "800", color: fg, letterSpacing: 0.5 }}>{extOf(a).toUpperCase().slice(0, 4)}</Text>
  </View>;
}

const TILE = 104;
function Tile({ a, onPress }: { a: Attachment; onPress: () => void }) {
  const [uri, setUri] = useState<string | null>(null);
  const image = kindOf(a) === "image";
  const show = useEffectEvent((on: () => boolean) => { if (image) fileUri(a).then((u) => { if (on()) setUri(u); }).catch(() => {}); });
  useEffect(() => { let on = true; show(() => on); return () => { on = false; }; }, [a.hash, image]);
  const label = `${a.title ?? (image ? "Photo" : "File")}, ${kb(a.size)}. Open`;
  if (image) return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
    style={({ pressed }) => ({ width: TILE, height: TILE, borderRadius: 16, overflow: "hidden", backgroundColor: c.s200, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.85 : 1 })}>
    {uri ? <Image source={{ uri }} style={{ width: TILE, height: TILE }} /> : <Icon name="camera" size={22} color={c.s500} />}
  </Pressable>;
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
    style={({ pressed }) => ({ width: TILE, height: TILE, borderRadius: 16, backgroundColor: pressed ? c.s200 : c.white, padding: 10, justifyContent: "space-between" })}>
    <FileBadge a={a} size={30} />
    <View><Text numberOfLines={2} style={{ fontSize: 12, lineHeight: 15, fontWeight: "600", color: c.ink }}>{a.title ?? "File"}</Text>
      <Text style={{ fontSize: 11, color: c.s500, marginTop: 1 }}>{kb(a.size)}</Text></View>
  </Pressable>;
}

/** Attachments render by type: images as thumbnails, documents as typed tiles. Tap one to preview it. */
export function Files({ items, onAdd, onRemove, hint }: { items: Attachment[]; onAdd?: () => void; onRemove?: (a: Attachment) => void; hint?: string }) {
  const [open, setOpen] = useState<number | null>(null);
  // Empty: one wide tile that says what belongs here, not a bare "+" (UX_GAPS C12).
  if (!items.length && onAdd) return <Pressable onPress={onAdd} accessibilityRole="button" accessibilityLabel={hint ?? "Add a photo or file"}
    style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, backgroundColor: c.sand }}>
    <Icon name="plus" size={22} /><Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: c.ink }}>{hint ?? "Add a photo or file"}</Text></Pressable>;
  return <>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {items.map((a, i) => <Tile key={a.hash} a={a} onPress={() => setOpen(i)} />)}
      {onAdd ? <Pressable onPress={onAdd} accessibilityRole="button" accessibilityLabel="Add a photo or file" style={{ width: TILE, height: TILE, borderRadius: 16, backgroundColor: c.sand, alignItems: "center", justifyContent: "center" }}>
        <Icon name="plus" size={26} /></Pressable> : null}
    </ScrollView>
    {open !== null ? <FileViewer key={open} items={items} index={open} onClose={() => setOpen(null)} onRemove={onRemove} /> : null}
  </>;
}
