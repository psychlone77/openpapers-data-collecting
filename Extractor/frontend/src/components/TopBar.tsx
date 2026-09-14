"use client";

import { Play, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";

export function TopBar() {
  const router = useRouter();
  const { submissionId, submissionStatus, curationMarkdown, images, boxes, year, examination, subject, paperType, setSubmissionStatus } = useStore();
  const { currentUser } = useAuthStore();
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isActioning, setIsActioning] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isExtracting && submissionId) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`http://localhost:8000/api/queue/${submissionId}`);
          const data = await res.json();
          if (data.submission.status !== "PENDING_MINERU") {
            window.location.reload();
          }
        } catch (e) {
          console.error(e);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isExtracting, submissionId]);

  return (
    <div className="h-14 shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-5 shadow-sm z-10">
      <div className="flex items-center gap-4">
        {/* Paper Title/Metadata */}
        {(year || examination || subject || paperType) && (
          <div className="flex flex-col">
            <h2 className="text-[13px] font-bold text-slate-800 leading-tight tracking-tight">
              {[year, examination === "A/L" ? "G.C.E. A/L" : examination === "O/L" ? "G.C.E. O/L" : examination, subject].filter(Boolean).join(" ")}
            </h2>
            {paperType && (
              <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5 uppercase tracking-wider">
                {paperType}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Submit Actions */}
        {submissionStatus === "PENDING_MINERU" && (
          <button 
            disabled={isExtracting}
            onClick={async () => {
              try {
                setIsExtracting(true);
                await fetch(`http://localhost:8000/api/queue/${submissionId}/trigger-mineru`, {
                  method: 'POST'
                });
              } catch (e) {
                console.error(e);
                alert("Failed to start extraction.");
                setIsExtracting(false);
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-[var(--ls-accent)] text-white hover:brightness-110 shadow-sm transition-all disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--ls-accent)]"
          >
            {isExtracting ? (
              <><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Extracting...</>
            ) : (
              <><Play size={14} aria-hidden="true" /> Extract with MinerU</>
            )}
          </button>
        )}
        
        {submissionId && submissionStatus === "PENDING_USER_VALIDATION" && (
          <button 
            disabled={isSubmitting}
            onClick={async () => {
              try {
                setIsSubmitting(true);
                const res = await fetch(`http://localhost:8000/api/curation/submission/${submissionId}/submit`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    curationMarkdown,
                    images,
                    boxes,
                    explanation: "Fixed some extraction errors.",
                    authorId: currentUser?.id
                  })
                });
                if (res.ok) {
                  alert("Submitted for maintainer verification!");
                  window.location.href = '/dashboard';
                }
              } catch (e) {
                console.error(e);
                alert("Failed to submit.");
                setIsSubmitting(false);
              }
            }}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg bg-[var(--ls-accent)] text-white hover:brightness-110 shadow-sm transition-all disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--ls-accent)]"
          >
            {isSubmitting ? <><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Submitting...</> : "Submit for Verification"}
          </button>
        )}

        {submissionId && submissionStatus === "PENDING_MAINTAINER_VERIFICATION" && (
          <div className="flex items-center gap-2.5">
            <button 
              disabled={isActioning}
              onClick={async () => {
                try {
                  setIsActioning(true);
                  const res = await fetch(`http://localhost:8000/api/curation/submission/${submissionId}/request-changes`, {
                    method: 'POST'
                  });
                  if (res.ok) {
                    setSubmissionStatus("PENDING_USER_VALIDATION");
                    router.push('/dashboard');
                  }
                } catch (e) {
                  console.error("Failed to request changes", e);
                  setIsActioning(false);
                }
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 shadow-sm transition-all disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500"
            >
              Request Changes
            </button>
            <button 
              disabled={isActioning}
              onClick={async () => {
                try {
                  setIsActioning(true);
                  const res = await fetch(`http://localhost:8000/api/curation/submission/${submissionId}/approve`, {
                    method: 'POST'
                  });
                  if (res.ok) {
                    setSubmissionStatus("APPROVED");
                    router.push('/dashboard');
                  }
                } catch (e) {
                  console.error("Failed to approve submission", e);
                  setIsActioning(false);
                }
              }}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500"
            >
              Approve Verification
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
