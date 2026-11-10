import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";
import { send } from "./transport";

export type Attachment = { contentType: string; url: string; hash: string; size: number; title?: string; showsMinors?: boolean; capturedAt?: string };

/** Files travel as base64 JSON: React Native can't reliably send or read binary bodies (no Blob from bytes, no readAsArrayBuffer). */
/** The group a new file counts against on servers with a storage allowance (set by the session when the group changes). */
let uploadGroup: string | null = null;
export const setUploadGroup = (orgId: string | null) => { uploadGroup = orgId; };
async function upload(base64: string, contentType: string, title: string, showsMinors: boolean): Promise<Attachment> {
  const org = uploadGroup ? `&org=${encodeURIComponent(`Organization/${uploadGroup}`)}` : "";
  const res = await send("POST", `/$files?b64=1&title=${encodeURIComponent(title)}&showsMinors=${showsMinors}${org}`, JSON.stringify({ contentType, data: base64 }));
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `upload failed (${res.status})`);
  return json as Attachment;
}
async function readBase64(uri: string): Promise<string> {
  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    return await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1] ?? ""); r.readAsDataURL(blob); });
  }
  const FS = await import("expo-file-system");
  return new FS.File(uri).base64();
}

/** Choose a photo. Kept by the group's own server (or this phone). */
export async function pickPhoto(showsMinors = false): Promise<Attachment | null> {
  if (Platform.OS !== "web") {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) throw new Error("Dasig needs permission to see your photos. You can allow it in Settings.");
  }
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1, allowsEditing: true });
  if (r.canceled || !r.assets[0]) return null;
  const a = r.assets[0];
  // Resize before upload: 1600 px on the long side, JPEG 0.7. A 2–3 MB phone photo becomes ~300 KB, which looks the
  // same on a phone and in a report, saves the group's storage, and uploads faster on mobile data.
  const { manipulateAsync, SaveFormat } = await import("expo-image-manipulator");
  const long = Math.max(a.width ?? 0, a.height ?? 0);
  const out = await manipulateAsync(a.uri, long > 1600 ? [{ resize: (a.width ?? 0) >= (a.height ?? 0) ? { width: 1600 } : { height: 1600 } }] : [], { compress: 0.7, format: SaveFormat.JPEG, base64: true });
  return upload(out.base64 ?? (await readBase64(out.uri)), "image/jpeg", a.fileName ?? "Photo", showsMinors);
}
export async function pickDocument(): Promise<Attachment | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/*", "text/*", "application/vnd.openxmlformats-officedocument.*"], copyToCacheDirectory: true });
  if (r.canceled || !r.assets[0]) return null;
  const a = r.assets[0];
  return upload(await readBase64(a.uri), a.mimeType ?? "application/pdf", a.name, false);
}
const cache = new Map<string, string>();
/** A data URI an <Image> can show. Cached per file. */
export async function fileUri(a: Attachment): Promise<string> {
  const hit = cache.get(a.hash); if (hit) return hit;
  const res = await send("GET", `${a.url}?b64=1`);
  if (!res.ok) throw new Error("can't open this file");
  const j = (await res.json()) as { contentType: string; data: string };
  const uri = `data:${j.contentType};base64,${j.data}`;
  cache.set(a.hash, uri);
  return uri;
}
