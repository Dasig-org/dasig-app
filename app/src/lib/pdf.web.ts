/** On the web: the browser's own print window, where "Save as PDF" is one of the printers. */
export async function exportPdf(html: string, name: string): Promise<void> {
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  frame.srcdoc = html;
  await new Promise<void>((ok) => { frame.onload = () => ok(); document.body.appendChild(frame); });
  const w = frame.contentWindow;
  if (!w) return;
  w.document.title = name; // the name the browser suggests for the file
  // Photos are inside the page as data: links; give them a moment to decode before printing.
  await Promise.all([...w.document.images].map((img) => (img.complete ? Promise.resolve() : new Promise<void>((ok) => { img.onload = img.onerror = () => ok(); }))));
  w.focus(); w.print();
  setTimeout(() => frame.remove(), 60000);
}
