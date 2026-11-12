import { useEffect, useState } from "react";
import { pushState, turnPushOff, turnPushOn, type PushState } from "@/lib/push";
import { IconCircle, Outline, Panel, Row } from "./kit";

const META: Record<PushState, string> = {
  on: "You'll be told when someone asks you, or asks to join",
  off: "Get told when someone asks you, or asks to join",
  blocked: "Blocked in this phone's settings. Allow notifications for Dasig there.",
  unsupported: "This browser can't. On iPhone, add Dasig to your Home Screen first.",
  unavailable: "Not available on this server or this version of the app yet. Your Inbox still has everything.",
};

/** Notifications on this device: a row for Settings, or (card) a nudge at the top of the Inbox while they're off. */
export function PushToggle({ card }: { card?: boolean }) {
  const [st, setSt] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { pushState().then(setSt).catch(() => setSt("unsupported")); }, []);
  if (!st || (card && st !== "off")) return null;
  const flip = async () => { setBusy(true); try { setSt(st === "on" ? await turnPushOff() : await turnPushOn()); } catch { setSt("unavailable"); } finally { setBusy(false); } };
  const row = <Row left={<IconCircle name="spark" />} title={card ? "Get notified" : "Notifications"} meta={META[st]} last={card}
    right={st === "on" || st === "off" ? <Outline label={busy ? "…" : st === "on" ? "Turn off" : "Turn on"} onPress={flip} /> : undefined} />;
  return card ? <Panel>{row}</Panel> : row;
}
