import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OutboundForge",
  description: "Multi-agent AI SDR — research, personalize, and run outreach campaigns.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
