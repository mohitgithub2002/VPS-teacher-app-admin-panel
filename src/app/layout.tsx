import type { Metadata, Viewport } from "next";
import { Lexend } from "next/font/google";

import { Providers } from "./providers";
import "./globals.css";

/* One family across every surface — Lexend, 300–700. 800 is wordmark only. */
const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Wokka Schools · Admin",
    template: "%s · Wokka Schools Admin",
  },
  description:
    "Admin panel for teacher management: accounts, assignments, syllabus, timetable, pacing and the audit trail.",
};

export const viewport: Viewport = {
  themeColor: "#121010",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={lexend.variable} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
