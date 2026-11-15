import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { bix, now, type R } from "@/lib/bix";
import { short } from "@/lib/dates";
import { useSession } from "@/lib/session";
import { useLoad } from "@/lib/use";
import { History } from "@/ui/History";
import { shortRef } from "@/lib/work";
import { Avatar, Buttons, Eyebrow, Field, IconCircle, Meta, Notice, Outline, Panel, Pill, Primary, Row, Screen, Sheet , Skeleton} from "@/ui/kit";
import { c, type as t } from "@/ui/theme";
import { useSnackbar } from "@/ui/Snackbar";

/** A need and its offers (sketch: P1 #3). Accepting an offer counts it toward "covered". */
export default function Need() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useSession();
  const me = s.person ? `Person/${s.person.id}` : "";
  const { show } = useSnackbar();
  const setMsg = (m: string | null) => { if (m) show(m); };
  const [offering, setOffering] = useState(false);
  const [amount, setAmount] = useState(""); const [note, setNote] = useState("");
  const { data, reload } = useLoad(async () => {
    const need = await bix.get("Need", id);
    const offers = await bix.search("Offer", { matchedTo: `Need/${id}` });
    const people: Record<string, R> = {};
    for (const o of offers) { const r = o.offeredBy?.reference; if (r?.startsWith("Person/")) { try { people[r] = await bix.get("Person", r.split("/")[1]); } catch {} } }
    const ini = need.initiative ? await bix.get("Initiative", need.initiative.reference.split("/")[1]).catch(() => null) : null;
    return { need, offers, people, ini };
  }, [id]);
  if (!data) return <Screen back><Skeleton /></Screen>;
  const { need, offers, people, ini } = data;
  const lead = s.isLead;
  const unit = need.quantity?.unit ?? "";
  const want = need.quantity?.value ?? 0, got = need.received?.value ?? 0;
  const run = async (...rs: R[]) => { try { await bix.commit(...rs); reload(); } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); } };
  const accept = (o: R) => {
    const v = o.quantity?.value ?? 0; const total = got + v;
    run(bix.next(o, { status: "matched" }), bix.next(need, { received: { value: total, unit: unit || "piece" }, status: want && total >= want ? "met" : total > 0 ? "partially-met" : need.status }));
  };
  const offer = () => {
    const n = Number(amount);
    setOffering(false);
    run(bix.create("Offer", { offeredBy: { reference: me }, partOf: need.initiative, category: need.category, matchedTo: { reference: `Need/${id}` },
      ...(n > 0 ? { quantity: { value: n, unit: unit || "piece" } } : {}), ...(note.trim() ? { description: note.trim() } : {}), availableFrom: now(), status: "available" }));
    setMsg("Thanks! The team will see your offer.");
  };
  return (
    <Screen back>
      <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}><IconCircle name="box" size={56} tone="white" />
        <View style={{ flex: 1 }}><Meta>{[`Need`, ini?.title, shortRef(need)].filter(Boolean).join(" · ")}</Meta><Text style={[t.title, { fontSize: 24 }]}>{need.category?.display}</Text></View></View>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>{need.priority === "urgent" ? <Pill tone="state">Urgent</Pill> : null}{need.neededBy ? <Pill>{`By ${short(need.neededBy)}`}</Pill> : null}</View>
      {want ? <Panel style={{ marginTop: 12 }}><View style={{ paddingVertical: 12 }}><View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={t.row}>Covered</Text><Text>{`${got} of ${want} ${want === 1 ? unit : unit === "box" ? "boxes" : /s$/.test(unit) ? unit : `${unit}s`}`}</Text></View>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: c.wash, marginTop: 8, overflow: "hidden" }}><View style={{ width: `${Math.min(1, got / want) * 100}%`, height: 8, backgroundColor: c.accent }} /></View></View></Panel> : null}
      {need.status !== "met" ? <Buttons><Primary label="I can help with this" onPress={() => setOffering(true)} /></Buttons> : null}
      <Eyebrow right={`${offers.length}`}>Offers</Eyebrow>
      <Panel>{offers.map((o, i) => { const who = o.offeredBy?.reference; const nm = people[who]?.name?.text ?? "Someone";
        return <Row key={o.id} left={<Avatar name={nm} photo={people[who]?.photo} />} title={nm} meta={[o.quantity ? `${o.quantity.value} ${o.quantity.unit}` : null, o.description].filter(Boolean).join(" · ")} last={i === offers.length - 1}
          right={o.status === "matched" ? <Pill tone="ok">Accepted</Pill> : lead ? <Outline label="Accept" onPress={() => accept(o)} /> : <Pill>Offered</Pill>} />; })}
        {!offers.length ? <Row title="No offers yet" meta="Share the project so people can help" last /> : null}</Panel>
      <History type="Need" id={id} version={need.meta.version} />
      <Sheet open={offering} onClose={() => setOffering(false)}>
        <Text style={[t.row, { fontSize: 18 }]}>{`Offer: ${need.category?.display}`}</Text>
        {unit ? <Field label={`How many (${unit})`} value={amount} onChangeText={setAmount} keyboardType="numeric" /> : null}
        <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="e.g. I can drop them off Friday" />
        <Buttons><Primary label="Offer" onPress={offer} /></Buttons>
      </Sheet>
    </Screen>
  );
}
