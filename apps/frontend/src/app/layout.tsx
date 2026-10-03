import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart City",
  description: "Projekt hackathonowy Smart City",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <body className="bg-background-subtle dark:bg-background">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
