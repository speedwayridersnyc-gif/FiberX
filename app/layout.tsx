import { asset } from "@/lib/asset";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import "./hw.css";
import "./machines.css";
import { StorageMigrate } from "@/components/legacy/StorageMigrate";

export const metadata: Metadata = {
  title: "Silicon Hall — A Museum of Retro Computers",
  description: "Play with lovingly recreated retro computers. Find the secrets hidden in every machine.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: { title: "Silicon Hall — A Museum of Retro Computers", description: "Boot six classic machines, type on real-feel keyboards, and hunt 300 hidden secrets. Built for dual-screen phones.", images: [{ url: asset("/og-image.png"), width: 1200, height: 630, alt: "Silicon Hall — retro computers on museum pedestals" }], type: "website" },
  twitter: { card: "summary_large_image", title: "Silicon Hall — A Museum of Retro Computers", images: [asset("/og-image.png")] },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0f1522" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Google Tag Manager — fiberxinternet.com */}
        <Script id="gtm-datalayer" strategy="beforeInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
        `}</Script>
        <Script async src="https://www.googletagmanager.com/gtm.js?id=GTM-P3TLCTD3" strategy="beforeInteractive" />
      </head>
      <body><StorageMigrate />{children}</body>
    </html>
  );
}
