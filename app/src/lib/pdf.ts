import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FS from "expo-file-system";

/** A printable page (lib/report.ts reportHtml) as a PDF file, handed to the share sheet: save it, send it, print it. */
export async function exportPdf(html: string, name: string): Promise<void> {
  const made = await Print.printToFileAsync({ html });
  // Give it a name people recognise in Files, Messenger or email.
  const out = new FS.File(FS.Paths.cache, `${name.replace(/[^\w .-]+/g, " ").trim().slice(0, 60) || "report"}.pdf`);
  if (out.exists) out.delete();
  new FS.File(made.uri).move(out);
  await Sharing.shareAsync(out.uri, { mimeType: "application/pdf", dialogTitle: name, UTI: "com.adobe.pdf" });
}
