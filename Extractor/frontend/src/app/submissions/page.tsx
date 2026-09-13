"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { FileText, CheckCircle, AlertTriangle, Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

export default function SubmissionsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { currentUser } = useAuthStore();

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/queue?userId=${currentUser?.id}`);
      const data = await res.json();
      setSubmissions(data.submissions || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (currentUser) fetchDashboard();
    
    const interval = setInterval(() => {
      if (currentUser) fetchDashboard();
    }, 5000);
    
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  if (!currentUser) return null;

  // STRICTLY filter to user's own submissions
  const mySubmissions = submissions.filter(s => s.submitterId === currentUser.id);

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) return "Submitted just now";
      return `Submitted ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    }
    return `Submitted ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderContributorRow = (sub: any) => {
    const metadata = typeof sub.metadata === 'string' ? JSON.parse(sub.metadata || "{}") : sub.metadata;
    
    const statusMap: Record<string, { label: string, badgeClass: string, btnClass: string, btnText: string, action: () => void }> = {
      "PENDING_MINERU": { label: "Waiting for Maintainer", badgeClass: "bg-blue-100 text-blue-700", btnClass: "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200", btnText: "View Details", action: () => router.push(`/validate/${sub.id}`) },
      "PROCESSING_EXTRACTION": { label: "Waiting for Maintainer", badgeClass: "bg-blue-100 text-blue-700", btnClass: "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200", btnText: "View Details", action: () => router.push(`/validate/${sub.id}`) },
      "PENDING_USER_VALIDATION": { label: "Action Required: Validate Extraction", badgeClass: "bg-orange-100 text-orange-800", btnClass: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm", btnText: "Open Studio", action: () => router.push(`/validate/${sub.id}`) },
      "PENDING_MAINTAINER_VERIFICATION": { label: "In Review", badgeClass: "bg-blue-100 text-blue-700", btnClass: "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200", btnText: "View Details", action: () => router.push(`/validate/${sub.id}`) },
      "CHANGES_REQUESTED": { label: "Action Required: Address Feedback", badgeClass: "bg-orange-100 text-orange-800", btnClass: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm", btnText: "Open Studio", action: () => router.push(`/validate/${sub.id}`) },
      "EXTRACTION_FAILED": { label: "Extraction Failed (Waiting on Maintainer)", badgeClass: "bg-red-100 text-red-800", btnClass: "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200", btnText: "View Details", action: () => router.push(`/validate/${sub.id}`) },
      "APPROVED": { label: "Approved", badgeClass: "bg-green-100 text-green-700", btnClass: "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200", btnText: "View Details", action: () => router.push(`/validate/${sub.id}`) },
      "COMPLETED": { label: "Approved", badgeClass: "bg-green-100 text-green-700", btnClass: "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200", btnText: "View Details", action: () => router.push(`/validate/${sub.id}`) },
    };

    const statusInfo = statusMap[sub.status] || { label: sub.status, badgeClass: "bg-gray-100 text-gray-700", btnClass: "bg-gray-50 text-gray-700 border border-gray-200", btnText: "View Details", action: () => router.push(`/validate/${sub.id}`) };

    return (
      <div key={sub.id} className="bg-white border border-[var(--ls-border)] rounded-xl p-5 flex flex-col md:flex-row md:items-center shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-[#253B6E] flex items-center justify-center shrink-0 mb-4 md:mb-0 md:mr-4">
          <FileText size={24} className="text-white" />
        </div>
        
        <div className="flex-1 mb-4 md:mb-0">
          <h3 className="font-bold text-lg text-[var(--ls-text-primary)]">
            {metadata?.year || "Unknown"} {metadata?.examination || ""} {metadata?.subject || "Paper"}
          </h3>
          <p className="text-sm text-[var(--ls-text-secondary)] mt-0.5">
            {metadata?.language === "si" ? "Sinhala Medium" : metadata?.language === "ta" ? "Tamil Medium" : "English Medium"} • {sub.type === "MCQ" ? "MCQ" : "Structured Essay"}
          </p>
        </div>

        <div className="flex flex-col items-start md:mr-8 mb-4 md:mb-0 min-w-[200px]">
          <span className="text-xs text-[var(--ls-text-secondary)] mb-1">{getRelativeTime(sub.createdAt)}</span>
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusInfo.badgeClass}`}>
            {statusInfo.label}
          </span>
        </div>

        <button 
          onClick={statusInfo.action}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors shrink-0 ${statusInfo.btnClass}`}
        >
          {statusInfo.btnText}
        </button>
      </div>
    );
  };

  const pendingActionCount = mySubmissions.filter(s => s.status === "PENDING_USER_VALIDATION" || s.status === "CHANGES_REQUESTED").length;
  const approvedCount = mySubmissions.filter(s => s.status === "APPROVED" || s.status === "COMPLETED").length;

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto p-8 font-sans w-full">
        <h1 className="text-2xl font-bold text-[var(--ls-text-primary)] mb-8">
          My Submissions: Track your papers
        </h1>
        
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="animate-spin text-[var(--ls-accent)]" size={32} />
          </div>
        ) : (
          <div className="max-w-5xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white border border-[var(--ls-border)] rounded-xl p-5 flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-[#253B6E] flex items-center justify-center shrink-0">
                  <Upload className="text-white" size={24} /> 
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--ls-text-secondary)]">Total Uploads</p>
                  <p className="text-2xl font-bold text-[var(--ls-text-primary)]">{mySubmissions.length}</p>
                </div>
              </div>
              
              <div className="bg-white border border-[var(--ls-border)] rounded-xl p-5 flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-[#253B6E] flex items-center justify-center shrink-0">
                  <AlertTriangle className="text-white" size={24} /> 
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--ls-text-secondary)]">Pending Your Action</p>
                  <p className="text-2xl font-bold text-[var(--ls-text-primary)]">{pendingActionCount}</p>
                </div>
              </div>
              
              <div className="bg-white border border-[var(--ls-border)] rounded-xl p-5 flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-[#253B6E] flex items-center justify-center shrink-0">
                  <CheckCircle className="text-white" size={24} /> 
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--ls-text-secondary)]">Fully Approved</p>
                  <p className="text-2xl font-bold text-[var(--ls-text-primary)]">{approvedCount}</p>
                </div>
              </div>
            </div>

            {mySubmissions.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-[var(--ls-border)] rounded-2xl bg-white mt-8">
                <p className="text-[var(--ls-text-secondary)] mb-4">You haven&apos;t submitted anything yet.</p>
                <button onClick={() => router.push('/add')} className="text-[var(--ls-accent)] hover:underline font-medium">
                  Submit your first paper
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 pb-12 mt-8">
                {mySubmissions.map(sub => renderContributorRow(sub))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
