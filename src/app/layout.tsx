import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Young_Serif } from "next/font/google";
import "./globals.css";

// Young Serif: the journal's handset headings. Atkinson Hyperlegible Next: UI and numerals, legible at 1 AM.
const display = Young_Serif({ variable: "--font-display", weight: "400", subsets: ["latin"] });
const ui = Atkinson_Hyperlegible_Next({ variable: "--font-ui", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bloom",
  description: "Prenatal medication companion",
  appleWebApp: { capable: true, title: "Bloom", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4ecdf" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1719" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${ui.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
