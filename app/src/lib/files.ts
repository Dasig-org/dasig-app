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
  // We have the bytes already: the new file previews at once, without downloading it back.
  rememberFile((json as Attachment).hash, `data:${contentType};base64,${base64}`);
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
/** Keep a file's data URI for previews (after an upload, the app already has it). */
export function rememberFile(hash: string, dataUri: string) { cache.set(hash, dataUri); }
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

/*
 * Previewing and opening files (2026-11-15, Don: "file uploads and images need a preview… can be previewed outside
 * the app if it's complex work"). In the app: images (full screen, zoom, swipe), text, and on the web PDFs (the
 * browser's own viewer). Everything else opens outside the app: Android "Open with" (a view intent with a readable
 * content:// link), iPhone's share sheet (which previews the file and offers "Open in…"), or a new tab / download on
 * the web. A file is written once per phone to the cache, named by its hash, and reused.
 */
export type FileKind = "image" | "pdf" | "text" | "doc" | "sheet" | "slides" | "other";
export function kindOf(a: Attachment): FileKind {
  const m = a.contentType.toLowerCase(), e = extOf(a);
  if (m.startsWith("image/")) return "image";
  if (m === "application/pdf" || e === "pdf") return "pdf";
  if (m.startsWith("text/") || ["txt", "csv", "md"].includes(e)) return "text";
  if (m.includes("wordprocessing") || m.includes("msword") || ["doc", "docx", "odt"].includes(e)) return "doc";
  if (m.includes("spreadsheet") || m.includes("excel") || ["xls", "xlsx", "ods"].includes(e)) return "sheet";
  if (m.includes("presentation") || m.includes("powerpoint") || ["ppt", "pptx", "odp"].includes(e)) return "slides";
  return "other";
}
const EXT: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "text/plain": "txt", "text/csv": "csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx" };
/** The file's extension, from its name, else its type. */
export function extOf(a: Attachment): string {
  const m = /\.([a-z0-9]{1,5})$/i.exec(a.title ?? "");
  return (m?.[1] ?? EXT[a.contentType] ?? a.contentType.split("/")[1]?.split(/[.+;-]/).pop() ?? "file").toLowerCase();
}
const nameOf = (a: Attachment) => (/\.[a-z0-9]{1,5}$/i.test(a.title ?? "") ? a.title! : `${(a.title ?? "file").replace(/[^\w .-]/g, "_")}.${extOf(a)}`);
const base64Of = async (a: Attachment) => (await fileUri(a)).split(",")[1] ?? "";

/** This phone's copy of the file (cache), written once. Native only. */
async function localFile(a: Attachment) {
  const FS = await import("expo-file-system");
  const dir = new FS.Directory(FS.Paths.cache, "files", a.hash.slice(0, 16));
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const f = new FS.File(dir, nameOf(a).replace(/[/\\]/g, "_"));
  if (!f.exists) { f.create({ overwrite: true }); f.write(await base64Of(a), { encoding: "base64" }); }
  return f;
}
/** A blob: link for the web (a data: link can't be opened in a tab). */
async function blobUrl(a: Attachment): Promise<string> {
  const b = await (await fetch(await fileUri(a))).blob();
  return URL.createObjectURL(new Blob([b], { type: a.contentType }));
}
/** A link the web page can show inline (a PDF in an iframe). */
export const webPreviewUrl = (a: Attachment) => blobUrl(a);

/** A text file's contents, for previewing in the app (the first 200 KB). */
export async function fileText(a: Attachment): Promise<string> {
  if (Platform.OS === "web") { const bin = atob(await base64Of(a)); return new TextDecoder().decode(Uint8Array.from(bin.slice(0, 200_000), (ch) => ch.charCodeAt(0))); }
  return (await (await localFile(a)).text()).slice(0, 200_000);
}

/** Open the file in another app (or the browser): where Word, Excel, PDFs and anything else are read properly. */
export async function openOutside(a: Attachment): Promise<void> {
  if (Platform.OS === "web") {
    const url = await blobUrl(a), k = kindOf(a);
    if (k === "image" || k === "pdf" || k === "text") { window.open(url, "_blank", "noopener"); return; }
    const link = document.createElement("a"); link.href = url; link.download = nameOf(a); link.click(); return;
  }
  const f = await localFile(a);
  if (Platform.OS === "android") {
    try {
      const { getContentUriAsync } = await import("expo-file-system/legacy");
      const IL = await import("expo-intent-launcher");
      // FLAG_GRANT_READ_URI_PERMISSION (1): the other app may read this one file.
      await IL.startActivityAsync("android.intent.action.VIEW", { data: await getContentUriAsync(f.uri), flags: 1, type: a.contentType });
      return;
    } catch { /* no app opens this type: offer the share sheet instead */ }
  }
  const Sharing = await import("expo-sharing");
  await Sharing.shareAsync(f.uri, { mimeType: a.contentType, dialogTitle: a.title ?? "Open with", UTI: UTI[kindOf(a)] });
}
const UTI: Partial<Record<FileKind, string>> = { pdf: "com.adobe.pdf", image: "public.image", text: "public.plain-text", doc: "org.openxmlformats.wordprocessingml.document", sheet: "org.openxmlformats.spreadsheetml.sheet", slides: "org.openxmlformats.presentationml.presentation" };

/** Share the file itself (not a link): to Messenger, Drive, email; or save it, on the web. */
export async function shareFile(a: Attachment): Promise<void> {
  if (Platform.OS === "web") {
    const file = new File([await (await fetch(await fileUri(a))).blob()], nameOf(a), { type: a.contentType });
    const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
    if (nav.canShare?.({ files: [file] })) { await nav.share({ files: [file], title: a.title }).catch(() => {}); return; }
    const link = document.createElement("a"); link.href = URL.createObjectURL(file); link.download = nameOf(a); link.click(); return;
  }
  const Sharing = await import("expo-sharing");
  await Sharing.shareAsync((await localFile(a)).uri, { mimeType: a.contentType, dialogTitle: a.title ?? "Share", UTI: UTI[kindOf(a)] });
}
