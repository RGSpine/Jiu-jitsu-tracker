import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Outfit } from "next/font/google";
import { ServiceWorker } from "@/components/service-worker";
import { AppProvider } from "@/components/providers";
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
  appleWebApp: { capable: true, title: "Tatame", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${outfit.variable} ${barlow.variable}`} suppressHydrationWarning>
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
