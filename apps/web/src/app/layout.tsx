import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import { QueryProviders } from "@/components/QueryProviders";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Stellar Orbit - BAF Community Progress",
  description:
    "Ambassador progress, reputation, events, and rewards for the Blockchain Ambassador Foundation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} font-[family-name:var(--font-space-grotesk)] min-h-screen`}
      >
        <QueryProviders>{children}</QueryProviders>
      </body>
    </html>
  );
}
