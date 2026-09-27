"use client";

import { Files, History, Languages } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useWorkspace } from "../lib/workspace-context";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const activePage = pathname === "/batch" ? "batch" : pathname === "/journal" ? "journal" : "translate";
  const pageLabel = activePage === "batch" ? "Batch" : activePage === "journal" ? "Journal" : "Translate";
  const { history } = useWorkspace();

  return (
    <main className="page-shell" data-page={activePage}>
      <aside className="studio-sidebar">
        <Link className="brand" href="/" aria-label="Lafz home">
          <span className="brand-mark">ل</span>
          <span>
            lafz<span className="brand-period">.</span>
          </span>
        </Link>
        <span className="sidebar-label">Workspace</span>
        <nav className="studio-nav" aria-label="Main navigation">
          <Link
            href="/"
            className={activePage === "translate" ? "studio-nav-link active" : "studio-nav-link"}
            aria-current={activePage === "translate" ? "page" : undefined}
          >
            <Languages size={18} />
            <span>Translate</span>
          </Link>
          <Link
            href="/batch"
            className={activePage === "batch" ? "studio-nav-link active" : "studio-nav-link"}
            aria-current={activePage === "batch" ? "page" : undefined}
          >
            <Files size={18} />
            <span>Batch work</span>
          </Link>
          <Link
            href="/journal"
            className={activePage === "journal" ? "studio-nav-link active" : "studio-nav-link"}
            aria-current={activePage === "journal" ? "page" : undefined}
          >
            <History size={18} />
            <span>Review journal</span>
            <span className="nav-count">{history.length}</span>
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <span className="sidebar-status">
            <span className="status-dot" /> Gemini studio
          </span>
          <span className="sidebar-languages">
            English <span>↔</span> اردو
          </span>
        </div>
      </aside>
      <div className="studio-main">
        <header className="topbar">
          <div className="topbar-note">
            <span className="status-dot" /> {pageLabel}
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}
