import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { env } from "./env";
import { supabase } from "./supabase";

export type Attachment = { contentType: string; url: string; hash: string; size: number; title?: string; showsMinors?: boolean; capturedAt?: string };

async function upload(uri: string, contentType: string, title: string, showsMinors: boolean): Promise<Attachment> {
  const blob = await (await fetch(uri)).blob();
  const { data } = await supabase.auth.getSession();
  const res = await fetch(`${env.bixUrl}/$files?${new URLSearchParams({ title, showsMinors: String(showsMinors) })}`, {
    method: "POST", headers: { "content-type": contentType, ...(data.session ? { authorization: `Bearer ${data.session.access_token}` } : {}) }, body: blob,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `upload failed (${res.status})`);
  return json as Attachment;
}

/** Take or choose a photo. Kept by the group's own server. */
export async function pickPhoto(showsMinors = false): Promise<Attachment | null> {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
  if (r.canceled || !r.assets[0]) return null;
  const a = r.assets[0];
  return upload(a.uri, a.mimeType ?? "image/jpeg", a.fileName ?? "Photo", showsMinors);
}
export async function pickDocument(): Promise<Attachment | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/*", "text/*", "application/vnd.openxmlformats-officedocument.*"] });
  if (r.canceled || !r.assets[0]) return null;
  const a = r.assets[0];
  return upload(a.uri, a.mimeType ?? "application/pdf", a.name, false);
}
/** Files need sign-in to download, so fetch with the token and hand back something an <Image> can show. */
export async function fileUri(a: Attachment): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(env.bixUrl + a.url, { headers: data.session ? { authorization: `Bearer ${data.session.access_token}` } : {} });
  const blob = await res.blob();
  if (typeof URL !== "undefined" && "createObjectURL" in URL) return URL.createObjectURL(blob);
  return await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.readAsDataURL(blob); });
}
