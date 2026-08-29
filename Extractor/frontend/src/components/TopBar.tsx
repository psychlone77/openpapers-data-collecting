"use client";

import { Play, Square, Activity, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";

export function TopBar() {
  const { submissionId, submissionStatus, curationMarkdown, images, boxes, year, examination, subject, paperType, setSubmissionStatus } = useStore();
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
    <div className="h-14 shrink-0 bg-[var(--color-bg-surface)] border-b border-[var(--color-border-hairline)] flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <h1 className="text-[var(--color-text-primary)] font-display font-semibold">Curation Studio</h1>
        
        {/* Metadata Chips */}
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 text-xs rounded bg-[var(--color-bg-surface-raised)] text-[var(--color-text-muted)] border border-[var(--color-border-hairline)]">
            {year}
          </span>
          <span className="px-2 py-1 text-xs rounded bg-[var(--color-bg-surface-raised)] text-[var(--color-text-muted)] border border-[var(--color-border-hairline)]">
            {examination === "A/L" ? "AL" : "OL"} {subject}
          </span>
          <span className="px-2 py-1 text-xs rounded bg-[var(--color-bg-surface-raised)] text-[var(--color-text-muted)] border border-[var(--color-border-hairline)]">
            {paperType}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
          <Activity size={14} /> Saved · 2s ago
        </div>

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
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-lg bg-[var(--color-accent-active)] text-black hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
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
                    explanation: "Fixed some extraction errors." // hardcoded for now, ideally an input modal
                  })
                });
                if (res.ok) {
                  alert("Submitted for maintainer verification!");
                  window.location.href = '/queue';
                }
              } catch (e) {
                console.error(e);
                alert("Failed to submit.");
              }
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-lg bg-[var(--color-accent-active)] text-black hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            Submit for Verification
          </button>
        )}

        {submissionId && submissionStatus === "PENDING_MAINTAINER_VERIFICATION" && (
          <button 
            onClick={async () => {
              try {
                const res = await fetch(`http://localhost:8000/api/curation/submission/${submissionId}/approve`, {
                  method: 'POST'
                });
                if (res.ok) {
                  alert("Submission approved successfully!");
                  window.location.href = '/queue';
                }
              } catch (e) {
                console.error(e);
                alert("Failed to approve.");
              }
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
          >
            Approve Verification
          </button>
        )}
      </div>
    </div>
  );
}
