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
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg w-56 relative overflow-hidden">
          <div className="flex flex-col items-center gap-2 p-5 pt-6">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <p className="text-sm text-gray-500 text-center leading-relaxed">
              Need help? Chat with the OpenPapers support team.
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="absolute top-2.5 right-2.5 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 text-xs rounded-full hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
          <div className="border-t border-gray-100 px-4 py-2.5">
            <button className="w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors">⋯</button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-blue-700 transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
    <div
      className="flex flex-col items-center bg-white border border-gray-200 rounded-2xl p-8 w-64 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      {/* Illustration */}
      <div className="mb-6 mt-1 flex items-center justify-center">{icon}</div>

      {/* Text block */}
      <div className="flex flex-col items-center gap-3 flex-1">
        <h2 className="text-[15px] font-semibold text-center text-gray-800">{title}</h2>
        <p className="text-sm text-gray-600 text-center leading-relaxed">{description}</p>
      </div>

      {/* CTA button */}
      <button
        className="mt-6 px-6 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        {buttonLabel}
      </button>
    </div>
  );
}

export default function Home() {
  const router = useRouter();

  return (
    <AppShell>
      <div className="p-8 h-full bg-slate-50">
        {/* Page heading */}
        <h1 className="text-2xl font-semibold mb-8 text-gray-800">
          Welcome to OpenPapers Curation Studio
        </h1>

        {/* Workspace canvas — dashed framed area */}
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white flex items-center justify-center min-h-[420px]">
          <div className="flex flex-row gap-8 p-8">
            <ActionCard
              icon={<PdfUploadIcon />}
              title="Add a New Paper"
              description="Upload a PDF and provide paper metadata (Year, Subject, etc.)."
              buttonLabel="Add Paper"
              onClick={() => router.push("/add")}
            />
            <ActionCard
              icon={<FixMistakeIcon />}
              title="Fix a Digitization Mistake"
              description="Search for existing papers and correct extraction errors in Markdown."
              buttonLabel="Fix Mistake"
              onClick={() => router.push("/search")}
            />
          </div>
        </div>
      </div>

      <ChatBubble />
    </AppShell>
  );
}
