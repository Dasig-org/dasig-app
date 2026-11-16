// Polyfills first: the signing library reads crypto.getRandomValues when it loads.
import "react-native-get-random-values";
import "./src/lib/randomUUID"; // needs getRandomValues, from the line above
import "react-native-url-polyfill/auto";
import "expo-router/entry";
