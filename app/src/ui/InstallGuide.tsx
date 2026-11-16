import { useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { inAppBrowser, installed } from "@/lib/capabilities";
import { Icon } from "./Icon";
import { LinkText, Meta, Sheet } from "./kit";
import { c, radius, type as t } from "./theme";

/**
 * On the web only: first, if the link opened inside Messenger or Facebook, say to open it in Safari or Chrome (in-app
 * browsers lose sign-ins and can't install). Otherwise, until installed, offer "Add Dasig to your Home Screen" with
 * the steps for this phone. Dismissed for a week at a time. Installing keeps the app's data and opens it full screen.
 */
const KEY = "dasig.install.dismissed";
const ios = () => typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);

export function InstallGuide() {
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);
  const iab = Platform.OS === "web" && inAppBrowser();
  useEffect(() => {
    if (Platform.OS !== "web" || installed()) return;
    AsyncStorage.getItem(KEY).then((v) => setShow(iab || !v || Date.now() - Number(v) > 7 * 86400000)).catch(() => setShow(true));
  }, [iab]);
  if (!show) return null;
  const dismiss = () => { AsyncStorage.setItem(KEY, String(Date.now())); setShow(false); };
  return <>
    <View style={{ marginTop: 12, backgroundColor: c.white, borderRadius: radius.panel, padding: 14, flexDirection: "row", gap: 12, alignItems: "center" }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.sand, alignItems: "center", justifyContent: "center" }}><Icon name={iab ? "link" : "download"} size={20} /></View>
      <View style={{ flex: 1 }}>
        <Text style={t.row}>{iab ? "Open Dasig in your browser" : "Add Dasig to your Home Screen"}</Text>
        <Meta>{iab ? `Tap ••• then “Open in ${ios() ? "Safari" : "Chrome"}”, so you stay signed in.` : "It opens like an app, works with weak signal, and keeps you signed in."}</Meta>
        <View style={{ flexDirection: "row", gap: 16, marginTop: 4 }}>{iab ? null : <LinkText onPress={() => setOpen(true)}>Show me how</LinkText>}{iab ? null : <LinkText onPress={dismiss}>Not now</LinkText>}</View>
      </View>
    </View>
    <Sheet open={open} onClose={() => setOpen(false)}>
      <Text style={[t.row, { fontSize: 18, marginBottom: 10 }]}>Add Dasig to your Home Screen</Text>
      {(ios() ? ["In Safari, tap the Share button (the square with an arrow).", "Scroll and tap “Add to Home Screen”.", "Tap “Add”. Open Dasig from its new icon."]
        : ["In Chrome, tap the ⋮ menu.", "Tap “Add to Home screen” or “Install app”.", "Open Dasig from its new icon."]).map((x, i) =>
        <View key={i} style={{ flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 8 }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.accent, alignItems: "center", justifyContent: "center" }}><Text style={{ color: c.white, fontWeight: "700" }}>{i + 1}</Text></View>
          <Text style={[t.body, { flex: 1 }]}>{x}</Text></View>)}
      <Meta>{"\nOnce it's on your Home Screen, your sign-in and anything waiting to sync are kept safe."}</Meta>
    </Sheet>
  </>;
}
