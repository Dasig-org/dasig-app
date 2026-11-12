import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAccount } from "@/lib/account";
import { IconCircle, LinkText } from "./kit";
import { c, radius, type as t } from "./theme";

const KEY = "dasig.keepwork.dismissed";
/** Home, for a nickname with no way back in (design/account-sketches.html 14): once a week until a method is added. */
export function KeepYourWork() {
  const a = useAccount();
  const [hidden, setHidden] = useState(true);
  useEffect(() => { AsyncStorage.getItem(KEY).then((v) => setHidden(!!v && Date.now() - Number(v) < 7 * 86400000)).catch(() => setHidden(false)); }, []);
  if (hidden || !a.guest) return null;
  return <View style={{ flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: c.sand, borderRadius: radius.panel, padding: 14, marginTop: 12 }}>
    <IconCircle name="lock" tone="white" />
    <Pressable style={{ flex: 1 }} onPress={() => router.push("/account?add=1" as never)}><Text style={t.row}>Keep your work</Text>
      <Text style={[t.meta, { marginTop: 2 }]}>Add a way to sign in, in case you lose this phone.</Text></Pressable>
    <View style={{ alignItems: "flex-end", gap: 6 }}><LinkText onPress={() => router.push("/account?add=1" as never)}>Add</LinkText>
      <Text style={[t.meta, { fontSize: 12 }]} onPress={() => { setHidden(true); AsyncStorage.setItem(KEY, String(Date.now())).catch(() => {}); }}>Not now</Text></View>
  </View>;
}
