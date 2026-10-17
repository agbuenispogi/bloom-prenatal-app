import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

// Fonts and palette are placeholders until the Phase 4 design pass (Impeccable).
const sans = Geist({ variable: "--font-sans-ui", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bloom",
  description: "Prenatal medication companion",
  appleWebApp: { capable: true, title: "Bloom", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
