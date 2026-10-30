// On the web the browser already keeps the focused field in view.
import type { ReactNode } from "react";
import { ScrollView, View, type ViewProps } from "react-native";
export const KProvider = ({ children }: { children: ReactNode }) => <>{children}</>;
export const KScroll = ScrollView;
export const KSticky = ({ offset: _o, ...p }: ViewProps & { offset?: unknown }) => <View {...p} />;
