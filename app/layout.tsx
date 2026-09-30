import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KBC Mirror",
  description: "Personalization you can read, correct and veto.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
