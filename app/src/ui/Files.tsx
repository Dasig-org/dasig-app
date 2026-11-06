import { useEffect, useState } from "react";
import { Alert, Image, Linking, Platform, Pressable, ScrollView, Share, Text, View } from "react-native";
import { fileUri, type Attachment } from "@/lib/files";
import { Icon } from "./Icon";
import { Buttons, Meta, Outline, Primary, Sheet } from "./kit";
import { c, type as t } from "./theme";

const kb = (n: number) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1000))} KB`);

function Tile({ a, onPress }: { a: Attachment; onPress: () => void }) {
  const [uri, setUri] = useState<string | null>(null);
  const image = a.contentType.startsWith("image/");
  useEffect(() => { if (image) fileUri(a).then(setUri).catch(() => {}); }, [a.hash]);
  return <Pressable onPress={onPress} accessibilityLabel={a.title ?? (image ? "Photo" : "File")} style={{ width: 96, height: 96, borderRadius: 16, backgroundColor: c.white, overflow: "hidden", alignItems: "center", justifyContent: "center", padding: image ? 0 : 6 }}>
    {image ? (uri ? <Image source={{ uri }} style={{ width: 96, height: 96 }} /> : null)
      : <><Icon name="receipt" size={24} /><Text numberOfLines={2} style={{ fontSize: 10.5, fontWeight: "600", color: c.slate, textAlign: "center", marginTop: 4 }}>{a.title ?? "File"}</Text></>}
  </Pressable>;
}

/** One file, opened: a large preview, open or share it, and remove it when you may. */
function FileSheet({ a, onClose, onRemove }: { a: Attachment | null; onClose: () => void; onRemove?: (a: Attachment) => void }) {
  const [uri, setUri] = useState<string | null>(null);
  const image = !!a?.contentType.startsWith("image/");
  useEffect(() => { setUri(null); if (a) fileUri(a).then(setUri).catch(() => {}); }, [a?.hash]);
  const remove = () => {
    if (!a || !onRemove) return;
    const go = () => { onRemove(a); onClose(); };
    if (Platform.OS === "web") return go();
    Alert.alert("Remove this file?", "It's taken off this page. The page's history still shows it was here.", [{ text: "Keep it", style: "cancel" }, { text: "Remove", style: "destructive", onPress: go }]);
  };
  return <Sheet open={!!a} onClose={onClose}>
    {a ? <>
      {image ? <View style={{ borderRadius: 16, overflow: "hidden", backgroundColor: c.wash, alignItems: "center" }}>{uri ? <Image source={{ uri }} resizeMode="contain" style={{ width: "100%", height: 300 }} /> : <View style={{ height: 300 }} />}</View>
        : <View style={{ height: 120, borderRadius: 16, backgroundColor: c.sand, alignItems: "center", justifyContent: "center" }}><Icon name="receipt" size={40} /></View>}
      <Text style={[t.row, { fontSize: 17, marginTop: 14 }]} numberOfLines={2}>{a.title ?? (image ? "Photo" : "File")}</Text>
      <Meta>{[kb(a.size), a.capturedAt ? new Date(a.capturedAt).toLocaleDateString() : null, a.showsMinors ? "Shows children · stays in the group" : null].filter(Boolean).join(" · ")}</Meta>
      <Buttons>
        <Primary label={image ? "Share" : "Open"} onPress={() => { if (!uri) return; if (image && Platform.OS !== "web") Share.share({ url: uri, message: a.title ?? "" }).catch(() => {}); else Linking.openURL(uri).catch(() => {}); }} />
        {onRemove ? <Outline label="Remove" onPress={remove} /> : null}
      </Buttons>
    </> : null}
  </Sheet>;
}

/** Attachments render by type: images as thumbnails, documents as tiles (DESIGN_STANDARD §1a). Tap one to open it. */
export function Files({ items, onAdd, onRemove, hint }: { items: Attachment[]; onAdd?: () => void; onRemove?: (a: Attachment) => void; hint?: string }) {
  const [open, setOpen] = useState<Attachment | null>(null);
  // Empty: one wide tile that says what belongs here, not a bare "+" (UX_GAPS C12).
  if (!items.length && onAdd) return <Pressable onPress={onAdd} accessibilityRole="button" accessibilityLabel={hint ?? "Add a photo or file"}
    style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, backgroundColor: c.sand }}>
    <Icon name="plus" size={22} /><Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: c.ink }}>{hint ?? "Add a photo or file"}</Text></Pressable>;
  return <>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {items.map((a) => <Tile key={a.hash} a={a} onPress={() => setOpen(a)} />)}
      {onAdd ? <Pressable onPress={onAdd} accessibilityLabel="Add a photo or file" style={{ width: 96, height: 96, borderRadius: 16, backgroundColor: c.sand, alignItems: "center", justifyContent: "center" }}>
        <Icon name="plus" size={26} /></Pressable> : null}
    </ScrollView>
    <FileSheet a={open} onClose={() => setOpen(null)} onRemove={onRemove} />
  </>;
}
