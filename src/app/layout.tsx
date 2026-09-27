import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { WorkspaceProvider } from "@/lib/workspace-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lafz — English ↔ Urdu translation, with context",
  description: "A considered English–Urdu translator with audience-aware tone, batch translation, and a private review journal.",
};

// NOTE: if your project already has a root layout with its own <html>/<body>,
// fonts, or metadata, merge those into this file rather than replacing it —
// this is the one <html> wrapper Next.js expects for the whole app.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WorkspaceProvider>
          <AppShell>{children}</AppShell>
        </WorkspaceProvider>
      </body>
    </html>
  );
}
