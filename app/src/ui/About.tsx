import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Platform, Text, View } from "react-native";
import { Body, Buttons, Eyebrow, IconCircle, Meta, Outline, Panel, Row, Screen, Title } from "@/ui/kit";
import type { IconName } from "@/ui/Icon";
import { c, radius, type as t } from "@/ui/theme";
import { BixMap } from "@/ui/BixMap";

/*
 * About: what's open, who makes it, and why. Reached from Me → About; never shown in the way of the work.
 * Wording matches bayanihan.dasig.org (/about, /docs/bix, /bayani): licences take effect when the code is published,
 * BIX is a draft, Bayani is in development. Keep these in step with the site.
 */
const SITE = "https://bayanihan.dasig.org";
export const openSite = (path: string) => {
  const url = `${SITE}${path}`;
  if (Platform.OS === "web" && typeof window !== "undefined") window.open(url, "_blank", "noopener");
  else WebBrowser.openBrowserAsync(url).catch(() => {});
};

type Section = { h: string; p?: string; rows?: { icon: IconName; title: string; meta: string }[] };
type Topic = { icon: IconName; name: string; tag: string; line: string; web: { label: string; path: string }; sections: Section[] };

export const TOPICS: Record<string, Topic> = {
  bix: {
    icon: "book", name: "BIX", tag: "Open standard · draft v0.1",
    line: "The Bayanihan Information Exchange: one shared way to write down civic work, so records can move between groups, apps and offices.",
    web: { label: "Read BIX in full on bayanihan.dasig.org", path: "/docs/bix" },
    sections: [
      { h: "What it is", p: "BIX is an open standard for the work volunteer groups do. It describes the things every group deals with, such as a project, a task, a volunteer's role or a need for supplies, in the same way everywhere. Any app that speaks BIX can read and write the same records." },
      { h: "Why it matters", rows: [
        { icon: "lock", title: "Your record is yours", meta: "A volunteer keeps a signed record of what they did, across every group, wherever they go next" },
        { icon: "swap", title: "Groups aren't locked in", meta: "A group can change apps or run its own server and keep its whole history" },
        { icon: "link", title: "Groups can work together", meta: "Partner groups, chapters and federations see the same work in the same shape" },
        { icon: "building", title: "Ready for offices and funders", meta: "LGUs, schools and foundations can receive confirmed work and counts without retyping reports" },
      ] },
      { h: "What it describes", rows: [
        { icon: "users", title: "People and groups", meta: "Person, Organization, Role (core team or volunteer), Position, Team (committees)" },
        { icon: "flag", title: "The work", meta: "Initiative (programs and projects), Task with its steps and gates, saved ways of working" },
        { icon: "box", title: "Needs and offers", meta: "What a project needs, what people offer, and what was received" },
        { icon: "check", title: "Decisions", meta: "Votes and their results, so a group can show how it decided" },
        { icon: "receipt", title: "Reports and goals", meta: "Figures counted from confirmed work, and shared goals groups can join" },
        { icon: "pending", title: "Provenance", meta: "Who did what, when, and who confirmed it" },
      ] },
      { h: "How records can be trusted", rows: [
        { icon: "lock", title: "Signed by the group", meta: "Finished work is signed with the group's key, so anyone can check it hasn't changed" },
        { icon: "users", title: "People decide", meta: "Proposals, including anything an AI suggests, stay drafts until someone with the right role commits them" },
        { icon: "eye", title: "Sharing is set on every record", meta: "Private, the group, partners, or public. Photos of children never leave the group" },
        { icon: "download", title: "No blockchain", meta: "Blockchain's cryptography without its permanence, so a person can still have their data deleted" },
      ] },
      { h: "What it could make possible", p: "A volunteer's hours recognised by a school or employer. A barangay seeing which groups are already helping, and where. Disaster responders sharing one list of needs. A foundation counting what many small groups achieved together. These are starting points, not limits." },
      { h: "Where it comes from", p: "BIX follows the pattern of FHIR, the standard health care uses to share records: resources, references, lifecycles and a standard API. It is developed by Dasig Inc. and shaped by the groups in the pilot, who are credited with their permission. It is meant to be governed together with the organizations that use it." },
    ],
  },
  bayanihan: {
    icon: "heart", name: "Bayanihan", tag: "Open foundations",
    line: "The open parts underneath Dasig, named for the Filipino tradition of a community lifting a neighbour's house together.",
    web: { label: "About Bayanihan on bayanihan.dasig.org", path: "/about" },
    sections: [
      { h: "What's in it", rows: [
        { icon: "book", title: "BIX", meta: "The open standard for civic work records" },
        { icon: "check", title: "Bayanihan Core", meta: "The rules engine: lifecycles, permissions, signatures, counting votes" },
        { icon: "building", title: "Bayanihan Server", meta: "Stores BIX records and runs on a phone, a hub or online, like the Dasig Ecosystem" },
      ] },
      { h: "Why open", p: "Records of community work should belong to the volunteers and groups who did it, not to any one company. Open foundations mean a group can keep its history, run its own server, or build its own tools, and still work with everyone else." },
      { h: "Licences", p: "These are the licences we've chosen. They take effect when the code is published with the first release." },
    ],
  },
  bayani: {
    icon: "spark", name: "Bayani", tag: "In development · runs on the phone",
    line: "A small language model for volunteer work. It suggests; people decide.",
    web: { label: "About Bayani on bayanihan.dasig.org", path: "/bayani" },
    sections: [
      { h: "What it will do", rows: [
        { icon: "check", title: "Break down the work", meta: "Suggest the smaller steps a task needs, and what has to happen first" },
        { icon: "users", title: "Suggest who to ask", meta: "From your roster, spreading the work instead of asking the same person" },
        { icon: "send", title: "Turn messages into drafts", meta: "Offers and can't-make-its from the group chat, in Filipino and English" },
        { icon: "book", title: "Draft the report", meta: "From confirmed work, for a lead to check" },
      ] },
      { h: "How it stays safe", p: "Bayani never changes a record on its own. Every suggestion is a BIX draft that Bayanihan Core checks and a person accepts. It runs on the phone, needs no data plan, and pilot groups decide whether their messages help it learn." },
    ],
  },
  dasig: {
    icon: "users", name: "The Dasig app", tag: "For volunteers and organizations",
    line: "The app you're using: groups, teams, tasks and the record of who helped, on one phone or many.",
    web: { label: "Get started on bayanihan.dasig.org", path: "/docs" },
    sections: [
      { h: "Made by Dasig Inc.", p: "Dasig Inc. makes this app and runs the Dasig Ecosystem. It also runs Dasig Fundraising on dasig.org; raising money stays there, and coordinating the work lives here." },
      { h: "Open, with a protected name", p: "The app's code is being released as open source. \u201cDasig\u201d and the hands emblem are trademarks of Dasig Inc., the way Firefox is Mozilla's: anyone can use the code, but only Dasig Inc. ships it as Dasig." },
      { h: "Where to read more", rows: [
        { icon: "users", title: "Volunteering with Dasig", meta: "bayanihan.dasig.org/docs/volunteering" },
        { icon: "flag", title: "Starting a group", meta: "bayanihan.dasig.org/docs/start-a-group" },
        { icon: "lock", title: "Trust, privacy and safety", meta: "bayanihan.dasig.org/trust" },
      ] },
    ],
  },
};
const ORDER = ["bix", "bayanihan", "bayani", "dasig"] as const;
const DASIG_LINKS: Record<string, string> = { "Volunteering with Dasig": "/docs/volunteering", "Starting a group": "/docs/start-a-group", "Trust, privacy and safety": "/trust" };

/** About, the overview: why Dasig Inc. shares these, then one row per part. */
export function AboutHome() {
  return (
    <Screen back>
      <Title sub="Open source contributions from Dasig Inc.">About Dasig</Title>
      <View style={{ backgroundColor: c.sand, borderRadius: radius.panel, padding: 16, marginTop: 6 }}>
        <Text style={[t.row, { fontSize: 16 }]}>Why we share these</Text>
        <View style={{ marginTop: 6 }}><Body>{"We want every volunteer to keep a record of what they did, and every organization to keep a record of its work, without depending on any one app or company, including ours.\n\nShared, open foundations are also groundwork for organizations, governments and volunteer communities to work together. What people build on them is up to them."}</Body></View>
      </View>
      <Eyebrow>What's inside</Eyebrow>
      <Panel>{ORDER.map((k, i) => { const x = TOPICS[k]!;
        return <Row key={k} left={<IconCircle name={x.icon} />} title={x.name} meta={x.tag} onPress={() => router.push(`/about/${k}` as never)} last={i === ORDER.length - 1} />; })}</Panel>
      <Buttons><Outline flex label="bayanihan.dasig.org" onPress={() => openSite("/about")} /></Buttons>
    </Screen>
  );
}

/** One part, in full. */
export function AboutTopic() {
  const { topic } = useLocalSearchParams<{ topic: string }>();
  const x = TOPICS[topic ?? ""];
  const [map, setMap] = useState(false);
  if (!x) return <Screen back><Title>About</Title></Screen>;
  return (
    <Screen back>
      <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}><IconCircle name={x.icon} size={56} tone="white" />
        <View style={{ flex: 1 }}><Meta>{x.tag}</Meta><Text style={[t.title, { fontSize: 26 }]}>{x.name}</Text></View></View>
      <View style={{ marginTop: 10 }}><Body>{x.line}</Body></View>
      {x.sections.map((sct) => <View key={sct.h}>
        <Eyebrow>{sct.h}</Eyebrow>
        {sct.p ? <View style={{ backgroundColor: c.white, borderRadius: radius.panel, padding: 16 }}><Body>{sct.p}</Body></View> : null}
        {sct.rows ? <Panel>{sct.rows.map((r, i) => <Row key={r.title} left={<IconCircle name={r.icon} />} title={r.title} meta={r.meta} last={i === sct.rows!.length - 1}
          onPress={topic === "dasig" && DASIG_LINKS[r.title] ? () => openSite(DASIG_LINKS[r.title]!) : undefined} />)}</Panel> : null}
      </View>)}
      {/* The map wraps up: folded by default so it never pushes the explanation down. */}
      {topic === "bix" ? <><Eyebrow>How it fits together</Eyebrow>
        <Panel><Row left={<IconCircle name="link" />} title={map ? "Hide the map" : "See it as a map"} meta="Tap each part to see what it connects to" onPress={() => setMap(!map)} last /></Panel>
        {map ? <View style={{ marginTop: 10 }}><BixMap /></View> : null}</> : null}
      <Buttons><Outline flex label={x.web.label} onPress={() => openSite(x.web.path)} /></Buttons>
    </Screen>
  );
}
