import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

// Self-hosted at build time by next/font; the theme's --font-sans reads these variables.
const geist = Geist({ subsets: ["latin", "latin-ext"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin", "latin-ext"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  applicationName: "mRadar",
  title: "mRadar — city reports",
  description: "Report city problems and follow the response.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geist.variable} ${geistMono.variable}`}>
      <body className="bg-background-subtle antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
