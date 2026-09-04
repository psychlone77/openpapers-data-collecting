"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { UserCircle, Shield, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function AuthDropdown() {
  const { currentUser, setCurrentUser } = useAuthStore();
  const router = useRouter();

  if (!currentUser) {
    return <div className="h-8 w-24 bg-[var(--color-bg-surface-raised)] animate-pulse rounded-md" />;
  }

  const handleLogout = () => {
    setCurrentUser(null);
    router.push("/login");
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-bg-surface-raised)] border border-[var(--color-border-hairline)] text-sm text-[var(--color-text-primary)] font-medium">
        {currentUser.role === 'MAINTAINER' ? (
          <Shield size={16} className="text-[var(--color-accent-active)]" />
        ) : (
          <UserCircle size={16} className="text-[var(--color-text-muted)]" />
        )}
        <span className="truncate max-w-[100px]">{currentUser.username}</span>
      </div>

      <button
        onClick={handleLogout}
        className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-bg-surface-raised)] transition-colors"
        title="Logout"
      >
        <LogOut size={18} />
      </button>
    </div>
  );
}
