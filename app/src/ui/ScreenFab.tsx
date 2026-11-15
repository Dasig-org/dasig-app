import { useEffect, useState } from "react";
import { useIsFocused, useSegments } from "expo-router";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AddSheet, type AddContext } from "./AddSheet";
import { useBayani, type Here } from "./Bayani";
import { Fab } from "./Fab";

/**
 * The round button every pushed Screen draws bottom right (given to `Screen` by the root layout through
 * `ScreenButton`, so kit doesn't import it back). With an `add` context it is "+" and opens that sheet, which ends with
 * "Ask Bayani"; without one it is the Bayani spark and opens Bayani directly. In the tabs the tab layout draws it.
 * It also tells Bayani what the screen in front shows (`here`).
 */
export function ScreenFab({ here, add, lifted }: { here?: Here; add?: AddContext; lifted?: boolean }) {
  const bayani = useBayani();
  const focused = useIsFocused();
  const inTabs = useSegments()[0] === "(tabs)";
  const inset = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  useEffect(() => { if (focused) bayani.register(here); }, [focused, here, bayani]);
  if (inTabs || !focused) return null;
  const style = { position: "absolute" as const, right: Math.max(18, (width - 520) / 2 + 18), bottom: (lifted ? 96 : 16) + inset.bottom };
  return <>
    {add ? <><Fab onPress={() => setOpen(true)} style={style} /><AddSheet open={open} onClose={() => setOpen(false)} ctx={add} onAsk={() => { setOpen(false); setTimeout(bayani.open, 260); }} /></>
      : <Fab icon="spark" label="Ask Bayani" onPress={bayani.open} style={style} />}
  </>;
}
