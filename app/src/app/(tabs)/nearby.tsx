import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Image, ScrollView, Share, Text, View } from "react-native";
import { appUrl } from "@/lib/env";
import { visibilityOf } from "@/ui/Privacy";
import { radius } from "@/ui/theme";
import * as Network from "expo-network";
import { bix, type R } from "@/lib/bix";
import { networkUrl } from "@/lib/env";
import { CAUSES } from "@/lib/org";
import { useSession } from "@/lib/session";
import { Logo } from "@/ui/Context";
import { Body, Buttons, Chips, Eyebrow, Field, IconCircle, Meta, Notice, Outline, Panel, Primary, Row, Sand, Screen, Sheet, Skeleton, Title } from "@/ui/kit";
import { c, type as t } from "@/ui/theme";

type Found = { groups: R[]; projects: (R & { groupName?: string })[] };
const placeOf = (r?: R | null) => (r?.extension ?? []).find((x: any) => x.url === "bayanihan:place-text")?.value as string | undefined;
const causeWords = (r?: R | null) => (r?.cause ?? []).map((x: any) => CAUSES.find((y) => y.code === x.code)?.label ?? x.code).join(", ");

/**
 * Who's working here: the Bayanihan Network's public directory. Only groups and projects that chose to be found,
 * and only their summaries: name, place, causes. Never people, tasks or files. Needs internet.
 */
export default function Nearby() {
  const s = useSession();
  const [status, setStatus] = useState<"checking" | "offline" | "down" | "ok">("checking");
  const [cause, setCause] = useState<string>("all");
  const [q, setQ] = useState("");
  const [place, setPlace] = useState("");
  const [found, setFound] = useState<Found | null>(null);
  const [open, setOpen] = useState<{ group?: R; project?: R & { groupName?: string } } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const search = async () => {
    setStatus("checking");
    const net = await Network.getNetworkStateAsync().catch(() => null);
    if (net && net.isInternetReachable === false) return setStatus("offline");
    try {
      const p = new URLSearchParams({ ...(cause !== "all" ? { cause } : {}), ...(q.trim() ? { q: q.trim() } : {}), ...(place.trim() ? { place: place.trim() } : {}) });
      const r = await fetch(`${networkUrl}/$directory?${p}`);
      if (!r.ok) return setStatus("down");
      setFound(await r.json()); setStatus("ok");
    } catch { setStatus("down"); }
  };
  useEffect(() => { search(); }, [cause]);
  const onEcosystem = s.connection?.kind === "ecosystem";
  const groupOf = (p?: R) => found?.groups.find((g) => `Organization/${g.id}` === p?.organization?.reference);
  const ask = async (org: R) => {
    if (!onEcosystem) { setOpen(null); router.push("/network" as never); return; }
    try { const role = await bix.ask(org.id); setMsg(role.status === "active" ? `You're already in ${org.name}.` : `Asked to join ${org.name}. Its officers will see your request.`); }
    catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
    setOpen(null);
  };
  const total = (found?.groups.length ?? 0) + (found?.projects.length ?? 0);
  // The directory is empty, not just this search: show a starter instead of filters that match nothing (design §8).
  const [emptyDirectory, setEmptyDirectory] = useState(false);
  useEffect(() => { if (status === "ok" && found && !q.trim() && !place.trim() && cause === "all") setEmptyDirectory(!total); }, [status, found]);
  const mine = s.groups.find((g) => g.role.code?.code === "officer");
  const mineHidden = mine && visibilityOf(mine.org) !== "public";
  const minePlace = mine ? placeOf(mine.org) : undefined;
  return (
    <Screen onRefresh={search}>
      <Title sub={emptyDirectory ? "Groups and projects on Dasig, as their organizers make them public." : "Groups and projects that chose to be found."}>Who's working here</Title>
      {emptyDirectory ? null : <>
      <Field icon="search" value={q} onChangeText={setQ} placeholder="Search a group or project" returnKeyType="search" onSubmitEditing={search} />
      <Field icon="pin" value={place} onChangeText={setPlace} placeholder="Where, e.g. Lahug or Cebu City" returnKeyType="search" onSubmitEditing={search} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -18 }} contentContainerStyle={{ paddingHorizontal: 18 }}>
        <Chips options={[{ value: "all", label: "All" }, ...CAUSES.slice(0, 9).map((x) => ({ value: x.code, label: x.label }))]} value={cause} onChange={setCause} />
      </ScrollView></>}
      {msg ? <Notice>{msg}</Notice> : null}
      {status === "checking" && !found ? <Skeleton /> : null}
      {status === "offline" || status === "down" ? <View style={{ marginTop: 12 }}><Sand><IconCircle name="wifioff" tone="white" />
        <View style={{ flex: 1 }}><Text style={t.row}>{status === "offline" ? "You're offline" : "Couldn't reach the Bayanihan Network"}</Text>
          <Meta>Finding groups needs internet. Your own groups keep working on your phones and hub.</Meta></View></Sand></View> : null}
      {status === "ok" && found && !total && !emptyDirectory ? <View style={{ marginTop: 12 }}><Sand><IconCircle name="pin" tone="white" />
        <View style={{ flex: 1 }}><Text style={t.row}>No one listed yet</Text><Meta>{q.trim() || cause !== "all" ? "Try another cause, word or place." : "Groups appear here when they choose \u201cAnyone can find it\u201d."}</Meta></View></Sand></View> : null}
      {status === "ok" && emptyDirectory ? <>
        <View style={{ marginTop: 6, borderRadius: radius.panel, overflow: "hidden", backgroundColor: c.ink }}>
          <Image source={require("../../../assets/images/zero/cleanup.jpg")} resizeMode="cover" style={{ width: "100%", height: 170 }} />
          <View style={{ position: "absolute", left: 10, top: 10, height: 26, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: c.white, justifyContent: "center" }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: c.ink }}>Just starting</Text></View>
          <View style={{ backgroundColor: c.white, padding: 18 }}>
            <Text style={[t.title, { fontSize: 22 }]}>Be one of the first here</Text>
            <Meta>Dasig is new. Groups and projects appear here once their organizers make them public, so volunteers nearby can find them and ask to join.</Meta>
            <Buttons>{mineHidden ? <Primary label={`List ${mine!.org.name}`} onPress={() => router.push(`/org/${mine!.org.id}` as never)} />
              : mine ? <Primary label="Start a project" onPress={() => router.push({ pathname: "/new-project", params: { org: mine.org.id } })} />
              : <Primary label="Start a group" onPress={() => router.push("/start-group")} />}</Buttons>
          </View>
        </View>

        <Eyebrow>{mine ? `How ${mine.org.name} looks here` : "What a listing shows"}</Eyebrow>
        <Panel>
          <Row left={<Logo name={mine?.org.name ?? "Lahug Uplands Runners Club"} size={44} image={mine?.org.image} />} title={mine?.org.name ?? "Lahug Uplands Runners Club"}
            meta={mine ? [minePlace ?? "Add a place", causeWords(mine.org) || "Add causes"].join(" · ") : "Lahug, Cebu City · Health, Children"} last />
        </Panel>
        <View style={{ marginTop: 8, marginHorizontal: 4 }}><Meta>{mine ? (mineHidden ? "Not listed yet. Open your group and choose \u201cAnyone can find it\u201d. People, tasks and files stay private." : "Listed. Add a place and causes so volunteers nearby can find you.") : "An example. Only the name, place and causes, never people, tasks or files."}</Meta></View>

        <Eyebrow>Know a group that should be here?</Eyebrow>
        <View style={{ backgroundColor: c.sand, borderRadius: radius.panel, padding: 16, flexDirection: "row", gap: 12, alignItems: "center" }}>
          <Image source={require("../../../assets/images/zero/youth-group.jpg")} style={{ width: 64, height: 64, borderRadius: radius.inner }} />
          <View style={{ flex: 1 }}><Text style={t.row}>Invite a club, church or barangay group</Text><Meta>They run their work here, and you can help them.</Meta></View>
        </View>
        <Buttons><Primary label="Share Dasig" onPress={() => { Share.share({ message: `We could run our group's work on Dasig: free, and every volunteer's work is recorded. ${appUrl()}` }).catch(() => {}); }} /></Buttons>
      </> : null}
      {found?.groups.length ? <><Eyebrow right={`${found.groups.length}`}>Groups</Eyebrow><Panel>
        {found.groups.map((g, i) => <Row key={g.id} left={<Logo name={g.name ?? "?"} size={40} image={g.image} />} title={g.name} meta={[placeOf(g), causeWords(g)].filter(Boolean).join(" · ") || g.kind}
          onPress={() => setOpen({ group: g })} last={i === found.groups.length - 1} />)}
      </Panel></> : null}
      {found?.projects.length ? <><Eyebrow right={`${found.projects.length}`}>Projects</Eyebrow><Panel>
        {found.projects.map((p, i) => <Row key={p.id} left={<IconCircle name="flag" />} title={p.title} meta={[p.groupName, placeOf(p) ?? placeOf(groupOf(p))].filter(Boolean).join(" · ")}
          onPress={() => setOpen({ project: p, group: groupOf(p) })} last={i === found.projects.length - 1} />)}
      </Panel></> : null}
      <View style={{ marginTop: 14, marginHorizontal: 4 }}><Meta>{"Only groups and projects their organizers made public, and only a summary: name, place, causes. Never people, tasks or files."}</Meta></View>

      <Sheet open={!!open} onClose={() => setOpen(null)}>
        {open?.group || open?.project ? <>
          <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
            {open.project ? <IconCircle name="flag" size={56} /> : <Logo name={open.group!.name ?? "?"} size={56} image={open.group!.image} />}
            <View style={{ flex: 1 }}><Meta>{open.project ? open.project.groupName : open.group!.kind}</Meta><Text style={[t.row, { fontSize: 19 }]}>{open.project?.title ?? open.group!.name}</Text></View>
          </View>
          {(open.project?.description ?? open.group?.description) ? <View style={{ marginTop: 12 }}><Body>{open.project?.description ?? open.group?.description}</Body></View> : null}
          <Meta>{["\n" + (placeOf(open.group) ?? ""), causeWords(open.project ?? open.group)].filter((x) => x && x.trim()).join(" · ")}</Meta>
          {open.group ? <Buttons><Primary label={onEcosystem ? `Ask to join ${open.group.name}` : "Connect to the Bayanihan Network to ask"} onPress={() => ask(open.group!)} /></Buttons> : null}
          {!onEcosystem ? <Meta>{"Asking to join needs a Bayanihan Network account on this phone. No password; it uses this phone's own key."}</Meta> : null}
        </> : null}
      </Sheet>
      {status === "offline" || status === "down" ? <Buttons><Outline flex label="Where your records live" onPress={() => router.push("/network" as never)} /></Buttons> : null}
      <View style={{ height: 8, backgroundColor: c.wash }} />
    </Screen>
  );
}
