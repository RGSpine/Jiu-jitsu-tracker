export type InstallKind = "android" | "safari" | "ios-chrome" | "ios-edge" | "ios-firefox" | "ios-other";

const PREVIEW: Record<string, InstallKind> = {
  android: "android",
  safari: "safari",
  chrome: "ios-chrome",
  edge: "ios-edge",
  firefox: "ios-firefox",
  outro: "ios-other",
};

export function isIosDevice(userAgent: string, platform = "", touchPoints = 0): boolean {
  if (/iPad|iPhone|iPod/i.test(userAgent)) return true;
  return platform === "MacIntel" && touchPoints > 1;
}

export function classifyInstall(
  userAgent: string,
  options?: { standalone?: boolean; preview?: string | null; platform?: string; touchPoints?: number },
): InstallKind | null {
  if (options?.standalone) return null;
  const preview = options?.preview ? PREVIEW[options.preview] : undefined;
  if (preview) return preview;
  if (!isIosDevice(userAgent, options?.platform, options?.touchPoints)) return null;
  if (/CriOS|CrIOS/i.test(userAgent)) return "ios-chrome";
  if (/EdgiOS/i.test(userAgent)) return "ios-edge";
  if (/FxiOS/i.test(userAgent)) return "ios-firefox";
  if (/Safari/i.test(userAgent)) return "safari";
  return "ios-other";
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return Boolean(nav.standalone)
    || window.matchMedia("(display-mode: standalone)").matches
    || window.matchMedia("(display-mode: fullscreen)").matches;
}
