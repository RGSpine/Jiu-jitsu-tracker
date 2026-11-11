const NAMES: Record<string, string> = {
  "audio/mp4": "rola.mp4",
  "video/mp4": "rola.mp4",
  "audio/m4a": "rola.m4a",
  "audio/x-m4a": "rola.m4a",
  "audio/aac": "rola.aac",
  "audio/mpeg": "rola.mp3",
  "audio/mp3": "rola.mp3",
  "audio/wav": "rola.wav",
  "audio/x-wav": "rola.wav",
  "audio/ogg": "rola.ogg",
  "audio/webm": "rola.webm",
  "video/webm": "rola.webm",
};

export function audioFileName(mime: string): string {
  const base = mime.split(";")[0]?.trim().toLowerCase() ?? "";
  return NAMES[base] ?? "rola.webm";
}

/** iOS Safari grava AAC em MP4. WebM fica para o Chromium, onde é o padrão. */
export function preferredAudioMime(supported: (type: string) => boolean, ios: boolean): string | undefined {
  const order = ios
    ? ["audio/mp4", "audio/aac", "audio/webm;codecs=opus", "audio/webm"]
    : ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return order.find((type) => {
    try {
      return supported(type);
    } catch {
      return false;
    }
  });
}

export function isIosUserAgent(userAgent: string): boolean {
  return /iPad|iPhone|iPod/i.test(userAgent);
}
