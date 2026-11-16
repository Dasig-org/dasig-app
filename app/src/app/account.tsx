import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Platform, Pressable, Text, View } from "react-native";
import { useAccount } from "@/lib/account";
import { dasigAccountAvailable, startDasigSignIn } from "@/lib/dasig-account";
import { useSession } from "@/lib/session";
import { linkGoogle, METHOD_LABEL, removeMethod, signOutDevice } from "@/lib/signin";
import { handleProblem, setFindable, setHandle } from "@/lib/invites";
import { Buttons, Eyebrow, Field, IconCircle, LinkText, Notice, Outline, Panel, Primary, Row, Sand, Screen, Sheet, Skeleton, Title } from "@/ui/kit";
import { Icon } from "@/ui/Icon";
import { MethodIcon } from "@/ui/SignIn";
import { SignInMethods } from "@/ui/SignInMethods";
import { c, radius, type as t } from "@/ui/theme";
import { useSnackbar } from "@/ui/Snackbar";

const since = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });

/*
 * Your account (design/account-sketches.html 9, 10, 12): the ways to sign in, each with its email; adding one while
 * signed in; the phones and browsers signed in, with remote sign-out; and signing out here. The last way to sign in
 * can't be removed, nor the one this device signed in with.
 */
export default function AccountScreen() {
  const s = useSession();
  const a = useAccount();
  const { add } = useLocalSearchParams<{ add?: string }>();
  const [adding, setAdding] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const { show } = useSnackbar();
  const setMsg = (m: string | null) => { if (m) show(m); };
  const [naming, setNaming] = useState<string | null>(null);
  const handle = (s.person as any)?.handle as { value: string; findable?: boolean } | undefined;
  const saveHandle = async () => { const v = (naming ?? "").trim().toLowerCase().replace(/^@/, ""); const why = v ? handleProblem(v) : null; if (why) { setMsg(why); return; }
    await run(async () => { await setHandle(v || null); await s.refresh(); setNaming(null); }, v ? `Your username is @${v}.` : "Username removed."); };
  // Opened with ?add=1: show "add a way to sign in" once the account has loaded.
  const [autoAdded, setAutoAdded] = useState(false);
  if (!autoAdded && add === "1" && a.loaded && a.onNetwork) { setAutoAdded(true); setAdding(true); }
  const web = Platform.OS === "web";
  const run = async (f: () => Promise<unknown>, ok?: string) => { setMsg(null); try { await f(); if (ok) setMsg(ok); await a.reload(); } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); } };
  const out = async () => { setLeaving(false); await s.signOut(); router.replace("/start" as never); };

  // Off the network there's no account to add to: signing in moves you onto it, keeping your records.
  if (a.loaded && !a.onNetwork) return (
    <Screen back>
      <Title sub="This phone keeps your records on its own. Sign in to keep them on the Bayanihan Network too, and get back in from anywhere.">Your account</Title>
      <SignInMethods then="/account" onNickname={() => router.back()} />
    </Screen>
  );
  if (!a.acct) return <Screen back>{a.loaded ? <Notice>Couldn&apos;t load your account. Pull down to try again, or check your internet.</Notice> : <Skeleton />}</Screen>;
  const { methods, devices, via, can } = a.acct;
  const hereMethod = methods.find((m) => m.provider === via);
  const canRemove = (m: (typeof methods)[number]) => methods.length > 1 && m !== hereMethod;
  const has = (p: string) => methods.some((m) => m.provider === p);
  const addable = [
    can.google ? { via: "google", title: "Google", meta: has("google") ? "Already added" : "Your Google account", go: () => linkGoogle() } : null,
    can.email ? { via: "email", title: "Email", meta: "A code each time", go: async () => { router.push("/signin-email?link=1" as never); } } : null,
    can.dasig && dasigAccountAvailable ? { via: "dasig", title: "Dasig.org", meta: has("dasig") ? "Already added" : "Your dasig.org account", go: async () => {
      if (Platform.OS === "web") return startDasigSignIn("/account", true);
      const [{ dasigIdTokenNative }, { networkSignIn }, { networkUrl }] = await Promise.all([import("@/lib/dasig-account"), import("@/lib/ecosystem"), import("@/lib/env")]);
      await networkSignIn(networkUrl.replace(/\/$/, ""), null, "/$oidc", { provider: "dasig", idToken: await dasigIdTokenNative() }, true);
    } } : null,
  ].filter(Boolean) as { via: string; title: string; meta: string; go: () => Promise<unknown> }[];
  const backIn = methods.map((m) => `${METHOD_LABEL[m.provider] ?? m.provider}${m.email ? ` (${m.email})` : ""}`).join(" or ");
  return (
    <Screen back onRefresh={a.reload}>
      <Title sub="On the Bayanihan Network. Any of these gets you in.">Your account</Title>
      {/* Username (BIX Person.handle): optional, for being invited by name. */}
      <Eyebrow>Username</Eyebrow>
      <Panel>
        <Row left={<IconCircle name="at" />} title={handle ? `@${handle.value}` : "Pick a username"} meta={handle ? "People can invite you with it" : "So people can invite you by name, e.g. @ana.cebu"}
          onPress={() => setNaming(handle?.value ?? "")} last={!handle} />
        {handle ? <Row left={<IconCircle name="eye" />} title="Let people invite me by username" meta={handle.findable === false ? "Off: only exact invites by email or in your groups" : "On: found only by the exact username"}
          right={<Outline label={handle.findable === false ? "Turn on" : "Turn off"} onPress={() => run(async () => { await setFindable(handle.findable === false); await s.refresh(); })} />} last /> : null}
      </Panel>
      {a.guest ? <View style={{ marginBottom: 6 }}><Sand><View style={{ flex: 1 }}><Text style={t.row}>Keep your work</Text>
        <Text style={[t.meta, { marginTop: 4 }]}>{`You're using a nickname. Add a way to sign in so you can get back in if you lose this ${web ? "browser" : "phone"}.`}</Text>
        <Buttons><Primary label="Add a way to sign in" onPress={() => setAdding(true)} /></Buttons></View></Sand></View> : <>
        <Eyebrow right={`${methods.length}`}>Ways to sign in</Eyebrow>
        <Panel>{methods.map((m, i) => <Row key={`${m.provider}${m.subject ?? ""}`} left={<MethodIcon via={m.provider} size={40} />} title={METHOD_LABEL[m.provider] ?? m.provider}
          meta={[m.email, m === hereMethod ? `used on this ${web ? "browser" : "phone"}` : null].filter(Boolean).join(" · ") || `Added ${since(m.since)}`} last={i === methods.length - 1}
          right={canRemove(m) ? <LinkText onPress={() => run(() => removeMethod(m.provider, m.subject), `${METHOD_LABEL[m.provider]} removed.`)}>Remove</LinkText> : undefined} />)}</Panel>
      </>}
      {!a.guest ? <Pressable accessibilityRole="button" onPress={() => setAdding(true)} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, marginTop: 10, borderRadius: radius.panel, backgroundColor: c.sand }}>
        <Icon name="plus" size={22} color={c.accent} /><Text style={[t.row, { fontSize: 14 }]}>Add a way to sign in</Text></Pressable> : null}
      {devices.length ? <><Eyebrow>Signed in on</Eyebrow>
        <Panel>{devices.map((d, i) => <Row key={d.id} left={<IconCircle name={/android|iphone|ipad|phone/i.test(d.name ?? "") ? "phone" : "laptop"} />} title={d.current ? `${d.name ?? "This device"} · this one` : d.name ?? "A phone or browser"}
          meta={`${d.via ? `${METHOD_LABEL[d.via] ?? d.via} · ` : ""}since ${since(d.since)}`} last={i === devices.length - 1}
          right={d.current ? undefined : <LinkText onPress={() => run(() => signOutDevice(d.id), "Signed out there.")}>Sign out</LinkText>} />)}</Panel></> : null}
      <Buttons><Outline flex label="Sign out" onPress={() => setLeaving(true)} /></Buttons>

      <Sheet open={naming !== null} onClose={() => setNaming(null)}>
        <Text style={[t.row, { fontSize: 18 }]}>{handle ? "Change your username" : "Pick a username"}</Text>
        <Text style={[t.meta, { marginTop: 4 }]}>3 to 20 lowercase letters, numbers, dots and underscores. You can change it once every 30 days.</Text>
        <Field value={naming ?? ""} onChangeText={(v) => setNaming(v.toLowerCase().replace(/\s/g, ""))} placeholder="ana.cebu" autoCapitalize="none" autoCorrect={false} autoFocus onSubmitEditing={saveHandle} />
        <Buttons><Primary label="Save" onPress={saveHandle} />{handle ? <Outline label="Remove" onPress={() => { setNaming(""); setTimeout(saveHandle, 0); }} /> : null}</Buttons>
      </Sheet>
      <Sheet open={adding} onClose={() => setAdding(false)}>
        <Text style={[t.row, { fontSize: 18 }]}>Add a way to sign in</Text>
        <Text style={[t.meta, { marginTop: 4, marginBottom: 10 }]}>It joins this account. Your groups and story stay the same.</Text>
        <Panel style={{ backgroundColor: c.wash }}>{addable.map((m, i) => <Row key={m.via} left={<MethodIcon via={m.via} size={40} />} title={m.title} meta={m.meta} last={i === addable.length - 1}
          right={has(m.via) && m.via !== "email" ? <Icon name="check" color={c.accent} /> : undefined}
          onPress={has(m.via) && m.via !== "email" ? undefined : () => { setAdding(false); run(m.go, !web && m.via !== "email" ? `${m.title} added.` : undefined); }} />)}</Panel>
        <Text style={[t.meta, { marginTop: 10, marginLeft: 4 }]}>Apple and Facebook are coming.</Text>
      </Sheet>
      <Sheet open={leaving} onClose={() => setLeaving(false)}>
        <Text style={[t.row, { fontSize: 18 }]}>Sign out?</Text>
        <Text style={[t.meta, { marginTop: 6 }]}>{a.guest ? `You're using a nickname, so there's no way back into this account after signing out. Add a way to sign in first to keep it.`
          : `Sign back in any time with ${backIn}. Anything not yet saved online stays on this ${web ? "browser" : "phone"} until you're back.`}</Text>
        <Buttons>{a.guest ? <Primary label="Add a way to sign in" onPress={() => { setLeaving(false); setAdding(true); }} /> : <Outline flex label="Stay signed in" onPress={() => setLeaving(false)} />}
          {a.guest ? <Outline flex label="Sign out" onPress={out} /> : <Primary label="Sign out" onPress={out} />}</Buttons>
      </Sheet>
    </Screen>
  );
}
