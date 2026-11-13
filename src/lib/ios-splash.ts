import splash from "@/data/ios-splash.json";

export type IosSplash = {
  width: number;
  height: number;
  widthPt: number;
  heightPt: number;
  ratio: number;
};

export const IOS_SPLASH = splash as IosSplash[];

export function iosSplashHref(item: IosSplash): string {
  return `/splash/iphone-${item.width}x${item.height}.png`;
}

export function iosSplashMedia(item: IosSplash): string {
  return `screen and (device-width: ${item.widthPt}px) and (device-height: ${item.heightPt}px) and (-webkit-device-pixel-ratio: ${item.ratio}) and (orientation: portrait)`;
}
