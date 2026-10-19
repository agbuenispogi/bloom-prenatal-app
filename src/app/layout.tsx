import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";

// The Baby Snowflake pair: Fredoka for rounded headings, Nunito for everything else.
const display = Fredoka({ variable: "--font-display", subsets: ["latin"] });
const ui = Nunito({ variable: "--font-ui", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bloom",
  description: "Prenatal medication companion",
  appleWebApp: { capable: true, title: "Bloom", statusBarStyle: "default" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fffbfd" },
    { media: "(prefers-color-scheme: dark)", color: "#241c29" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${ui.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
