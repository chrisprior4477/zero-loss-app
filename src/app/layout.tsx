import type { Metadata } from "next";
import { Archivo, DM_Mono, Instrument_Serif } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

/* Type stack from the Checkpoint 2 design (C5). Archivo carries the UI,
   Instrument Serif is reserved for editorial accents, DM Mono for metadata
   and numeric labels. */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000"),
  ),
  title: {
    default: "ZeroLoss",
    template: "%s · ZeroLoss",
  },
  description:
    "ZeroLoss — a calmer way to shop with marketplace energy, built for trust and clarity.",
  openGraph: {
    type: "website",
    title: "Zero Loss",
    description:
      "Real shots. Real wins. Zero loss. Pay $1 for a real shot at a product—what you spent still counts.",
    siteName: "Zero Loss",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zero Loss",
    description:
      "Real shots. Real wins. Zero loss. Pay $1 for a real shot at a product—what you spent still counts.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${instrumentSerif.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
