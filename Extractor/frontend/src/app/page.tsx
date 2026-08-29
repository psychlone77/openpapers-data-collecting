"use client";

import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { PlusCircle, PenTool } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col h-screen bg-[var(--color-bg-canvas)]">
      <TopBar />
      
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <h1 className="text-4xl font-display font-bold text-white mb-4">
          Welcome to Curation Studio
        </h1>
        <p className="text-[var(--color-text-muted)] text-lg mb-12 max-w-xl text-center">
          Help digitize and verify exam papers for OpenPapers.
        </p>
        
        <div className="flex flex-col md:flex-row gap-6 w-full max-w-3xl justify-center">
          {/* Add New Paper */}
          <Link href="/add" className="flex-1 group">
            <div className="h-full flex flex-col items-center p-8 bg-[var(--color-bg-surface)] border border-[var(--color-border-hairline)] rounded-2xl hover:border-[var(--color-accent-active)] hover:shadow-[0_0_30px_rgba(var(--color-accent-active-rgb),0.2)] transition-all cursor-pointer">
              <div className="w-16 h-16 rounded-full bg-[var(--color-accent-active)]/10 text-[var(--color-accent-active)] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <PlusCircle size={32} />
              </div>
              <h2 className="text-2xl font-semibold text-white mb-2">Add a new paper</h2>
              <p className="text-[var(--color-text-muted)] text-center text-sm">
                Upload a PDF to the extraction queue. Once processed, you'll be notified to validate it.
              </p>
            </div>
          </Link>
          
          {/* Fix Mistake */}
          <Link href="/search" className="flex-1 group">
            <div className="h-full flex flex-col items-center p-8 bg-[var(--color-bg-surface)] border border-[var(--color-border-hairline)] rounded-2xl hover:border-[var(--color-accent-active)] hover:shadow-[0_0_30px_rgba(var(--color-accent-active-rgb),0.2)] transition-all cursor-pointer">
              <div className="w-16 h-16 rounded-full bg-[var(--color-accent-active)]/10 text-[var(--color-accent-active)] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <PenTool size={32} />
              </div>
              <h2 className="text-2xl font-semibold text-white mb-2">Fix a mistake</h2>
              <p className="text-[var(--color-text-muted)] text-center text-sm">
                Search for an existing paper and use the side-by-side view to correct extraction errors.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
