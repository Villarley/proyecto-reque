import type { Metadata } from "next";
import { QueryProviders } from "@/components/QueryProviders";
import { I18nProvider } from "@/i18n/I18nProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stellar Orbit",
  description:
    "Ambassador progress, reputation, events, and rewards for the BAF.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-sans">
        <QueryProviders>
          <I18nProvider>{children}</I18nProvider>
        </QueryProviders>
      </body>
    </html>
  );
}
