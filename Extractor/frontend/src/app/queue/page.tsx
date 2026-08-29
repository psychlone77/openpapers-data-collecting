"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { FileText, Play, CheckCircle, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

export default function QueuePage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchQueue();
    
    // Poll the queue every 5 seconds to update extraction statuses automatically
    const interval = setInterval(() => {
      fetchQueue();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchQueue = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/queue");
      const data = await res.json();
      setSubmissions(data.submissions || []);
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
      fetchQueue();
    } catch (e) {
      console.error(e);
    }
  };

  const approveSubmission = async (id: string) => {
    try {
      await fetch(`http://localhost:8000/api/curation/submission/${id}/approve`, {
        method: "POST"
      });
      fetchQueue();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--color-bg-canvas)]">
      <TopBar />
      
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-display font-bold text-white mb-8">
            Maintainer Queue
          </h1>
          
          {loading ? (
            <p className="text-[var(--color-text-muted)]">Loading queue...</p>
          ) : submissions.length === 0 ? (
            <p className="text-[var(--color-text-muted)]">Queue is empty.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {submissions.map((sub) => {
                const metadata = typeof sub.metadata === 'string' ? JSON.parse(sub.metadata) : sub.metadata;
                
                return (
                  <div key={sub.id} className="bg-[var(--color-bg-surface)] border border-[var(--color-border-hairline)] rounded-xl p-6 flex items-center justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-[var(--color-bg-surface-raised)] flex items-center justify-center">
                        <FileText className="text-[var(--color-text-muted)]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-white">
                          {metadata?.year} {metadata?.subject} {metadata?.examination} ({sub.type})
                        </h3>
                        <p className="text-sm text-[var(--color-text-muted)] mt-1">
                          Status: <span className="text-[var(--color-accent-active)]">{sub.status}</span>
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-1">
                          Submitted by: {sub.submitterEmail || "Unknown"}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2 justify-end">
                        <button 
                          onClick={() => router.push(`/validate/${sub.id}`)}
                          className="flex items-center gap-2 bg-[var(--color-bg-surface-raised)] text-white px-4 py-2 rounded-lg font-medium border border-[var(--color-border-hairline)] hover:border-[var(--color-accent-active)] transition-colors"
                        >
                          View Paper
                        </button>
                        
                        {sub.status === "PENDING_MINERU" && (
                          <button 
                            onClick={() => triggerMinerU(sub.id)}
                            className="flex items-center gap-2 bg-[var(--color-accent)] text-[var(--color-accent-fg)] px-4 py-2 rounded-lg font-medium hover:bg-[var(--color-accent-hover)] transition-colors"
                          >
                            <Play size={16} />
                            Extract with MinerU
                          </button>
                        )}

                        {sub.status === "PROCESSING_EXTRACTION" && (
                          <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-500 rounded-lg font-medium border border-blue-500/20">
                            <Clock size={16} className="animate-spin" />
                            Extracting...
                          </div>
                        )}

                        {sub.status === "EXTRACTION_FAILED" && (
                          <button 
                            onClick={() => triggerMinerU(sub.id)}
                            className="flex items-center gap-2 bg-red-500/10 text-red-500 px-4 py-2 rounded-lg font-medium border border-red-500/20 hover:bg-red-500/20 transition-colors"
                          >
                            <Play size={16} />
                            Extraction Failed (Retry)
                          </button>
                        )}

                        {sub.status === "PENDING_USER_VALIDATION" && (
                          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 text-yellow-500 rounded-lg font-medium border border-yellow-500/20">
                            <Clock size={16} />
                            Waiting for user
                          </div>
                        )}
                        
                        {sub.status === "PENDING_MAINTAINER_VERIFICATION" && (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => router.push(`/validate/${sub.id}`)}
                              className="flex items-center gap-2 bg-blue-500/10 text-blue-500 px-4 py-2 rounded-lg font-medium border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                            >
                              <FileText size={16} />
                              Review
                            </button>
                            <button 
                              onClick={() => approveSubmission(sub.id)}
                              className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-600 transition-colors"
                            >
                              <CheckCircle size={16} />
                              Approve
                            </button>
                          </div>
                        )}
                        
                        {sub.status === "COMPLETED" && (
                          <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-500 rounded-lg font-medium border border-green-500/20">
                            <CheckCircle size={16} />
                            Completed
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
