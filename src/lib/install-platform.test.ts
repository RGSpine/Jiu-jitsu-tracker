import { describe, expect, it } from "vitest";
import { audioFileName, preferredAudioMime } from "@/lib/audio-file";
import { classifyInstall } from "@/lib/install-platform";

const SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";
const CHROME = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1";
const FIREFOX = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/128.0 Mobile/15E148 Safari/605.1.15";
const EDGE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/126.0.2592.56 Version/18.0 Mobile/15E148 Safari/604.1";

describe("instalação", () => {
  it("separa Safari, Chrome, Edge e Firefox no iPhone", () => {
    expect(classifyInstall(SAFARI)).toBe("safari");
    expect(classifyInstall(CHROME)).toBe("ios-chrome");
    expect(classifyInstall(EDGE)).toBe("ios-edge");
    expect(classifyInstall(FIREFOX)).toBe("ios-firefox");
  });

  it("esconde o aviso quando já está instalado e no desktop sem preview", () => {
    expect(classifyInstall(SAFARI, { standalone: true })).toBeNull();
    expect(classifyInstall("Mozilla/5.0 (X11; Linux x86_64) Chrome/128.0.0.0")).toBeNull();
  });

  it("trata iPad que se identifica como Mac", () => {
    expect(classifyInstall("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.5 Safari/605.1.15", {
      platform: "MacIntel",
      touchPoints: 5,
    })).toBe("safari");
  });
});

describe("áudio", () => {
  it("nomeia mp4 no iOS e webm no Chromium", () => {
    expect(audioFileName("audio/mp4")).toBe("rola.mp4");
    expect(audioFileName("audio/webm;codecs=opus")).toBe("rola.webm");
    const ios = preferredAudioMime((type) => type === "audio/mp4" || type.startsWith("audio/webm"), true);
    const desktop = preferredAudioMime((type) => type === "audio/mp4" || type.startsWith("audio/webm"), false);
    expect(ios).toBe("audio/mp4");
    expect(desktop).toBe("audio/webm;codecs=opus");
  });
});
