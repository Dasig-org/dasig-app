import { Platform } from "react-native";
/** Save a BIX Bundle: download on the web, the share sheet on the phone (Files, Drive, email…). */
export async function saveJson(name: string, data: unknown) {
  const json = JSON.stringify(data, null, 1);
  if (Platform.OS === "web") {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([json], { type: "application/json" })); a.download = name; a.click(); return;
  }
  const FS = await import("expo-file-system");
  const Sharing = await import("expo-sharing");
  const f = new FS.File(FS.Paths.cache, name);
  f.create({ overwrite: true }); f.write(json);
  await Sharing.shareAsync(f.uri, { mimeType: "application/json", dialogTitle: name });
}
