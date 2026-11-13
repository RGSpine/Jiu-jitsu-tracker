import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Outfit } from "next/font/google";
import { ServiceWorker } from "@/components/service-worker";
import { AppProvider } from "@/components/providers";
import { iosSplashHref, iosSplashMedia, IOS_SPLASH } from "@/lib/ios-splash";
import Script from "next/script";
import { Suspense } from "react";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-barlow",
});

export const metadata: Metadata = {
  title: { default: "Tatame", template: "%s · Tatame" },
  description: "Diário de treinos de jiu-jitsu. Anote os rolas, as finalizações e acompanhe a evolução.",
  applicationName: "Tatame",
  appleWebApp: { capable: true, title: "Tatame", statusBarStyle: "black-translucent" },
  icons: { apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }] },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${outfit.variable} ${barlow.variable}`} suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        {IOS_SPLASH.map((item) => (
          <link key={iosSplashHref(item)} rel="apple-touch-startup-image" href={iosSplashHref(item)} media={iosSplashMedia(item)} />
        ))}
      </head>
      <body>
        <Script id="tatame-theme" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem("tatame.theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`}
        </Script>
        <AppProvider>
          <Suspense fallback={<div className="stage"><div className="phone" /></div>}>
            {children}
          </Suspense>
          <ServiceWorker />
        </AppProvider>
      </body>
    </html>
  );
}
