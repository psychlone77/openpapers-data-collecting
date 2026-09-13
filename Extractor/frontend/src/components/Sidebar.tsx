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
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useStore } from "@/store/useStore";

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
  collapsed,
}: {
  label: string;
  href: string;
  icon: React.ElementType | null;
  badge?: string;
  action?: boolean;
  chevron?: boolean;
  active?: boolean;
  collapsed?: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={`group flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
        active
          ? "bg-[var(--ls-accent-light)] text-[var(--ls-accent)] font-medium"
          : "text-[var(--ls-text-secondary)] hover:bg-[var(--ls-surface-hover)] hover:text-[var(--ls-text-primary)]"
      } ${collapsed ? "justify-center px-0" : ""}`}
    >
      <div className={`flex items-center gap-2.5 ${collapsed ? "justify-center" : ""}`}>
        {Icon ? (
          <Icon
            size={18}
            className={active ? "text-[var(--ls-accent)]" : "text-[var(--ls-text-muted)]"}
          />
        ) : (
          !collapsed && <ChevronRight size={16} className="text-[var(--ls-text-muted)]" />
        )}
        {!collapsed && <span>{label}</span>}
      </div>

      {!collapsed && (
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
      )}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser } = useAuthStore();
  const { isSidebarCollapsed, setIsSidebarCollapsed } = useStore();

  const isMaintainer = currentUser?.role === "MAINTAINER";
  
  const sidebarWidth = isSidebarCollapsed ? "68px" : "var(--ls-sidebar-width)";

  return (
    <aside
      className="flex flex-col h-full bg-gray-50 border-r border-[var(--ls-border)] overflow-hidden transition-all duration-300 relative"
      style={{ width: sidebarWidth, minWidth: sidebarWidth }}
    >
      {/* Add Paper Button */}
      <div className="p-3 border-b border-[var(--ls-border)]">
        <button
          onClick={() => router.push("/add")}
          title={isSidebarCollapsed ? "Add Paper" : undefined}
          className={`w-full flex items-center justify-center gap-2 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 transition-colors shadow-sm ${isSidebarCollapsed ? "px-0" : "px-4"}`}
        >
          <Plus size={isSidebarCollapsed ? 20 : 15} />
          {!isSidebarCollapsed && "Add Paper"}
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
            collapsed={isSidebarCollapsed}
          />
        ))}


        {/* Maintainer Queue */}
        {isMaintainer && (
          <div className="mt-4">
            {!isSidebarCollapsed ? (
              <p className="px-3 py-1.5 text-[10px] font-semibold tracking-widest uppercase text-gray-500">
                Maintainer Queue
              </p>
            ) : (
              <div className="w-full h-px bg-gray-200 my-2" />
            )}
            {MAINTAINER_ITEMS.map((item) => (
              <NavItem
                key={item.label}
                label={item.label}
                href={item.href}
                icon={item.icon}
                active={false}
                collapsed={isSidebarCollapsed}
              />
            ))}
          </div>
        )}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-[var(--ls-border)] p-2 flex flex-col gap-0.5">
        <NavItem label="Admin Settings" href="/settings" icon={Settings} active={false} collapsed={isSidebarCollapsed} />

        {/* Teammates */}
        {!isSidebarCollapsed && (
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
        )}
        
        {/* Toggle Collapse */}
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className={`mt-2 flex items-center justify-center p-2 rounded-lg text-[var(--ls-text-muted)] hover:bg-[var(--ls-surface-hover)] hover:text-[var(--ls-text-primary)] transition-colors ${!isSidebarCollapsed ? "self-end" : "self-center"}`}
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>
    </aside>
  );
}
