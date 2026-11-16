
import { bix } from "@/lib/bix";
import { useLoad } from "@/lib/use";
import { IconCircle, Meta, Outline, Panel, Pill, Row, Screen, Tip, Title } from "@/ui/kit";
import { useSnackbar } from "@/ui/Snackbar";

/** Links and safety (sketch: trust #5): every invite link, and a way to turn it off. */
export default function Links() {
  const { show } = useSnackbar();
  const setMsg = (m: string | null) => { if (m) show(m); };
  const { data, reload } = useLoad(() => bix.links(), []);
  const active = (data ?? []).filter((x) => x.link.status === "active");
  const off = (data ?? []).filter((x) => x.link.status !== "active");
  return (
    <Screen back>
      <Title sub="Turning a link off stops anyone new joining through it. People already in stay.">Links and safety</Title>
      <Tip id="links" title="Keep links close">Share in your group&apos;s chat. Turn off any that spread too far.</Tip>
      <Panel>
        {active.map(({ link, target }, i) => <Row key={link.id} left={<IconCircle name="link" />} title={target?.title ?? "A link"} meta={`${(link.grants ?? []).includes("join-team") ? "Joins the team" : (link.grants ?? []).includes("join-org") ? "Joins the group" : "View"} · ${link.audience === "anyone-with-link" ? "anyone with the link" : link.audience}`}
          right={<Outline label="Turn off" onPress={async () => { try { await bix.revokeLink(link.id); setMsg("Turned off."); reload(); } catch (e) { setMsg(String(e instanceof Error ? e.message : e)); } }} />} last={i === active.length - 1} />)}
        {!active.length ? <Row title="No active links" last /> : null}
      </Panel>
      {off.length ? <><Meta>{"\nTurned off"}</Meta><Panel>{off.map(({ link, target }, i) => <Row key={link.id} left={<IconCircle name="lock" tone="grey" />} title={target?.title ?? "A link"} right={<Pill>Off</Pill>} last={i === off.length - 1} />)}</Panel></> : null}
    </Screen>
  );
}
