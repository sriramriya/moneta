import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./responsive-auth.css";
import {PlatformProvider} from '@moneta/provider';

export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',interactiveWidget:'resizes-content'};

export const metadata: Metadata = {
  title: "MONETA — Your money, in focus.",
  description: "Your personal financial workspace: transactions, budgets, goals and Mona.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased"><PlatformProvider>{children}</PlatformProvider></body>
    </html>
  );
}
