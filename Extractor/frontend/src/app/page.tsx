"use client";

import { AppShell } from "@/components/AppShell";
import { useRouter } from "next/navigation";
import { useState } from "react";

/* ── PDF Upload illustration – larger monochrome line-art ── */
function PdfUploadIcon() {
  return (
    <svg width="96" height="104" viewBox="0 0 96 104" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Back shadow page */}
      <rect x="14" y="8" width="56" height="72" rx="5" fill="#f1f3f7" stroke="#d1d5de" strokeWidth="1.5"/>
      {/* Main document */}
      <rect x="8" y="4" width="56" height="72" rx="5" fill="#e8eaf0" stroke="#c4c9d6" strokeWidth="1.5"/>
      {/* Folded corner cut */}
      <path d="M50 4 L64 18 L50 18 Z" fill="#d1d5de"/>
      <path d="M50 4 L64 18" stroke="#c4c9d6" strokeWidth="1.5"/>
      {/* PDF badge */}
      <rect x="10" y="26" width="24" height="12" rx="3" fill="#6b7a99"/>
      <text x="22" y="35.5" textAnchor="middle" fill="white" fontSize="7.5" fontWeight="700" fontFamily="Inter, sans-serif" letterSpacing="0.5">PDF</text>
      {/* Document lines */}
      <line x1="14" y1="48" x2="54" y2="48" stroke="#c4c9d6" strokeWidth="2" strokeLinecap="round"/>
      <line x1="14" y1="56" x2="50" y2="56" stroke="#c4c9d6" strokeWidth="2" strokeLinecap="round"/>
      <line x1="14" y1="64" x2="40" y2="64" stroke="#c4c9d6" strokeWidth="2" strokeLinecap="round"/>
      {/* Upload arrow circle */}
      <circle cx="70" cy="82" r="20" fill="#6b7a99"/>
      <path d="M70 93 L70 73" stroke="white" strokeWidth="3" strokeLinecap="round"/>
      <path d="M62 81 L70 73 L78 81" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ── Fix Mistake illustration – larger monochrome line-art ── */
function FixMistakeIcon() {
  return (
    <svg width="96" height="104" viewBox="0 0 96 104" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Back shadow page */}
      <rect x="14" y="8" width="56" height="72" rx="5" fill="#f1f3f7" stroke="#d1d5de" strokeWidth="1.5"/>
      {/* Main document */}
      <rect x="8" y="4" width="56" height="72" rx="5" fill="#e8eaf0" stroke="#c4c9d6" strokeWidth="1.5"/>
      {/* Folded corner */}
      <path d="M50 4 L64 18 L50 18 Z" fill="#d1d5de"/>
      <path d="M50 4 L64 18" stroke="#c4c9d6" strokeWidth="1.5"/>
      {/* Document lines */}
      <line x1="14" y1="28" x2="54" y2="28" stroke="#c4c9d6" strokeWidth="2" strokeLinecap="round"/>
      <line x1="14" y1="37" x2="50" y2="37" stroke="#c4c9d6" strokeWidth="2" strokeLinecap="round"/>
      <line x1="14" y1="46" x2="40" y2="46" stroke="#c4c9d6" strokeWidth="2" strokeLinecap="round"/>
      {/* Signature squiggle */}
      <path d="M14 62 Q22 56 28 62 Q34 68 42 60" stroke="#9aa3b8" strokeWidth="2" strokeLinecap="round" fill="none"/>
      {/* Magnifier outer ring (subtle fill) */}
      <circle cx="72" cy="78" r="20" fill="#6b7a99" opacity="0.12" stroke="#6b7a99" strokeWidth="1.5"/>
      {/* Magnifier lens */}
      <circle cx="69" cy="75" r="10" fill="none" stroke="#6b7a99" strokeWidth="2.5"/>
      {/* Magnifier handle */}
      <line x1="77" y1="83" x2="86" y2="92" stroke="#6b7a99" strokeWidth="3" strokeLinecap="round"/>
      {/* Checkmark inside lens */}
      <path d="M64 75 L68 79 L75 71" stroke="#6b7a99" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ── Chat bubble ── */
function ChatBubble() {
  const [open, setOpen] = useState(true);

  return (
    <div className="fixed bottom-6 right-6 flex flex-col items-end gap-3 z-50">
      {open && (
        <div 
          role="dialog" 
          aria-label="Support Chat"
          className="bg-white border border-slate-200 rounded-2xl shadow-xl w-64 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div className="flex flex-col items-center gap-3 p-6 pt-8">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 shadow-inner">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-500">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <p className="text-sm text-slate-600 text-center leading-relaxed font-medium">
              Need help? Chat with the OpenPapers support team.
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close chat bubble"
            className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 text-sm rounded-full hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ls-accent)]"
          >
            ✕
          </button>
          <div className="border-t border-slate-100 px-4 py-3 bg-slate-50">
            <button 
              className="w-full text-center text-xs font-semibold text-slate-400 hover:text-[var(--ls-accent)] transition-colors focus:outline-none focus-visible:underline"
              aria-label="More options"
            >
              ⋯
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Toggle support chat"
        className="w-14 h-14 bg-[var(--ls-accent)] rounded-full flex items-center justify-center text-white shadow-lg hover:brightness-110 transition-all hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-[var(--ls-accent)]"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>
    </div>
  );
}

/* ── Action Card ── */
function ActionCard({
  icon,
  title,
  description,
  buttonLabel,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center bg-white border border-slate-200 rounded-2xl p-8 w-72 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ls-accent)] focus-visible:ring-offset-4 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all duration-300 transform hover:-translate-y-1"
    >
      {/* Illustration */}
      <div className="mb-6 mt-2 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
        {icon}
      </div>

      {/* Text block */}
      <div className="flex flex-col items-center gap-3 flex-1">
        <h2 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h2>
        <p className="text-sm text-slate-500 text-center leading-relaxed">{description}</p>
      </div>

      {/* CTA button (visual only since parent is the semantic button) */}
      <div
        className="mt-8 px-6 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm font-semibold text-slate-700 group-hover:bg-[var(--ls-accent)] group-hover:text-white group-hover:border-[var(--ls-accent)] transition-colors w-full text-center shadow-sm"
        aria-hidden="true"
      >
        {buttonLabel}
      </div>
    </button>
  );
}

export default function Home() {
  const router = useRouter();

  return (
    <AppShell>
      <main className="p-4 sm:p-8 h-full bg-slate-50/50 flex flex-col w-full max-w-7xl mx-auto">
        {/* Page heading */}
        <header className="mb-10 text-center sm:text-left">
          <h1 className="text-3xl font-bold text-[var(--ls-text-primary)] tracking-tight">
            Welcome to the Curation Studio
          </h1>
          <p className="text-slate-500 mt-2 text-sm sm:text-base max-w-2xl mx-auto sm:mx-0">
            Help expand the OpenPapers collection by digitizing new past papers or correcting existing extraction errors.
          </p>
        </header>

        {/* Workspace canvas — dashed framed area */}
        <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white shadow-sm flex items-center justify-center py-16 px-4 flex-1 mb-8">
          <div className="flex flex-col sm:flex-row gap-8 sm:gap-12">
            <ActionCard
              icon={<PdfUploadIcon />}
              title="Add a New Paper"
              description="Upload a PDF and provide paper metadata (Year, Subject, etc.)."
              buttonLabel="Add Paper"
              onClick={() => router.push("/add")}
            />
            <ActionCard
              icon={<FixMistakeIcon />}
              title="Fix an Extraction Mistake"
              description="Search for existing papers and correct extraction errors in Markdown."
              buttonLabel="Fix Mistake"
              onClick={() => router.push("/search")}
            />
          </div>
        </div>
      </main>

      <ChatBubble />
    </AppShell>
  );
}
