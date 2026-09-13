"use client";

import { Play, Square, Activity, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { useAuthStore } from "@/store/useAuthStore";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function TopBar() {
  const router = useRouter();
  const { submissionId, submissionStatus, curationMarkdown, images, boxes, year, examination, subject, paperType, setSubmissionStatus } = useStore();
  const { currentUser } = useAuthStore();
  const [isExtracting, setIsExtracting] = useState(false);

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
    <div className="h-14 shrink-0 bg-white border-b border-slate-200 flex items-center justify-between px-4 shadow-sm z-10">
      <div className="flex items-center gap-4">
        {/* Paper Title/Metadata */}
        {(year || examination || subject || paperType) && (
          <div className="flex items-center">
            <div className="flex flex-col">
              <h2 className="text-sm font-semibold text-slate-800 leading-tight">
                {[year, examination === "A/L" ? "G.C.E. A/L" : examination === "O/L" ? "G.C.E. O/L" : examination, subject].filter(Boolean).join(" ")}
              </h2>
              {paperType && (
                <p className="text-xs text-slate-500 font-medium leading-tight mt-0.5">
                  {paperType}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-6">


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
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-lg bg-[var(--ls-accent)] text-white hover:bg-[var(--ls-accent-hover)] shadow-sm transition-colors disabled:opacity-50"
          >
            {isExtracting ? (
              <><Loader2 size={16} className="animate-spin" /> Extracting...</>
            ) : (
              <><Play size={16} /> Extract with MinerU</>
            )}
          </button>
        )}
        
        {submissionId && submissionStatus === "PENDING_USER_VALIDATION" && (
          <button 
            onClick={async () => {
              try {
                const res = await fetch(`http://localhost:8000/api/curation/submission/${submissionId}/submit`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    curationMarkdown,
                    images,
                    boxes,
                    explanation: "Fixed some extraction errors.", // hardcoded for now, ideally an input modal
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
              }
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-lg bg-[var(--ls-accent)] text-white hover:bg-[var(--ls-accent-hover)] shadow-sm transition-colors"
          >
            Submit for Verification
          </button>
        )}

        {submissionId && submissionStatus === "PENDING_MAINTAINER_VERIFICATION" && (
          <div className="flex items-center gap-2">
            <button 
              onClick={async () => {
                try {
                  const res = await fetch(`http://localhost:8000/api/curation/submission/${submissionId}/request-changes`, {
                    method: 'POST'
                  });
                  if (res.ok) {
                    setSubmissionStatus("PENDING_USER_VALIDATION");
                    router.push('/dashboard');
                  }
                } catch (e) {
                  console.error("Failed to request changes", e);
                }
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 shadow-sm transition-colors"
            >
              Request Changes
            </button>
            <button 
              onClick={async () => {
                try {
                  const res = await fetch(`http://localhost:8000/api/curation/submission/${submissionId}/approve`, {
                    method: 'POST'
                  });
                  if (res.ok) {
                    setSubmissionStatus("APPROVED");
                    router.push('/dashboard');
                  }
                } catch (e) {
                  console.error("Failed to approve submission", e);
                }
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-colors"
            >
              Approve Verification
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
