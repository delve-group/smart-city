import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart City",
  description: "Smart City hackathon project",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background-subtle dark:bg-background">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
