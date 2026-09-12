"use client";

import { useEffect, useState, Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { FileText, CheckCircle, AlertTriangle, Loader2, Upload, CloudUpload, FileCheck, Clock, MoreHorizontal, Play, AlertCircle, UserCheck, UserCog } from "lucide-react";
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
      "PENDING_MINERU": { label: "Waiting for Maintainer", badgeClass: "bg-blue-100 text-blue-700", btnClass: "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200", btnText: "View Details", action: () => router.push(`/validate/${sub.id}`) },
      "PROCESSING_EXTRACTION": { label: "Waiting for Maintainer", badgeClass: "bg-blue-100 text-blue-700", btnClass: "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200", btnText: "View Details", action: () => router.push(`/validate/${sub.id}`) },
      "PENDING_USER_VALIDATION": { label: "Action Required: Validate Extraction", badgeClass: "bg-orange-100 text-orange-800", btnClass: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm", btnText: "Open Studio", action: () => router.push(`/validate/${sub.id}`) },
      "PENDING_MAINTAINER_VERIFICATION": { label: "In Review", badgeClass: "bg-blue-100 text-blue-700", btnClass: "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200", btnText: "View Details", action: () => router.push(`/validate/${sub.id}`) },
      "CHANGES_REQUESTED": { label: "Action Required: Address Feedback", badgeClass: "bg-orange-100 text-orange-800", btnClass: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm", btnText: "Open Studio", action: () => router.push(`/validate/${sub.id}`) },
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

  const renderMaintainerRow = (sub: any) => {
    const metadata = typeof sub.metadata === 'string' ? JSON.parse(sub.metadata || "{}") : sub.metadata;
    
    const statusMap: Record<string, { label: string, badgeClass: string, btnText: string, action: () => void }> = {
      "PENDING_MINERU": { label: "Waiting for Maintainer", badgeClass: "bg-blue-100 text-blue-700", btnText: "Open Studio", action: () => router.push(`/validate/${sub.id}`) },
      "PROCESSING_EXTRACTION": { label: "Waiting for Maintainer", badgeClass: "bg-blue-100 text-blue-700", btnText: "Open Studio", action: () => router.push(`/validate/${sub.id}`) },
      "PENDING_USER_VALIDATION": { label: "Waiting on User", badgeClass: "bg-orange-100 text-orange-800", btnText: "Open Studio", action: () => router.push(`/validate/${sub.id}`) },
      "PENDING_MAINTAINER_VERIFICATION": { label: "In Review", badgeClass: "bg-blue-100 text-blue-700", btnText: "Review Now", action: () => router.push(`/validate/${sub.id}`) },
      "CHANGES_REQUESTED": { label: "Waiting on User (Changes Requested)", badgeClass: "bg-orange-100 text-orange-800", btnText: "Review Now", action: () => router.push(`/validate/${sub.id}`) },
      "APPROVED": { label: "Approved", badgeClass: "bg-green-100 text-green-700", btnText: "View Details", action: () => router.push(`/validate/${sub.id}`) },
      "COMPLETED": { label: "Approved", badgeClass: "bg-green-100 text-green-700", btnText: "View Details", action: () => router.push(`/validate/${sub.id}`) },
    };
    const statusInfo = statusMap[sub.status] || { label: sub.status, badgeClass: "bg-gray-100 text-gray-700", btnText: "View Details", action: () => router.push(`/validate/${sub.id}`) };

    return (
      <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
        <td className="px-4 py-4 text-sm text-[var(--ls-text-primary)] w-12 text-center">
          <input type="checkbox" className="rounded" />
        </td>
        <td className="px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center shrink-0">
               <FileText size={16} className="text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-[var(--ls-text-primary)] text-sm">{metadata?.year || "Unknown"} {metadata?.examination || ""} {metadata?.subject || "Paper"}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-4">
          <div className="flex items-center gap-2">
            {sub.submitter ? (
              <>
                <div className="w-6 h-6 rounded-full bg-orange-400 flex items-center justify-center text-white text-xs font-bold uppercase">
                  {sub.submitter.username.charAt(0)}
                </div>
                <span className="text-sm font-medium text-[var(--ls-text-primary)]">{sub.submitter.username}</span>
              </>
            ) : (
              <span className="text-sm text-[var(--ls-text-secondary)]">Unknown</span>
            )}
          </div>
        </td>
        <td className="px-4 py-4 text-sm text-[var(--ls-text-secondary)]">
          {getRelativeTime(sub.createdAt)}
        </td>
        <td className="px-4 py-4">
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusInfo.badgeClass}`}>
            {statusInfo.label}
          </span>
        </td>
        <td className="px-4 py-4">
          <div className="flex items-center gap-2">
            <button onClick={statusInfo.action} className="text-sm font-semibold text-[#253B6E] hover:underline whitespace-nowrap">
              {statusInfo.btnText}
            </button>
            {sub.status === "PENDING_MINERU" && (
              <button 
                onClick={(e) => { e.stopPropagation(); triggerMinerU(sub.id); }}
                className="flex items-center gap-1 bg-[#253B6E] text-white px-2 py-1 rounded text-xs hover:bg-blue-800 transition-colors"
                title="Extract with MinerU"
              >
                <Play size={12} /> Extract
              </button>
            )}
            <button className="p-1 hover:bg-gray-200 rounded text-gray-500">
              <MoreHorizontal size={16} />
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
    <div className="max-w-7xl mx-auto p-8 font-sans w-full">
      <h1 className="text-2xl font-bold text-[var(--ls-text-primary)] mb-8">
        {dashboardTitle}
      </h1>
      
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-[var(--ls-accent)]" size={32} />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          {isMaintainer ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {tab === 'review' ? (
                <>
                  <div className="bg-white border border-[var(--ls-border)] rounded-xl p-5 flex items-center gap-4 shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-[#253B6E] flex items-center justify-center shrink-0">
                      <FileCheck className="text-white" size={24} /> 
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--ls-text-primary)]">Papers to Review</p>
                      <p className="text-2xl font-bold text-[var(--ls-text-primary)] leading-tight">{awaitingReviewCount}</p>
                      <p className="text-xs text-[var(--ls-text-secondary)]">Awaiting Action</p>
                    </div>
                  </div>
                  <div className="bg-white border border-[var(--ls-border)] rounded-xl p-5 flex items-center gap-4 shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
                      <AlertCircle className="text-white" size={24} /> 
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--ls-text-primary)]">Urgent Reviews</p>
                      <p className="text-2xl font-bold text-[var(--ls-text-primary)] leading-tight">{urgentReviewsCount}</p>
                      <p className="text-xs text-[var(--ls-text-secondary)]">Waiting &gt; 24h</p>
                    </div>
                  </div>
                  <div className="bg-white border border-[var(--ls-border)] rounded-xl p-5 flex items-center gap-4 shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-[#253B6E] flex items-center justify-center shrink-0">
                      <Clock className="text-white" size={24} /> 
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--ls-text-primary)]">Average Review Time</p>
                      <p className="text-2xl font-bold text-[var(--ls-text-primary)] leading-tight">2.1 Hrs</p>
                      <p className="text-xs text-[var(--ls-text-secondary)]">SLA Speed</p>
                    </div>
                  </div>
                </>
              ) : tab === 'waiting' ? (
                <>
                  <div className="bg-white border border-[var(--ls-border)] rounded-xl p-5 flex items-center gap-4 shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-[#253B6E] flex items-center justify-center shrink-0">
                      <UserCheck className="text-white" size={24} /> 
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--ls-text-primary)]">Validation Pending</p>
                      <p className="text-2xl font-bold text-[var(--ls-text-primary)] leading-tight">{validationPendingCount}</p>
                      <p className="text-xs text-[var(--ls-text-secondary)]">Fresh Extractions</p>
                    </div>
                  </div>
                  <div className="bg-white border border-[var(--ls-border)] rounded-xl p-5 flex items-center gap-4 shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-[#253B6E] flex items-center justify-center shrink-0">
                      <UserCog className="text-white" size={24} /> 
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--ls-text-primary)]">Changes Requested</p>
                      <p className="text-2xl font-bold text-[var(--ls-text-primary)] leading-tight">{changesRequestedCount}</p>
                      <p className="text-xs text-[var(--ls-text-secondary)]">Awaiting Fixes</p>
                    </div>
                  </div>
                  <div className="bg-white border border-[var(--ls-border)] rounded-xl p-5 flex items-center gap-4 shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
                      <Clock className="text-white" size={24} /> 
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--ls-text-primary)]">Stalled Submissions</p>
                      <p className="text-2xl font-bold text-[var(--ls-text-primary)] leading-tight">{stalledCount}</p>
                      <p className="text-xs text-[var(--ls-text-secondary)]">Waiting &gt; 7 Days</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-white border border-[var(--ls-border)] rounded-xl p-5 flex items-center gap-4 shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-[#253B6E] flex items-center justify-center shrink-0">
                      <CloudUpload className="text-white" size={24} /> 
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--ls-text-primary)]">Extraction Queue</p>
                      <p className="text-2xl font-bold text-[var(--ls-text-primary)] leading-tight">{maintainerQueueCount}</p>
                      <p className="text-xs text-[var(--ls-text-secondary)]">Pipeline (MinerU)</p>
                    </div>
                  </div>
                  
                  <div className="bg-white border border-[var(--ls-border)] rounded-xl p-5 flex items-center gap-4 shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-[#253B6E] flex items-center justify-center shrink-0">
                      <FileCheck className="text-white" size={24} /> 
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--ls-text-primary)]">Awaiting Review</p>
                      <p className="text-2xl font-bold text-[var(--ls-text-primary)] leading-tight">{awaitingReviewCount}</p>
                      <p className="text-xs text-[var(--ls-text-secondary)]">User Validated</p>
                    </div>
                  </div>
                  
                  <div className="bg-white border border-[var(--ls-border)] rounded-xl p-5 flex items-center gap-4 shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-[#253B6E] flex items-center justify-center shrink-0">
                      <Clock className="text-white" size={24} /> 
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--ls-text-primary)]">Average Turnaround</p>
                      <p className="text-2xl font-bold text-[var(--ls-text-primary)] leading-tight">1.8 Days</p>
                      <p className="text-xs text-[var(--ls-text-secondary)]">System SLA</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 max-w-5xl">
              <div className="bg-white border border-[var(--ls-border)] rounded-xl p-5 flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-[#253B6E] flex items-center justify-center shrink-0">
                  <Upload className="text-white" size={24} /> 
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--ls-text-secondary)]">Total Uploads</p>
                  <p className="text-2xl font-bold text-[var(--ls-text-primary)]">{displayedSubmissions.length}</p>
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
          )}

          {/* List/Table of Submissions */}
          {isMaintainer ? (
            <>
              {/* Filters */}
              <div className="flex flex-wrap gap-6 mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--ls-text-primary)]">Filter by Status:</span>
                  <select 
                    className="border border-[var(--ls-border)] rounded-md px-3 py-1.5 text-sm text-[var(--ls-text-primary)] bg-white shadow-sm outline-none focus:ring-2 focus:ring-[var(--ls-accent)]" 
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
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--ls-text-primary)]">Filter by Subject:</span>
                  <select 
                    className="border border-[var(--ls-border)] rounded-md px-3 py-1.5 text-sm text-[var(--ls-text-primary)] bg-white shadow-sm outline-none focus:ring-2 focus:ring-[var(--ls-accent)]" 
                    value={subjectFilter} 
                    onChange={e => setSubjectFilter(e.target.value)}
                  >
                    <option>All Subjects</option>
                    <option>Physics</option>
                    <option>Chemistry</option>
                    <option>Mathematics</option>
                    <option>Biology</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--ls-text-primary)]">Filter by Exam Type:</span>
                  <select 
                    className="border border-[var(--ls-border)] rounded-md px-3 py-1.5 text-sm text-[var(--ls-text-primary)] bg-white shadow-sm outline-none focus:ring-2 focus:ring-[var(--ls-accent)]" 
                    value={examTypeFilter} 
                    onChange={e => setExamTypeFilter(e.target.value)}
                  >
                    <option>All Types</option>
                    <option>A/L</option>
                    <option>O/L</option>
                  </select>
                </div>
              </div>

              {/* Triage Table */}
              <div className="bg-white border border-[var(--ls-border)] rounded-xl shadow-sm overflow-hidden mb-12">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
                    <thead className="bg-[#f4f5f7] border-b border-[var(--ls-border)]">
                      <tr>
                        <th className="px-4 py-3 text-sm font-semibold text-[var(--ls-text-primary)] w-12 text-center">
                          <input type="checkbox" className="rounded border-gray-300" />
                        </th>
                        <th className="px-4 py-3 text-sm font-semibold text-[var(--ls-text-primary)]">Paper Info</th>
                        <th className="px-4 py-3 text-sm font-semibold text-[var(--ls-text-primary)]">Submitter</th>
                        <th className="px-4 py-3 text-sm font-semibold text-[var(--ls-text-primary)]">Time in State</th>
                        <th className="px-4 py-3 text-sm font-semibold text-[var(--ls-text-primary)]">Status</th>
                        <th className="px-4 py-3 text-sm font-semibold text-[var(--ls-text-primary)]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--ls-border)]">
                      {displayedSubmissions.map(sub => renderMaintainerRow(sub))}
                    </tbody>
                  </table>
                </div>
                {displayedSubmissions.length === 0 && (
                  <div className="p-12 text-center text-[var(--ls-text-secondary)]">No submissions match your filters.</div>
                )}
              </div>
            </>
          ) : (
            <div className="max-w-5xl">
              {displayedSubmissions.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-[var(--ls-border)] rounded-2xl bg-white">
                  <p className="text-[var(--ls-text-secondary)] mb-4">You haven&apos;t submitted anything yet.</p>
                  <button onClick={() => router.push('/add')} className="text-[var(--ls-accent)] hover:underline font-medium">
                    Submit your first paper
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
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-[var(--ls-accent)]" size={32} />
        </div>
      }>
        <DashboardContent />
      </Suspense>
    </AppShell>
  );
}
