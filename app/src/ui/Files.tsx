import { useEffect, useState } from "react";
import { Image, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { fileUri, type Attachment } from "@/lib/files";
import { Icon } from "./Icon";
import { c } from "./theme";

function Tile({ a }: { a: Attachment }) {
  const [uri, setUri] = useState<string | null>(null);
  const image = a.contentType.startsWith("image/");
  useEffect(() => { if (image) fileUri(a).then(setUri).catch(() => {}); }, [a.hash]);
  const open = async () => Linking.openURL(await fileUri(a)).catch(() => {});
  return <Pressable onPress={open} style={{ width: 96, height: 96, borderRadius: 16, backgroundColor: c.white, overflow: "hidden", alignItems: "center", justifyContent: "center", padding: image ? 0 : 6 }}>
    {image ? (uri ? <Image source={{ uri }} style={{ width: 96, height: 96 }} /> : null)
      : <><Icon name="receipt" size={24} /><Text numberOfLines={2} style={{ fontSize: 10.5, fontWeight: "600", color: c.slate, textAlign: "center", marginTop: 4 }}>{a.title ?? "File"}</Text></>}
  </Pressable>;
}
/** Attachments render by type: images as thumbnails, documents as tiles (DESIGN_STANDARD §1a). */
export function Files({ items, onAdd }: { items: Attachment[]; onAdd?: () => void }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
    {items.map((a) => <Tile key={a.hash} a={a} />)}
    {onAdd ? <Pressable onPress={onAdd} accessibilityLabel="Add a photo or file" style={{ width: 96, height: 96, borderRadius: 16, backgroundColor: c.sand, alignItems: "center", justifyContent: "center" }}>
      <Icon name="camera" size={26} /></Pressable> : null}
  </ScrollView>;
}
