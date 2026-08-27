import type { Metadata, Viewport } from "next";
import { Inter, Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Inter_Tight({
  variable: "--ff-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const sans = Inter({
  variable: "--ff-sans",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--ff-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const SITE = "https://lyricscape.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "LYRICSCAPE — Music, but visual.",
    template: "%s — LYRICSCAPE",
  },
  description:
    "An immersive cinematic lyrics experience. Apple Music playback, synchronized lyrics, typography and WebGL scenes combined into one interactive music film.",
  applicationName: "LYRICSCAPE",
  keywords: ["lyrics", "Apple Music", "MusicKit", "WebGL", "cinematic", "music visualizer"],
  authors: [{ name: "LYRICSCAPE" }],
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "LYRICSCAPE — Music, but visual.",
    description:
      "An immersive cinematic lyrics experience combining Apple Music playback, synced lyrics and WebGL.",
    url: SITE,
    siteName: "LYRICSCAPE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LYRICSCAPE — Music, but visual.",
    description: "An immersive cinematic lyrics experience.",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-void text-ink">{children}</body>
    </html>
  );
}
