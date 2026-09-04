"use client";

import Link from "next/link";
import { Search, BookOpen, Bot, Bell, HelpCircle, ChevronDown, LogOut } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

function UserMenu() {
  const { currentUser, setCurrentUser } = useAuthStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!currentUser) return null;

  const initials = currentUser.username.slice(0, 2).toUpperCase();
  const displayRole = currentUser.role === "MAINTAINER" ? "Maintainer" : "Contributor";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 hover:bg-[var(--ls-surface-hover)] px-2 py-1.5 rounded-lg transition-colors"
      >
        <span className="text-sm font-medium text-[var(--ls-text-primary)]">{displayRole}</span>
        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
          {initials}
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-48 bg-[var(--ls-surface)] border border-[var(--ls-border)] rounded-xl shadow-lg py-1 z-50">
          <div className="px-3 py-2 border-b border-[var(--ls-border)]">
            <p className="text-sm font-semibold text-[var(--ls-text-primary)] truncate">
              {currentUser.username}
            </p>
            <p className="text-xs text-[var(--ls-text-muted)]">{displayRole}</p>
          </div>
          <button
            onClick={() => {
              setCurrentUser(null);
              router.push("/login");
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function NavBar() {
  return (
    <header
      className="shrink-0 bg-[var(--ls-surface)] border-b border-[var(--ls-border)] flex items-center px-4 gap-3 z-10"
      style={{ height: "var(--ls-topbar-height)" }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mr-1" style={{ minWidth: "var(--ls-sidebar-width)", paddingRight: "0.75rem" }}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-sm">
          {/* Paper stack icon */}
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="3" y="2" width="10" height="13" rx="1.5" fill="white" opacity="0.3"/>
            <rect x="5" y="4" width="10" height="13" rx="1.5" fill="white" opacity="0.6"/>
            <rect x="3" y="2" width="10" height="13" rx="1.5" stroke="white" strokeWidth="1.2"/>
            <line x1="5.5" y1="6" x2="10.5" y2="6" stroke="white" strokeWidth="1" strokeLinecap="round"/>
            <line x1="5.5" y1="8.5" x2="10.5" y2="8.5" stroke="white" strokeWidth="1" strokeLinecap="round"/>
            <line x1="5.5" y1="11" x2="8.5" y2="11" stroke="white" strokeWidth="1" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm font-semibold text-[var(--ls-text-primary)] leading-tight">
            OpenPapers<br />
            <span className="text-[var(--ls-text-muted)] font-normal text-xs">Curation Studio</span>
          </span>
          <ChevronDown size={14} className="text-[var(--ls-text-muted)] mt-0.5" />
        </div>
      </Link>

      {/* Search */}
      <div className="flex-1 max-w-sm">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ls-text-muted)]"
          />
          <input
            type="text"
            placeholder="Search for a paper (e.g., A/L Physics)..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg text-[var(--ls-text-primary)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]"
          />
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-1">
        <a
          href="#"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[var(--ls-text-secondary)] hover:bg-[var(--ls-surface-hover)] rounded-lg transition-colors"
        >
          <BookOpen size={16} />
          Documentation
        </a>

        <button className="w-8 h-8 flex items-center justify-center text-[var(--ls-text-secondary)] hover:bg-[var(--ls-surface-hover)] rounded-lg transition-colors">
          <Bot size={16} />
        </button>

        <button className="w-8 h-8 flex items-center justify-center text-[var(--ls-text-secondary)] hover:bg-[var(--ls-surface-hover)] rounded-lg transition-colors relative">
          <Bell size={16} />
        </button>

        <button className="w-8 h-8 flex items-center justify-center text-[var(--ls-text-secondary)] hover:bg-[var(--ls-surface-hover)] rounded-lg transition-colors">
          <HelpCircle size={16} />
        </button>

        <div className="w-px h-5 bg-[var(--ls-border)] mx-1" />

        <UserMenu />
      </div>
    </header>
  );
}
