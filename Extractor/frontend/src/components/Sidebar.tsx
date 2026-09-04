"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  LayoutDashboard,
  Search,
  FileText,
  ChevronRight,
  ListOrdered,
  Clock,
  Settings,
  UserPlus,
  Plus,
  PenLine,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

const NAV_ITEMS = [
  { label: "Home", href: "/", icon: Home },
  { label: "My Dashboard", href: "/dashboard", icon: LayoutDashboard, badge: "0" },
  { label: "Search & Fix", href: "/search", icon: Search, action: true },
  { label: "My Submissions", href: "/submissions", icon: FileText },
  { label: "More", href: "#", icon: null, chevron: true },
];

const MAINTAINER_ITEMS = [
  { label: "Review Queue", href: "/dashboard?tab=review", icon: ListOrdered },
  { label: "Waiting on User", href: "/dashboard?tab=waiting", icon: Clock },
];

function NavItem({
  label,
  href,
  icon: Icon,
  badge,
  action,
  chevron,
  active,
}: {
  label: string;
  href: string;
  icon: React.ElementType | null;
  badge?: string;
  action?: boolean;
  chevron?: boolean;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
        active
          ? "bg-[var(--ls-accent-light)] text-[var(--ls-accent)] font-medium"
          : "text-[var(--ls-text-secondary)] hover:bg-[var(--ls-surface-hover)] hover:text-[var(--ls-text-primary)]"
      }`}
    >
      <div className="flex items-center gap-2.5">
        {Icon ? (
          <Icon
            size={16}
            className={active ? "text-[var(--ls-accent)]" : "text-[var(--ls-text-muted)]"}
          />
        ) : (
          <ChevronRight size={16} className="text-[var(--ls-text-muted)]" />
        )}
        <span>{label}</span>
      </div>

      <div className="flex items-center gap-1">
        {badge !== undefined && (
          <span
            className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
              active
                ? "bg-[var(--ls-accent)] text-white"
                : "bg-[var(--ls-badge-bg)] text-[var(--ls-badge-text)]"
            }`}
          >
            {badge}
          </span>
        )}
        {action && (
          <PenLine
            size={14}
            className="text-[var(--ls-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity"
          />
        )}
        {chevron && <ChevronRight size={14} className="text-[var(--ls-text-muted)]" />}
      </div>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser } = useAuthStore();

  const isMaintainer = currentUser?.role === "MAINTAINER";

  return (
    <aside
      className="flex flex-col h-full bg-gray-50 border-r border-[var(--ls-border)] overflow-hidden"
      style={{ width: "var(--ls-sidebar-width)", minWidth: "var(--ls-sidebar-width)" }}
    >
      {/* Add Paper Button */}
      <div className="p-3 border-b border-[var(--ls-border)]">
        <button
          onClick={() => router.push("/add")}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={15} />
          Add Paper
        </button>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.label}
            label={item.label}
            href={item.href}
            icon={item.icon}
            badge={item.badge}
            action={item.action}
            chevron={item.chevron}
            active={
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href) && item.href !== "/"
            }
          />
        ))}


        {/* Maintainer Queue */}
        {isMaintainer && (
          <div className="mt-4">
            <p className="px-3 py-1.5 text-[10px] font-semibold tracking-widest uppercase text-gray-500">
              Maintainer Queue
            </p>
            {MAINTAINER_ITEMS.map((item) => (
              <NavItem
                key={item.label}
                label={item.label}
                href={item.href}
                icon={item.icon}
                active={false}
              />
            ))}
          </div>
        )}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-[var(--ls-border)] p-2 flex flex-col gap-0.5">
        <NavItem label="Admin Settings" href="/settings" icon={Settings} active={false} />

        {/* Teammates */}
        <div className="mt-2 px-3 py-2">
          <p className="text-xs text-[var(--ls-text-secondary)] font-medium mb-2">
            Collaborate with your teammates
          </p>
          <div className="flex items-center gap-2">
            {/* Avatar stack */}
            <div className="flex -space-x-2">
              <div className="w-7 h-7 rounded-full bg-orange-400 border-2 border-[var(--ls-surface)] flex items-center justify-center text-white text-xs font-bold">
                A
              </div>
              <div className="w-7 h-7 rounded-full bg-blue-400 border-2 border-[var(--ls-surface)] flex items-center justify-center text-white text-xs font-bold">
                B
              </div>
            </div>
            <button className="w-6 h-6 rounded-full border-2 border-dashed border-[var(--ls-border)] flex items-center justify-center text-[var(--ls-text-muted)] hover:border-[var(--ls-accent)] hover:text-[var(--ls-accent)] transition-colors">
              <Plus size={12} />
            </button>
          </div>
          <button className="mt-2 flex items-center gap-1.5 text-xs text-[var(--ls-accent)] hover:underline font-medium">
            <UserPlus size={12} />
            Invite Contributors
          </button>
        </div>
      </div>
    </aside>
  );
}
