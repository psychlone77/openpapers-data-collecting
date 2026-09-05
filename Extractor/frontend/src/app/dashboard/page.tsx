"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { FileText, Play, CheckCircle, Clock, AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

export default function DashboardPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"REVIEW" | "MY_UPLOADS">("REVIEW");
  const router = useRouter();
  const { currentUser } = useAuthStore();

  useEffect(() => {
    if (currentUser) {
      fetchDashboard();
    }
    
    const interval = setInterval(() => {
      if (currentUser) fetchDashboard();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [currentUser]);

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`http://localhost:8000/submissions?userId=${currentUser?.id}`);
      const data = await res.json();
      setSubmissions(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const triggerMinerU = async (id: string) => {
    try {
      await fetch(`http://localhost:8000/api/queue/${id}/trigger-mineru`, {
        method: "POST"
      });
      fetchDashboard();
    } catch (e) {
      console.error(e);
    }
  };

  const renderSubmissionCard = (sub: any, isMaintainer: boolean) => {
    const metadata = typeof sub.metadata === 'string' ? JSON.parse(sub.metadata || "{}") : sub.metadata;
    
    const getUserStatusText = (status: string) => {
      switch (status) {
        case "PENDING_MINERU":
        case "PROCESSING_EXTRACTION":
          return "Waiting for Maintainer";
        case "PENDING_USER_VALIDATION":
          return "Action Required: Validate Extraction";
        case "PENDING_MAINTAINER_VERIFICATION":
          return "In Review";
        case "CHANGES_REQUESTED":
          return "Action Required: Address Feedback";
        case "APPROVED":
        case "COMPLETED":
          return "Approved";
        default:
          return status;
      }
    };

    return (
      <div key={sub.id} className="bg-[var(--color-bg-surface)] border border-[var(--color-border-hairline)] rounded-xl p-4 flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-[var(--color-bg-surface-raised)] flex items-center justify-center shrink-0">
            <FileText size={20} className="text-[var(--color-text-muted)]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">
              {metadata?.year || "Unknown"} {metadata?.subject || "Paper"} {metadata?.examination || ""} ({sub.type})
            </h3>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Status: <span className="text-[var(--color-accent-active)]">{isMaintainer ? sub.status : getUserStatusText(sub.status)}</span>
            </p>
            {isMaintainer && sub.submitter && (
              <p className="text-xs text-[var(--color-text-muted)] mt-1 truncate">
                By: {sub.submitter.username}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 justify-end mt-auto">
          <button 
            onClick={() => router.push(`/validate/${sub.id}`)}
            className="flex items-center gap-1.5 bg-[var(--color-bg-surface-raised)] text-white px-3 py-1.5 rounded-lg text-sm font-medium border border-[var(--color-border-hairline)] hover:border-[var(--color-accent-active)] transition-colors"
          >
            Open Studio
          </button>
          
          {isMaintainer && sub.status === "PENDING_MINERU" && (
            <button 
              onClick={() => triggerMinerU(sub.id)}
              className="flex items-center gap-1.5 bg-[var(--color-accent)] text-[var(--color-accent-fg)] px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              <Play size={14} /> Extract
            </button>
          )}

          {(sub.status === "CHANGES_REQUESTED") && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 text-yellow-500 rounded-lg text-sm font-medium border border-yellow-500/20">
              <AlertCircle size={14} />
              Changes Requested
            </div>
          )}
          
          {sub.status === "APPROVED" && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-500 rounded-lg text-sm font-medium border border-green-500/20">
              <CheckCircle size={14} /> Approved
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!currentUser) return null;

  const isMaintainer = currentUser.role === 'MAINTAINER';
  
  const displayedSubmissions = isMaintainer 
    ? submissions.filter(s => viewMode === "REVIEW" ? s.submitterId !== currentUser.id : s.submitterId === currentUser.id)
    : submissions;

  return (
    <div className="flex flex-col h-screen bg-[var(--color-bg-canvas)]">
      <TopBar />
      
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto h-full flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-display font-bold text-white mb-2">
                {isMaintainer ? (viewMode === "REVIEW" ? "Review Queue" : "My Uploads") : "My Contributions"}
              </h1>
              <p className="text-[var(--color-text-muted)]">
                {isMaintainer ? (viewMode === "REVIEW" ? "Manage and review papers submitted by others." : "Manage your directly uploaded papers.") : "Track the status of your submitted papers and fixes."}
              </p>
            </div>
            
            {isMaintainer && (
              <div className="flex bg-[var(--color-bg-surface-raised)] rounded-lg p-1 border border-[var(--color-border-hairline)]">
                <button
                  onClick={() => setViewMode("REVIEW")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === "REVIEW" 
                      ? "bg-[var(--color-bg-surface)] text-white shadow-sm border border-[var(--color-border-hairline)]" 
                      : "text-[var(--color-text-muted)] hover:text-white"
                  }`}
                >
                  User Queue
                </button>
                <button
                  onClick={() => setViewMode("MY_UPLOADS")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === "MY_UPLOADS" 
                      ? "bg-[var(--color-bg-surface)] text-white shadow-sm border border-[var(--color-border-hairline)]" 
                      : "text-[var(--color-text-muted)] hover:text-white"
                  }`}
                >
                  My Uploads
                </button>
              </div>
            )}
          </div>
          
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="animate-spin text-[var(--color-accent-active)]" size={32} />
            </div>
          ) : (
            <div className="flex-1 h-full min-h-0">
              {isMaintainer ? (
                /* Maintainer Kanban Board */
                <div className={`grid gap-6 h-full ${viewMode === "MY_UPLOADS" ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-4"}`}>
                  {/* Queue (To Extract) */}
                  <div className="flex flex-col bg-[var(--color-bg-surface)]/50 rounded-2xl p-4 border border-[var(--color-border-hairline)] h-full">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center justify-between">
                      Queue (To Extract)
                      <span className="bg-[var(--color-bg-surface-raised)] px-2 py-0.5 rounded-full text-xs">{displayedSubmissions.filter(s => s.status === "PENDING_MINERU").length}</span>
                    </h2>
                    <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-2">
                      {displayedSubmissions.filter(s => s.status === "PENDING_MINERU").map(sub => renderSubmissionCard(sub, true))}
                    </div>
                  </div>

                  {/* Waiting on User (Hidden in MY_UPLOADS) */}
                  {viewMode !== "MY_UPLOADS" && (
                    <div className="flex flex-col bg-[var(--color-bg-surface)]/50 rounded-2xl p-4 border border-[var(--color-border-hairline)] h-full">
                      <h2 className="text-lg font-semibold text-white mb-4 flex items-center justify-between">
                        Waiting on User
                        <span className="bg-[var(--color-bg-surface-raised)] px-2 py-0.5 rounded-full text-xs">{displayedSubmissions.filter(s => ["PENDING_USER_VALIDATION", "CHANGES_REQUESTED"].includes(s.status)).length}</span>
                      </h2>
                      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-2">
                        {displayedSubmissions.filter(s => ["PENDING_USER_VALIDATION", "CHANGES_REQUESTED"].includes(s.status)).map(sub => renderSubmissionCard(sub, true))}
                      </div>
                    </div>
                  )}

                  {/* To Review */}
                  <div className="flex flex-col bg-[var(--color-bg-surface)]/50 rounded-2xl p-4 border border-[var(--color-border-hairline)] h-full">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center justify-between">
                      To Review
                      <span className="bg-[var(--color-bg-surface-raised)] px-2 py-0.5 rounded-full text-xs">{displayedSubmissions.filter(s => s.status === "PENDING_MAINTAINER_VERIFICATION").length}</span>
                    </h2>
                    <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-2">
                      {displayedSubmissions.filter(s => s.status === "PENDING_MAINTAINER_VERIFICATION").map(sub => renderSubmissionCard(sub, true))}
                    </div>
                  </div>

                  {/* Completed */}
                  <div className="flex flex-col bg-[var(--color-bg-surface)]/50 rounded-2xl p-4 border border-[var(--color-border-hairline)] h-full">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center justify-between">
                      Completed
                      <span className="bg-[var(--color-bg-surface-raised)] px-2 py-0.5 rounded-full text-xs">{displayedSubmissions.filter(s => ["APPROVED", "COMPLETED"].includes(s.status)).length}</span>
                    </h2>
                    <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-2">
                      {displayedSubmissions.filter(s => ["APPROVED", "COMPLETED"].includes(s.status)).map(sub => renderSubmissionCard(sub, true))}
                    </div>
                  </div>
                </div>
              ) : (
                /* User List View */
                <div className="max-w-4xl">
                  {displayedSubmissions.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-[var(--color-border-hairline)] rounded-2xl">
                      <p className="text-[var(--color-text-muted)]">You haven't submitted anything yet.</p>
                      <button onClick={() => router.push('/add')} className="mt-4 text-[var(--color-accent-active)] hover:underline">
                        Submit your first paper
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {displayedSubmissions.map(sub => renderSubmissionCard(sub, false))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
