"use client";

import { useEffect, useState, Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { 
  FileText, CheckCircle, AlertTriangle, Loader2, Upload, CloudUpload, 
  FileCheck, Clock, MoreHorizontal, Play, AlertCircle, UserCheck, UserCog, RefreshCw 
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

function DashboardContent() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  
  // Maintainer filters
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [subjectFilter, setSubjectFilter] = useState("All Subjects");
  const [examTypeFilter, setExamTypeFilter] = useState("All Types");

  const router = useRouter();
  const { currentUser } = useAuthStore();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (tab === 'review') setStatusFilter("In Review");
    else if (tab === 'waiting') setStatusFilter("All Waiting on User");
    else setStatusFilter("All Statuses");
  }, [tab]);

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
    if (currentUser) {
      fetchDashboard();
    }
    
    const interval = setInterval(() => {
      if (currentUser) fetchDashboard();
    }, 5000);
    
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

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

  if (!currentUser) return null;

  const isMaintainer = currentUser.role === 'MAINTAINER';
  
  let displayedSubmissions = isMaintainer 
    ? submissions.filter(s => s.submitterId !== currentUser.id)
    : submissions.filter(s => s.submitterId === currentUser.id);
    
  if (isMaintainer) {
    if (statusFilter !== "All Statuses") {
       const reverseStatusMap: Record<string, string[]> = {
         "Waiting for Maintainer": ["PENDING_MINERU", "PROCESSING_EXTRACTION"],
         "Waiting on User": ["PENDING_USER_VALIDATION"],
         "In Review": ["PENDING_MAINTAINER_VERIFICATION"],
         "Waiting on User (Changes Requested)": ["CHANGES_REQUESTED"],
         "All Waiting on User": ["PENDING_USER_VALIDATION", "CHANGES_REQUESTED"],
         "Approved": ["APPROVED", "COMPLETED"]
       };
       const filterStatuses = reverseStatusMap[statusFilter];
       if (filterStatuses) {
         displayedSubmissions = displayedSubmissions.filter(s => filterStatuses.includes(s.status));
       }
    }
    
    if (subjectFilter !== "All Subjects") {
      displayedSubmissions = displayedSubmissions.filter(s => {
        const metadata = typeof s.metadata === 'string' ? JSON.parse(s.metadata || "{}") : s.metadata;
        return metadata?.subject === subjectFilter;
      });
    }

    if (examTypeFilter !== "All Types") {
      displayedSubmissions = displayedSubmissions.filter(s => {
        const metadata = typeof s.metadata === 'string' ? JSON.parse(s.metadata || "{}") : s.metadata;
        const exam = metadata?.examination || "";
        return exam.includes(examTypeFilter);
      });
    }
  }

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) return isMaintainer ? "Waiting for < 1 Hour" : "Submitted just now";
      return isMaintainer ? `Waiting for ${diffHours} Hour${diffHours > 1 ? 's' : ''}` : `Submitted ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    }
    return isMaintainer ? `Waiting for ${diffDays} Day${diffDays > 1 ? 's' : ''}` : `Submitted ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const renderContributorRow = (sub: any) => {
    const metadata = typeof sub.metadata === 'string' ? JSON.parse(sub.metadata || "{}") : sub.metadata;
    
    const statusMap: Record<string, { label: string, badgeClass: string, btnClass: string, btnText: string, action: () => void }> = {
      "PENDING_MINERU": { label: "Waiting for Maintainer", badgeClass: "bg-blue-100 text-blue-700 border border-blue-200", btnClass: "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200", btnText: "View Details", action: () => router.push(`/validate/${sub.id}`) },
      "PROCESSING_EXTRACTION": { label: "Waiting for Maintainer", badgeClass: "bg-blue-100 text-blue-700 border border-blue-200", btnClass: "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200", btnText: "View Details", action: () => router.push(`/validate/${sub.id}`) },
      "PENDING_USER_VALIDATION": { label: "Action Required: Validate Extraction", badgeClass: "bg-orange-100 text-orange-800 border border-orange-200", btnClass: "bg-[var(--ls-accent)] hover:brightness-90 text-white shadow-sm border border-transparent", btnText: "Open Studio", action: () => router.push(`/validate/${sub.id}`) },
      "PENDING_MAINTAINER_VERIFICATION": { label: "In Review", badgeClass: "bg-indigo-100 text-indigo-700 border border-indigo-200", btnClass: "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200", btnText: "View Details", action: () => router.push(`/validate/${sub.id}`) },
      "CHANGES_REQUESTED": { label: "Action Required: Address Feedback", badgeClass: "bg-orange-100 text-orange-800 border border-orange-200", btnClass: "bg-[var(--ls-accent)] hover:brightness-90 text-white shadow-sm border border-transparent", btnText: "Open Studio", action: () => router.push(`/validate/${sub.id}`) },
      "EXTRACTION_FAILED": { label: "Extraction Failed (Waiting on Maintainer)", badgeClass: "bg-red-100 text-red-800 border border-red-200", btnClass: "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200", btnText: "View Details", action: () => router.push(`/validate/${sub.id}`) },
      "APPROVED": { label: "Approved", badgeClass: "bg-green-100 text-green-700 border border-green-200", btnClass: "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200", btnText: "View Details", action: () => router.push(`/validate/${sub.id}`) },
      "COMPLETED": { label: "Approved", badgeClass: "bg-green-100 text-green-700 border border-green-200", btnClass: "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200", btnText: "View Details", action: () => router.push(`/validate/${sub.id}`) },
    };

    const statusInfo = statusMap[sub.status] || { label: sub.status, badgeClass: "bg-gray-100 text-gray-700 border border-gray-200", btnClass: "bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100", btnText: "View Details", action: () => router.push(`/validate/${sub.id}`) };

    return (
      <div key={sub.id} className="bg-white border border-[var(--ls-border)] rounded-xl p-5 flex flex-col md:flex-row md:items-center shadow-sm hover:shadow-md transition-shadow group">
        <div className="w-12 h-12 rounded-xl bg-[var(--ls-accent)] flex items-center justify-center shrink-0 mb-4 md:mb-0 md:mr-4 shadow-sm group-hover:scale-105 transition-transform">
          <FileText size={24} className="text-white" aria-hidden="true" />
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
          <span className="text-xs text-[var(--ls-text-secondary)] mb-1.5 font-medium">{getRelativeTime(sub.createdAt)}</span>
          <span className={`text-[11px] px-3 py-1 rounded-full font-semibold uppercase tracking-wide ${statusInfo.badgeClass}`}>
            {statusInfo.label}
          </span>
        </div>

        <button 
          onClick={statusInfo.action}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--ls-accent)] ${statusInfo.btnClass}`}
        >
          {statusInfo.btnText}
        </button>
      </div>
    );
  };

  const renderMaintainerRow = (sub: any) => {
    const metadata = typeof sub.metadata === 'string' ? JSON.parse(sub.metadata || "{}") : sub.metadata;
    
    const statusMap: Record<string, { label: string, badgeClass: string, btnText: string, action: () => void }> = {
      "PENDING_MINERU": { label: "Waiting for Maintainer", badgeClass: "bg-blue-50 text-blue-700 border border-blue-200", btnText: "Open Studio", action: () => router.push(`/validate/${sub.id}`) },
      "PROCESSING_EXTRACTION": { label: "Extracting...", badgeClass: "bg-blue-50 text-blue-700 border border-blue-200", btnText: "Open Studio", action: () => router.push(`/validate/${sub.id}`) },
      "EXTRACTION_FAILED": { label: "Extraction Failed", badgeClass: "bg-red-50 text-red-800 border border-red-200", btnText: "View Details", action: () => router.push(`/validate/${sub.id}`) },
      "PENDING_USER_VALIDATION": { label: "Waiting on User", badgeClass: "bg-orange-50 text-orange-800 border border-orange-200", btnText: "Open Studio", action: () => router.push(`/validate/${sub.id}`) },
      "PENDING_MAINTAINER_VERIFICATION": { label: "In Review", badgeClass: "bg-indigo-50 text-indigo-700 border border-indigo-200", btnText: "Review Now", action: () => router.push(`/validate/${sub.id}`) },
      "CHANGES_REQUESTED": { label: "Waiting on User (Changes Requested)", badgeClass: "bg-orange-50 text-orange-800 border border-orange-200", btnText: "Review Now", action: () => router.push(`/validate/${sub.id}`) },
      "APPROVED": { label: "Approved", badgeClass: "bg-green-50 text-green-700 border border-green-200", btnText: "View Details", action: () => router.push(`/validate/${sub.id}`) },
      "COMPLETED": { label: "Approved", badgeClass: "bg-green-50 text-green-700 border border-green-200", btnText: "View Details", action: () => router.push(`/validate/${sub.id}`) },
    };
    const statusInfo = statusMap[sub.status] || { label: sub.status, badgeClass: "bg-gray-50 text-gray-700 border border-gray-200", btnText: "View Details", action: () => router.push(`/validate/${sub.id}`) };

    return (
      <tr key={sub.id} className="hover:bg-gray-50/80 transition-colors group">
        <td className="px-4 py-4 text-sm text-[var(--ls-text-primary)] w-12 text-center">
          <input 
            type="checkbox" 
            className="rounded border-slate-300 text-[var(--ls-accent)] focus:ring-[var(--ls-accent)]" 
            aria-label={`Select submission for ${metadata?.subject || "paper"}`}
          />
        </td>
        <td className="px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50/50 border border-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
               <FileText size={18} className="text-blue-600" aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold text-[var(--ls-text-primary)] text-sm">
                {metadata?.year || "Unknown"} {metadata?.examination || ""} {metadata?.subject || "Paper"}
              </p>
              <p className="text-xs text-[var(--ls-text-secondary)] mt-0.5">
                {metadata?.language?.toUpperCase() || "EN"} • {sub.type || "Unknown"}
              </p>
            </div>
          </div>
        </td>
        <td className="px-4 py-4">
          <div className="flex items-center gap-2.5">
            {sub.submitter ? (
              <>
                <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[10px] font-bold uppercase shadow-sm">
                  {sub.submitter.username.charAt(0)}
                </div>
                <span className="text-sm font-medium text-[var(--ls-text-primary)]">{sub.submitter.username}</span>
              </>
            ) : (
              <span className="text-sm text-[var(--ls-text-secondary)] italic">Unknown</span>
            )}
          </div>
        </td>
        <td className="px-4 py-4 text-sm font-medium text-[var(--ls-text-secondary)]">
          {getRelativeTime(sub.createdAt)}
        </td>
        <td className="px-4 py-4">
          <span className={`text-[11px] px-2.5 py-1 rounded-md font-semibold uppercase tracking-wide ${statusInfo.badgeClass}`}>
            {statusInfo.label}
          </span>
        </td>
        <td className="px-4 py-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={statusInfo.action} 
              className="text-sm font-semibold text-[var(--ls-accent)] hover:text-blue-800 hover:underline whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[var(--ls-accent)] rounded-sm"
            >
              {statusInfo.btnText}
            </button>
            {(sub.status === "PENDING_MINERU" || sub.status === "EXTRACTION_FAILED") && (
              <button 
                onClick={(e) => { e.stopPropagation(); triggerMinerU(sub.id); }}
                className={`flex items-center gap-1 text-white px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${sub.status === "EXTRACTION_FAILED" ? "bg-red-600 hover:bg-red-700 focus-visible:ring-red-600" : "bg-[var(--ls-accent)] hover:brightness-90 focus-visible:ring-[var(--ls-accent)]"}`}
                title={sub.status === "EXTRACTION_FAILED" ? "Retry Extraction" : "Extract with MinerU"}
              >
                {sub.status === "EXTRACTION_FAILED" ? <RefreshCw size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
                {sub.status === "EXTRACTION_FAILED" ? "Retry" : "Extract"}
              </button>
            )}
            <button 
              className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
              aria-label="More actions"
            >
              <MoreHorizontal size={18} aria-hidden="true" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  const pendingActionCount = displayedSubmissions.filter(s => s.status === "PENDING_USER_VALIDATION" || s.status === "CHANGES_REQUESTED").length;
  const approvedCount = displayedSubmissions.filter(s => s.status === "APPROVED" || s.status === "COMPLETED").length;
  
  // Maintainer specific counts
  const maintainerQueueCount = submissions.filter(s => s.status === "PENDING_MINERU").length;
  const awaitingReviewCount = submissions.filter(s => s.status === "PENDING_MAINTAINER_VERIFICATION").length;
  const urgentReviewsCount = submissions.filter(s => s.status === "PENDING_MAINTAINER_VERIFICATION" && (new Date().getTime() - new Date(s.createdAt).getTime() > 24 * 60 * 60 * 1000)).length;
  const validationPendingCount = submissions.filter(s => s.status === "PENDING_USER_VALIDATION").length;
  const changesRequestedCount = submissions.filter(s => s.status === "CHANGES_REQUESTED").length;
  const stalledCount = submissions.filter(s => (s.status === "PENDING_USER_VALIDATION" || s.status === "CHANGES_REQUESTED") && (new Date().getTime() - new Date(s.createdAt).getTime() > 7 * 24 * 60 * 60 * 1000)).length;

  let dashboardTitle = "Maintainer Dashboard: System Triage";
  if (!isMaintainer) {
    dashboardTitle = "Contributor Dashboard: Manage and Track Your Submissions";
  } else if (tab === 'review') {
    dashboardTitle = "Maintainer Dashboard: Review Queue";
  } else if (tab === 'waiting') {
    dashboardTitle = "Maintainer Dashboard: Waiting on User";
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8 font-sans w-full">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-[var(--ls-text-primary)]">
          {dashboardTitle}
        </h1>
        {!isMaintainer && (
          <button 
            onClick={() => router.push('/add')}
            className="bg-[var(--ls-accent)] hover:brightness-90 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--ls-accent)] flex items-center gap-2 self-start sm:self-auto"
          >
            <Upload size={18} aria-hidden="true" />
            Submit New Paper
          </button>
        )}
      </header>
      
      {loading ? (
        <div className="flex flex-col justify-center items-center py-32 text-[var(--ls-text-secondary)]" aria-live="polite">
          <Loader2 className="animate-spin text-[var(--ls-accent)] mb-4" size={40} />
          <p className="text-sm font-medium">Loading your dashboard...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          {isMaintainer ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {tab === 'review' ? (
                <>
                  <div className="bg-white border border-[var(--ls-border)] rounded-xl p-5 flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-14 h-14 rounded-2xl bg-[var(--ls-accent)] flex items-center justify-center shrink-0 shadow-inner">
                      <FileCheck className="text-white" size={26} aria-hidden="true" /> 
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--ls-text-secondary)] mb-0.5">Papers to Review</p>
                      <p className="text-2xl font-bold text-[var(--ls-text-primary)] leading-tight">{awaitingReviewCount}</p>
                      <p className="text-xs text-[var(--ls-text-secondary)] font-medium mt-1">Awaiting Action</p>
                    </div>
                  </div>
                  <div className="bg-white border border-[var(--ls-border)] rounded-xl p-5 flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center shrink-0 shadow-inner">
                      <AlertCircle className="text-white" size={26} aria-hidden="true" /> 
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--ls-text-secondary)] mb-0.5">Urgent Reviews</p>
                      <p className="text-2xl font-bold text-amber-600 leading-tight">{urgentReviewsCount}</p>
                      <p className="text-xs text-[var(--ls-text-secondary)] font-medium mt-1">Waiting &gt; 24h</p>
                    </div>
                  </div>
                  <div className="bg-white border border-[var(--ls-border)] rounded-xl p-5 flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-500 flex items-center justify-center shrink-0 shadow-inner">
                      <Clock className="text-white" size={26} aria-hidden="true" /> 
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--ls-text-secondary)] mb-0.5">Avg Review Time</p>
                      <p className="text-2xl font-bold text-[var(--ls-text-primary)] leading-tight">2.1 Hrs</p>
                      <p className="text-xs text-[var(--ls-text-secondary)] font-medium mt-1">SLA Speed</p>
                    </div>
                  </div>
                </>
              ) : tab === 'waiting' ? (
                <>
                  <div className="bg-white border border-[var(--ls-border)] rounded-xl p-5 flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-14 h-14 rounded-2xl bg-teal-500 flex items-center justify-center shrink-0 shadow-inner">
                      <UserCheck className="text-white" size={26} aria-hidden="true" /> 
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--ls-text-secondary)] mb-0.5">Validation Pending</p>
                      <p className="text-2xl font-bold text-[var(--ls-text-primary)] leading-tight">{validationPendingCount}</p>
                      <p className="text-xs text-[var(--ls-text-secondary)] font-medium mt-1">Fresh Extractions</p>
                    </div>
                  </div>
                  <div className="bg-white border border-[var(--ls-border)] rounded-xl p-5 flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center shrink-0 shadow-inner">
                      <UserCog className="text-white" size={26} aria-hidden="true" /> 
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--ls-text-secondary)] mb-0.5">Changes Requested</p>
                      <p className="text-2xl font-bold text-[var(--ls-text-primary)] leading-tight">{changesRequestedCount}</p>
                      <p className="text-xs text-[var(--ls-text-secondary)] font-medium mt-1">Awaiting Fixes</p>
                    </div>
                  </div>
                  <div className="bg-white border border-[var(--ls-border)] rounded-xl p-5 flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-14 h-14 rounded-2xl bg-rose-500 flex items-center justify-center shrink-0 shadow-inner">
                      <Clock className="text-white" size={26} aria-hidden="true" /> 
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--ls-text-secondary)] mb-0.5">Stalled Submissions</p>
                      <p className="text-2xl font-bold text-rose-600 leading-tight">{stalledCount}</p>
                      <p className="text-xs text-[var(--ls-text-secondary)] font-medium mt-1">Waiting &gt; 7 Days</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-white border border-[var(--ls-border)] rounded-xl p-5 flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-14 h-14 rounded-2xl bg-[var(--ls-accent)] flex items-center justify-center shrink-0 shadow-inner">
                      <CloudUpload className="text-white" size={26} aria-hidden="true" /> 
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--ls-text-secondary)] mb-0.5">Extraction Queue</p>
                      <p className="text-2xl font-bold text-[var(--ls-text-primary)] leading-tight">{maintainerQueueCount}</p>
                      <p className="text-xs text-[var(--ls-text-secondary)] font-medium mt-1">Pipeline (MinerU)</p>
                    </div>
                  </div>
                  
                  <div className="bg-white border border-[var(--ls-border)] rounded-xl p-5 flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-14 h-14 rounded-2xl bg-[var(--ls-accent)] flex items-center justify-center shrink-0 shadow-inner">
                      <FileCheck className="text-white" size={26} aria-hidden="true" /> 
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--ls-text-secondary)] mb-0.5">Awaiting Review</p>
                      <p className="text-2xl font-bold text-[var(--ls-text-primary)] leading-tight">{awaitingReviewCount}</p>
                      <p className="text-xs text-[var(--ls-text-secondary)] font-medium mt-1">User Validated</p>
                    </div>
                  </div>
                  
                  <div className="bg-white border border-[var(--ls-border)] rounded-xl p-5 flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-500 flex items-center justify-center shrink-0 shadow-inner">
                      <Clock className="text-white" size={26} aria-hidden="true" /> 
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--ls-text-secondary)] mb-0.5">Avg Turnaround</p>
                      <p className="text-2xl font-bold text-[var(--ls-text-primary)] leading-tight">1.8 Days</p>
                      <p className="text-xs text-[var(--ls-text-secondary)] font-medium mt-1">System SLA</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 max-w-5xl">
              <div className="bg-white border border-[var(--ls-border)] rounded-xl p-5 flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-14 h-14 rounded-2xl bg-[var(--ls-accent)] flex items-center justify-center shrink-0 shadow-inner">
                  <Upload className="text-white" size={26} aria-hidden="true" /> 
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--ls-text-secondary)] mb-0.5">Total Uploads</p>
                  <p className="text-2xl font-bold text-[var(--ls-text-primary)] leading-tight">{displayedSubmissions.length}</p>
                </div>
              </div>
              
              <div className="bg-white border border-[var(--ls-border)] rounded-xl p-5 flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center shrink-0 shadow-inner">
                  <AlertTriangle className="text-white" size={26} aria-hidden="true" /> 
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--ls-text-secondary)] mb-0.5">Pending Your Action</p>
                  <p className="text-2xl font-bold text-[var(--ls-text-primary)] leading-tight">{pendingActionCount}</p>
                </div>
              </div>
              
              <div className="bg-white border border-[var(--ls-border)] rounded-xl p-5 flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-14 h-14 rounded-2xl bg-green-500 flex items-center justify-center shrink-0 shadow-inner">
                  <CheckCircle className="text-white" size={26} aria-hidden="true" /> 
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--ls-text-secondary)] mb-0.5">Fully Approved</p>
                  <p className="text-2xl font-bold text-[var(--ls-text-primary)] leading-tight">{approvedCount}</p>
                </div>
              </div>
            </div>
          )}

          {/* List/Table of Submissions */}
          {isMaintainer ? (
            <>
              {/* Filters */}
              <div className="flex flex-wrap gap-4 mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="flex items-center gap-2.5">
                  <span className="text-sm font-medium text-slate-600">Status:</span>
                  <select 
                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-[var(--ls-text-primary)] bg-white shadow-sm outline-none focus:ring-2 focus:ring-[var(--ls-accent)] focus:border-[var(--ls-accent)] transition-shadow" 
                    value={statusFilter} 
                    onChange={e => setStatusFilter(e.target.value)}
                  >
                    <option>All Statuses</option>
                    <option>Waiting for Maintainer</option>
                    <option>All Waiting on User</option>
                    <option>Waiting on User</option>
                    <option>In Review</option>
                    <option>Waiting on User (Changes Requested)</option>
                    <option>Approved</option>
                  </select>
                </label>
                <label className="flex items-center gap-2.5">
                  <span className="text-sm font-medium text-slate-600">Subject:</span>
                  <select 
                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-[var(--ls-text-primary)] bg-white shadow-sm outline-none focus:ring-2 focus:ring-[var(--ls-accent)] focus:border-[var(--ls-accent)] transition-shadow" 
                    value={subjectFilter} 
                    onChange={e => setSubjectFilter(e.target.value)}
                  >
                    <option>All Subjects</option>
                    <option>Physics</option>
                    <option>Chemistry</option>
                    <option>Mathematics</option>
                    <option>Biology</option>
                  </select>
                </label>
                <label className="flex items-center gap-2.5">
                  <span className="text-sm font-medium text-slate-600">Type:</span>
                  <select 
                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-[var(--ls-text-primary)] bg-white shadow-sm outline-none focus:ring-2 focus:ring-[var(--ls-accent)] focus:border-[var(--ls-accent)] transition-shadow" 
                    value={examTypeFilter} 
                    onChange={e => setExamTypeFilter(e.target.value)}
                  >
                    <option>All Types</option>
                    <option>A/L</option>
                    <option>O/L</option>
                  </select>
                </label>
              </div>

              {/* Triage Table */}
              <div className="bg-white border border-[var(--ls-border)] rounded-xl shadow-sm overflow-hidden mb-12">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3.5 text-sm font-semibold text-slate-600 w-12 text-center">
                          <input 
                            type="checkbox" 
                            className="rounded border-slate-300 text-[var(--ls-accent)] focus:ring-[var(--ls-accent)]"
                            aria-label="Select all submissions"
                          />
                        </th>
                        <th className="px-4 py-3.5 text-sm font-semibold text-slate-600">Paper Info</th>
                        <th className="px-4 py-3.5 text-sm font-semibold text-slate-600">Submitter</th>
                        <th className="px-4 py-3.5 text-sm font-semibold text-slate-600">Time in State</th>
                        <th className="px-4 py-3.5 text-sm font-semibold text-slate-600">Status</th>
                        <th className="px-4 py-3.5 text-sm font-semibold text-slate-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayedSubmissions.map(sub => renderMaintainerRow(sub))}
                    </tbody>
                  </table>
                </div>
                {displayedSubmissions.length === 0 && (
                  <div className="p-16 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <FileCheck className="text-slate-300" size={32} aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700 mb-1">Queue is clear</h3>
                    <p className="text-sm text-slate-500 max-w-sm">No submissions match your current filters. Adjust your filters or relax constraints to see more.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="max-w-5xl">
              {displayedSubmissions.length === 0 ? (
                <div className="text-center py-20 px-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 text-slate-400">
                    <CloudUpload size={32} aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">No Submissions Yet</h3>
                  <p className="text-slate-500 mb-6 max-w-md">You haven&apos;t uploaded any exam papers for extraction yet. Help the community by contributing a past paper.</p>
                  <button 
                    onClick={() => router.push('/add')} 
                    className="bg-[var(--ls-accent)] hover:brightness-90 text-white px-6 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--ls-accent)]"
                  >
                    Upload Your First Paper
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4 pb-12">
                  {displayedSubmissions.map(sub => renderContributorRow(sub))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AppShell>
      <Suspense fallback={
        <div className="flex flex-col justify-center items-center py-32 text-[var(--ls-text-secondary)]">
          <Loader2 className="animate-spin text-[var(--ls-accent)] mb-4" size={40} />
          <p className="text-sm font-medium">Loading...</p>
        </div>
      }>
        <DashboardContent />
      </Suspense>
    </AppShell>
  );
}
