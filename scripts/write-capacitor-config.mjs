import { readFileSync, writeFileSync } from "node:fs";

const current = JSON.parse(readFileSync(new URL("../capacitor.config.json", import.meta.url), "utf8"));
const appId = process.env.CAPACITOR_APP_ID || current.appId || "com.rgspine.tatame";
const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim();

const next = {
  ...current,
  appId,
  appName: "Tatame",
  webDir: "public",
};

if (serverUrl) {
  next.server = {
    ...current.server,
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
    androidScheme: "https",
  };
} else {
  delete next.server?.url;
  delete next.server?.cleartext;
}

writeFileSync(new URL("../capacitor.config.json", import.meta.url), `${JSON.stringify(next, null, 2)}\n`);
console.log(serverUrl ? `Capacitor aponta para ${serverUrl}` : "Capacitor sem URL remota. Defina CAPACITOR_SERVER_URL antes de publicar.");
