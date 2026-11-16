import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { getConnection } from "@/lib/connection";
import { networkUrl } from "@/lib/env";
import { Field, Meta } from "./kit";
import { c, radius, type as t } from "./theme";

/**
 * Where a group or event is: type, then pick a Philippine place (PSGC) from the server's list, or keep what you typed.
 * The text is saved as bayanihan:place-text (as before) and the chosen place's code as bayanihan:psgc.
 * Places come from the PSA's PSGC via the open-source barangay project (MIT); see the server's PSGC_NOTICE.md.
 */
const KIND: Record<string, string> = { city: "City", province: "Province", municipality: "Town", barangay: "Barangay", submunicipality: "District" };
export type PlaceValue = { text: string; code?: string };
export const placeExtensions = (v: PlaceValue) => [
  ...(v.text.trim() ? [{ url: "bayanihan:place-text", value: v.text.trim() }] : []),
  ...(v.code && v.text.trim() ? [{ url: "bayanihan:psgc", value: v.code }] : []),
];

export function PlaceField({ label, value, onChange, placeholder }: { label: string; value: PlaceValue; onChange: (v: PlaceValue) => void; placeholder?: string }) {
  const [hits, setHits] = useState<{ code: string; name: string; kind: string; label: string }[]>([]);
  const [open, setOpen] = useState(false);
  // Suggestions only while typing a place (3 letters or more) that isn't already one from the list.
  const q = value.text.trim();
  const searching = open && q.length >= 3 && !value.code;
  useEffect(() => {
    if (!searching) return;
    let live = true;
    const h = setTimeout(async () => {
      const conn = await getConnection();
      const base = conn.kind === "ecosystem" || conn.kind === "hub" ? conn.url : networkUrl;
      try { const r = await fetch(`${base.replace(/\/$/, "")}/$places?q=${encodeURIComponent(q)}&limit=6`); if (r.ok && live) setHits((await r.json()).entry ?? []); } catch { if (live) setHits([]); }
    }, 250);
    return () => { live = false; clearTimeout(h); };
  }, [q, searching]);
  return <View>
    <Field label={label} value={value.text} placeholder={placeholder} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 200)}
      onChangeText={(text) => onChange({ text })} />
    {searching && hits.length ? <View style={{ backgroundColor: c.white, borderRadius: radius.inner, marginTop: 6, paddingVertical: 4 }}>
      {hits.map((p) => <Pressable key={p.code} onPress={() => { onChange({ text: p.label, code: p.code }); setHits([]); setOpen(false); }} accessibilityRole="button"
        style={{ paddingVertical: 10, paddingHorizontal: 14 }}><Text style={t.row}>{p.name}</Text><Meta>{[KIND[p.kind] ?? "", ...p.label.split(", ").slice(1)].filter(Boolean).join(" · ")}</Meta></Pressable>)}
    </View> : null}
    {value.code ? <Meta>{"  ✓ A place in the Philippines' official list (PSGC)"}</Meta> : null}
  </View>;
}
