"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Loader2 } from "lucide-react";

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (!currentUser && pathname !== "/login") {
      router.push("/login");
    }
  }, [currentUser, pathname, router, mounted]);

  // Don't render anything until mounted to prevent hydration errors
  // with Zustand persist
  if (!mounted) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[var(--color-bg-canvas)]">
        <Loader2 className="animate-spin text-[var(--color-accent-active)]" size={48} />
      </div>
    );
  }

  // If not logged in and not on login page, we will be redirecting
  // but we should not render children to prevent layout flashes
  if (!currentUser && pathname !== "/login") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[var(--color-bg-canvas)]">
        <Loader2 className="animate-spin text-[var(--color-accent-active)]" size={48} />
      </div>
    );
  }

  return <>{children}</>;
}
