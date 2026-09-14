"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { FileText, CheckCircle, AlertTriangle, Loader2, Upload, Clock, CloudUpload } from "lucide-react";
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

    const statusInfo = statusMap[sub.status] || { label: sub.status, badgeClass: "bg-gray-100 text-gray-700 border border-gray-200", btnClass: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300", btnText: "View Details", action: () => router.push(`/validate/${sub.id}`) };

    return (
      <div 
        key={sub.id} 
        className="bg-white border border-slate-200/60 rounded-2xl p-5 flex flex-col md:flex-row md:items-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)] hover:border-[var(--ls-accent)]/30 transition-all duration-300 group cursor-default"
      >
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--ls-accent)] to-blue-700 flex items-center justify-center shrink-0 mb-4 md:mb-0 md:mr-5 shadow-inner shadow-white/20 group-hover:scale-105 group-hover:rotate-3 transition-all duration-300">
          <FileText size={26} className="text-white drop-shadow-sm" aria-hidden="true" />
        </div>
        
        <div className="flex-1 mb-4 md:mb-0 md:pr-4">
          <h3 className="font-bold text-[17px] text-slate-800 tracking-tight group-hover:text-[var(--ls-accent)] transition-colors duration-200">
            {metadata?.year || "Unknown"} {metadata?.examination || ""} {metadata?.subject || "Paper"}
          </h3>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-sm text-slate-500 font-medium">
              {metadata?.language === "si" ? "Sinhala" : metadata?.language === "ta" ? "Tamil" : "English"}
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <span className="text-sm text-slate-500 font-medium">
              {sub.type === "MCQ" ? "MCQ" : "Structured Essay"}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-start md:mr-8 mb-5 md:mb-0 min-w-[180px]">
          <div className="flex items-center gap-1.5 mb-2 text-slate-400">
            <Clock size={14} />
            <span className="text-xs font-medium">{getRelativeTime(sub.createdAt)}</span>
          </div>
          <span className={`text-[11px] px-3 py-1.5 rounded-full font-bold uppercase tracking-wider shadow-sm ${statusInfo.badgeClass}`}>
            {statusInfo.label}
          </span>
        </div>

        <button 
          onClick={statusInfo.action}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--ls-accent)] active:scale-95 flex items-center gap-2 group/btn ${statusInfo.btnClass}`}
        >
          {statusInfo.btnText}
          <div className="transform group-hover/btn:translate-x-1 transition-transform duration-200">
            →
          </div>
        </button>
      </div>
    );
  };

  const pendingActionCount = mySubmissions.filter(s => s.status === "PENDING_USER_VALIDATION" || s.status === "CHANGES_REQUESTED").length;
  const approvedCount = mySubmissions.filter(s => s.status === "APPROVED" || s.status === "COMPLETED").length;

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto p-4 sm:p-8 font-sans w-full animate-in fade-in duration-500">
        <header className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
              My Submissions: Track your papers
            </h1>
            <p className="text-slate-500 mt-2 font-medium">Keep track of the past papers you've contributed to the community.</p>
          </div>
          <button 
            onClick={() => router.push('/add')}
            className="bg-gradient-to-r from-[var(--ls-accent)] to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--ls-accent)] flex items-center gap-2.5 self-start sm:self-auto group"
          >
            <Upload size={18} className="group-hover:-translate-y-1 group-hover:scale-110 transition-transform duration-300" aria-hidden="true" />
            Submit New Paper
          </button>
        </header>
        
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="animate-spin text-[var(--ls-accent)]" size={32} />
          </div>
        ) : (
          <div className="max-w-5xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 max-w-5xl">
              <div className="bg-white border border-slate-200/60 rounded-2xl p-6 flex flex-col relative overflow-hidden shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500">
                  <Upload size={80} />
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 mb-4 text-blue-600 border border-blue-100 shadow-sm group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                  <Upload size={22} aria-hidden="true" /> 
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Total Uploads</p>
                  <p className="text-4xl font-extrabold text-slate-800">{mySubmissions.length}</p>
                </div>
              </div>
              
              <div className="bg-white border border-slate-200/60 rounded-2xl p-6 flex flex-col relative overflow-hidden shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500 text-amber-500">
                  <AlertTriangle size={80} />
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 mb-4 text-amber-600 border border-amber-100 shadow-sm group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                  <AlertTriangle size={22} aria-hidden="true" /> 
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-600 uppercase tracking-wider mb-1">Pending Action</p>
                  <p className="text-4xl font-extrabold text-slate-800">{pendingActionCount}</p>
                </div>
              </div>
              
              <div className="bg-white border border-slate-200/60 rounded-2xl p-6 flex flex-col relative overflow-hidden shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500 text-emerald-500">
                  <CheckCircle size={80} />
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 mb-4 text-emerald-600 border border-emerald-100 shadow-sm group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                  <CheckCircle size={22} aria-hidden="true" /> 
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-1">Fully Approved</p>
                  <p className="text-4xl font-extrabold text-slate-800">{approvedCount}</p>
                </div>
              </div>
            </div>

            {mySubmissions.length === 0 ? (
              <div className="text-center py-24 px-6 border border-dashed border-slate-300 rounded-3xl bg-slate-50/50 flex flex-col items-center justify-center shadow-inner relative overflow-hidden mt-8">
                <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--ls-accent)] to-transparent opacity-20"></div>
                <div className="w-20 h-20 bg-white rounded-2xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)] flex items-center justify-center mb-6 text-[var(--ls-accent)] border border-slate-100">
                  <CloudUpload size={40} aria-hidden="true" />
                </div>
                <h3 className="text-2xl font-extrabold text-slate-800 mb-3">No Submissions Yet</h3>
                <p className="text-slate-500 mb-8 max-w-md text-base leading-relaxed">
                  You haven&apos;t uploaded any exam papers for extraction yet. Help the community grow by contributing your first past paper.
                </p>
                <button 
                  onClick={() => router.push('/add')} 
                  className="bg-gradient-to-r from-[var(--ls-accent)] to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3.5 rounded-xl text-base font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--ls-accent)] flex items-center gap-2 group"
                >
                  <Upload size={20} className="group-hover:-translate-y-1 transition-transform duration-300" />
                  Upload Your First Paper
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
