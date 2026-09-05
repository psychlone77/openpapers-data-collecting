"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, User } from "@/store/useAuthStore";
import { UserCircle, Shield, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { users, setUsers, setCurrentUser, currentUser } = useAuthStore();
  const [loading, setLoading] = useState(true);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (currentUser) {
      router.push("/dashboard");
    }
  }, [currentUser, router]);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch("http://localhost:8000/auth/users");
        if (res.ok) {
          const data: User[] = await res.json();
          setUsers(data);
        }
      } catch (err) {
        console.error("Failed to fetch users", err);
      } finally {
        setLoading(false);
      }
    }
    
    if (users.length === 0) {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [setUsers, users.length]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    router.push("/dashboard");
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[var(--color-bg-canvas)]">
        <Loader2 className="animate-spin text-[var(--color-accent-active)]" size={48} />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-bg-canvas)] items-center justify-center p-8">
      <div className="max-w-md w-full bg-[var(--color-bg-surface)] border border-[var(--color-border-hairline)] rounded-2xl p-8 shadow-2xl">
        <h1 className="text-3xl font-display font-bold text-white mb-2 text-center">
          Curation Studio
        </h1>
        <p className="text-[var(--color-text-muted)] text-center mb-8">
          Mock Login System
        </p>

        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
            Select a user to continue
          </h2>
          {users.length === 0 ? (
            <p className="text-[var(--color-text-muted)] text-sm italic">
              No users found. Please make sure the backend is running and seeded.
            </p>
          ) : (
            users.map((u) => (
              <button
                key={u.id}
                onClick={() => handleLogin(u)}
                className="flex items-center gap-4 p-4 rounded-xl border border-[var(--color-border-hairline)] bg-[var(--color-bg-surface-raised)] hover:border-[var(--color-accent-active)] hover:bg-[var(--color-bg-surface)] transition-all group text-left"
              >
                <div className="w-12 h-12 rounded-full bg-[var(--color-bg-canvas)] flex items-center justify-center group-hover:scale-110 transition-transform">
                  {u.role === "MAINTAINER" ? (
                    <Shield size={24} className="text-[var(--color-accent-active)]" />
                  ) : (
                    <UserCircle size={24} className="text-blue-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">{u.username}</h3>
                  <p className="text-[var(--color-text-muted)] text-sm">
                    Role: <span className="font-medium text-[var(--color-text-primary)]">{u.role}</span>
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
