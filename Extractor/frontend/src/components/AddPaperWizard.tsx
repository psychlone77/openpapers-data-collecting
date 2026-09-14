"use client";

import { useState, useRef, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { useAuthStore } from "@/store/useAuthStore";
import { UploadCloud, CheckCircle2, X, Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const BASE_URL = "http://localhost:8000";

// ─── Constants ───────────────────────────────────────────────────────────────

const AL_SUBJECTS = ["Physics", "Chemistry", "Biology", "Mathematics", "Accounting", "Economics", "Business Studies", "IT"];
const OL_SUBJECTS = ["Science", "Mathematics", "English", "Sinhala", "Tamil", "History", "Geography", "Civics", "Buddhism"];
const SCHOLARSHIP_SUBJECTS = ["Mathematics", "Sinhala", "English", "Science", "Social Studies"];

const SUBJECTS_BY_EXAM: Record<string, string[]> = {
  "A/L": AL_SUBJECTS,
  "O/L": OL_SUBJECTS,
  "Grade 5": SCHOLARSHIP_SUBJECTS,
};

// ─── Range formatter: [2,3,4,5,6] → "2-6" ───────────────────────────────────

function pagesToRangeString(pages: number[]): string {
  if (pages.length === 0) return "";
  const sorted = [...pages].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = sorted[i];
      end = sorted[i];
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return ranges.join(", ");
}

// ─── Real PDF Page Thumbnail ──────────────────────────────────────────────────

function PageThumbnail({
  file,
  pageNum,
  selected,
  onToggle,
}: {
  file: File;
  pageNum: number;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={onToggle}
        aria-label={`Toggle selection for page ${pageNum}`}
        aria-pressed={selected}
        className={`relative w-full aspect-[1/1.41] rounded-lg overflow-hidden border-2 transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-[var(--ls-accent)] group
          ${selected
            ? "border-[var(--ls-accent)] shadow-[0_0_0_1px_var(--ls-accent)]"
            : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
          }`}
      >
        {/* Real PDF page via react-pdf */}
        <div className="absolute inset-0 bg-white [&_.react-pdf__Page]:w-full [&_.react-pdf__Page]:h-full [&_.react-pdf__Page]:flex [&_.react-pdf__Page]:items-center [&_.react-pdf__Page]:justify-center [&_canvas]:!w-full [&_canvas]:!h-full [&_canvas]:!object-cover">
          <Document file={file} loading={null}>
            <Page
              pageNumber={pageNum}
              width={250}
              devicePixelRatio={typeof window !== "undefined" ? Math.max(window.devicePixelRatio || 1, 2) : 2}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>
        </div>

        {/* Dim unselected */}
        {!selected && (
          <div className="absolute inset-0 bg-white/40 group-hover:bg-transparent transition-colors" />
        )}

        {/* Selection badge — top right */}
        <div className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center transition-all shadow-sm
          ${selected
            ? "bg-[var(--ls-accent)]"
            : "border-2 border-slate-300 border-dashed bg-white/90 backdrop-blur-sm"
          }`}
        >
          {selected && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </button>
      <span className={`text-[11px] font-semibold tracking-wide uppercase ${selected ? "text-[var(--ls-accent)]" : "text-slate-400"}`}>
        Page {pageNum}
      </span>
    </div>
  );
}

// ─── Right Panel ─────────────────────────────────────────────────────────────

function RightPanel({
  file,
  examination,
  setExamination,
  subject,
  setSubject,
  year,
  setYear,
  paperType,
  setPaperType,
  language,
  setLanguage,
  numPages,
  selectedPages,
  onClose,
  onSubmit,
  isProcessing,
  error,
}: {
  file: File;
  examination: string;
  setExamination: (v: string) => void;
  subject: string;
  setSubject: (v: string) => void;
  year: string;
  setYear: (v: string) => void;
  paperType: string;
  setPaperType: (v: string) => void;
  language: string;
  setLanguage: (v: string) => void;
  numPages: number;
  selectedPages: number[];
  onClose: () => void;
  onSubmit: () => void;
  isProcessing: boolean;
  error: string | null;
}) {
  const [subjectSearch, setSubjectSearch] = useState("");
  const [showSubjectDrop, setShowSubjectDrop] = useState(false);
  const subjects = SUBJECTS_BY_EXAM[examination] || AL_SUBJECTS;
  const filtered = subjects.filter((s) => s.toLowerCase().includes(subjectSearch.toLowerCase()));
  const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);

  return (
    <div className="w-[280px] shrink-0 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
      {/* File header */}
      <div className="px-5 pt-5 pb-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0 shadow-sm">
              <svg width="20" height="22" viewBox="0 0 18 20" fill="none" aria-hidden="true">
                <path d="M11 1H3C1.9 1 1 1.9 1 3V17C1 18.1 1.9 19 3 19H15C16.1 19 17 18.1 17 17V7L11 1Z" fill="#fee2e2" stroke="#ef4444" strokeWidth="1.2" />
                <path d="M11 1V7H17" stroke="#ef4444" strokeWidth="1.2" strokeLinejoin="round" />
                <text x="3.5" y="15" fill="#ef4444" fontSize="4.5" fontWeight="700" fontFamily="monospace">PDF</text>
              </svg>
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="text-[13px] font-bold text-slate-800 break-all line-clamp-2 leading-tight">
                {file.name}
              </p>
              <p className="text-[11px] font-medium text-slate-500 mt-1">
                {fileSizeMB} MB <span className="mx-1">•</span> {numPages > 0 ? `${numPages} Pages` : "Loading…"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="shrink-0 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ls-accent)]"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
        {/* Exam Type toggle */}
        <div>
          <span className="block text-[13px] font-bold text-slate-700 mb-2.5">Exam Type</span>
          <div className="flex bg-slate-100 rounded-lg p-1">
            {Object.keys(SUBJECTS_BY_EXAM).map((opt) => (
              <button
                key={opt}
                type="button"
                aria-pressed={examination === opt}
                onClick={() => {
                  setExamination(opt);
                  setSubject(SUBJECTS_BY_EXAM[opt][0]);
                  setSubjectSearch("");
                  setShowSubjectDrop(false);
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ls-accent)] ${
                  examination === opt
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div>
          <span className="block text-[13px] font-bold text-slate-700 mb-2.5" id="subject-label">Subject</span>
          <div className="relative">
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={showSubjectDrop}
              aria-labelledby="subject-label subject-value"
              className="w-full flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 cursor-pointer hover:border-slate-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ls-accent)] focus-visible:border-transparent"
              onClick={() => setShowSubjectDrop((v) => !v)}
            >
              <span id="subject-value" className="flex-1 text-sm font-medium text-slate-900 text-left">{subject}</span>
              <Search size={14} className="text-slate-400 shrink-0" aria-hidden="true" />
            </button>
            {showSubjectDrop && (
              <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden">
                <div className="p-2 border-b border-slate-100 bg-slate-50/50">
                  <input
                    autoFocus
                    value={subjectSearch}
                    onChange={(e) => setSubjectSearch(e.target.value)}
                    placeholder="Search subject…"
                    aria-label="Search subject"
                    className="w-full text-sm px-3 py-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--ls-accent)] focus:border-transparent transition-shadow"
                  />
                </div>
                <ul className="max-h-48 overflow-y-auto py-1" role="listbox">
                  {filtered.map((s) => (
                    <li key={s} role="option" aria-selected={s === subject}>
                      <button
                        type="button"
                        onClick={() => { setSubject(s); setSubjectSearch(""); setShowSubjectDrop(false); }}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors focus:outline-none focus-visible:bg-slate-100 ${
                          s === subject ? "text-[var(--ls-accent)] font-bold bg-[var(--ls-accent)]/5" : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {s}
                      </button>
                    </li>
                  ))}
                  {filtered.length === 0 && (
                    <li className="px-4 py-3 text-sm text-slate-500 italic text-center">No subjects found</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Year */}
        <div>
          <label htmlFor="year-input" className="block text-[13px] font-bold text-slate-700 mb-2.5">Year</label>
          <input
            id="year-input"
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            min={1990}
            max={2030}
            className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--ls-accent)] focus:border-transparent transition-all shadow-sm"
          />
        </div>

        {/* Paper Type */}
        <div>
          <label htmlFor="paper-type-select" className="block text-[13px] font-bold text-slate-700 mb-2.5">Paper Type</label>
          <select
            id="paper-type-select"
            value={paperType}
            onChange={(e) => setPaperType(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--ls-accent)] focus:border-transparent transition-all shadow-sm"
          >
            <option value="MCQ">MCQ</option>
            <option value="Structured Essay">Structured Essay</option>
            <option value="Essay">Essay</option>
          </select>
        </div>

        {/* Language */}
        <div>
          <label htmlFor="language-select" className="block text-[13px] font-bold text-slate-700 mb-2.5">Language</label>
          <select
            id="language-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--ls-accent)] focus:border-transparent transition-all shadow-sm"
          >
            <option value="en">English</option>
            <option value="si">Sinhala</option>
            <option value="ta">Tamil</option>
          </select>
        </div>

        {/* Pages to Extract */}
        <div>
          <label htmlFor="pages-input" className="block text-[13px] font-bold text-slate-700 mb-2.5">Pages to Extract</label>
          <input
            id="pages-input"
            type="text"
            readOnly
            value={pagesToRangeString(selectedPages)}
            placeholder="No pages selected"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-700 cursor-not-allowed focus:outline-none shadow-inner"
          />
          <p className="text-[11px] font-medium text-slate-500 mt-1.5 flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            Verify selection in the grid.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 flex items-start gap-2.5 mt-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 mt-0.5 shrink-0"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <p className="text-[13px] font-medium text-red-800 leading-snug">{error}</p>
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="px-5 pb-5 pt-4 border-t border-slate-100 bg-white">
        <button
          onClick={onSubmit}
          disabled={selectedPages.length === 0 || isProcessing}
          className="w-full bg-[var(--ls-accent)] text-white text-sm font-bold py-3 rounded-xl hover:brightness-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--ls-accent)]"
        >
          {isProcessing ? (
            <><Loader2 size={18} className="animate-spin" /> Submitting…</>
          ) : (
            "Submit for Extraction"
          )}
        </button>
        {isProcessing && (
          <p className="text-[11px] font-medium text-slate-500 text-center mt-2.5 leading-relaxed">
            Uploading PDF and queuing for MinerU…
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Step 1: Upload ───────────────────────────────────────────────────────────

function Step1({ onFileAccepted }: { onFileAccepted: (file: File) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handle = (file: File | undefined) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Only PDF files are accepted.");
      return;
    }
    setError(null);
    onFileAccepted(file);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 p-6 sm:p-8">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm w-full max-w-xl p-8 sm:p-12 flex flex-col items-center gap-6 text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center gap-3">
          <span className="bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm">Step 1 of 2</span>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Add New Paper</h1>
          <p className="text-slate-500 font-medium text-sm">Upload a past paper PDF to begin the extraction process.</p>
        </div>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); handle(e.dataTransfer.files[0]); }}
          className={`w-full border-2 border-dashed rounded-2xl p-14 flex flex-col items-center gap-4 cursor-pointer transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-[var(--ls-accent)] ${
            isDragging ? "border-[var(--ls-accent)] bg-blue-50/50 scale-[1.02] shadow-sm" : "border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400"
          }`}
          aria-label="Upload PDF document"
        >
          <div className={`p-4 rounded-full mb-1 transition-colors ${isDragging ? "bg-blue-100" : "bg-white shadow-sm border border-slate-200"}`}>
            <UploadCloud size={40} className={isDragging ? "text-[var(--ls-accent)]" : "text-slate-400"} aria-hidden="true" />
          </div>
          <div>
            <p className="text-base font-bold text-slate-700">Click to upload PDF</p>
            <p className="text-[13px] font-medium text-slate-500 mt-1.5">or drag and drop <span className="mx-1.5 opacity-50">•</span> PDF up to 50 MB</p>
          </div>
        </button>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 py-3 px-4 flex items-center gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 shrink-0"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <p className="text-[13px] font-bold text-red-800">{error}</p>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => handle(e.target.files?.[0])}
          tabIndex={-1}
        />
      </div>
    </div>
  );
}

// ─── Step 2: Define Extraction ────────────────────────────────────────────────

function Step2({
  file,
  examination,
  setExamination,
  subject,
  setSubject,
  year,
  setYear,
  paperType,
  setPaperType,
  language,
  setLanguage,
  selectedPages,
  setSelectedPages,
  onSubmit,
  isProcessing,
  error,
  onBack,
}: {
  file: File;
  examination: string;
  setExamination: (v: string) => void;
  subject: string;
  setSubject: (v: string) => void;
  year: string;
  setYear: (v: string) => void;
  paperType: string;
  setPaperType: (v: string) => void;
  language: string;
  setLanguage: (v: string) => void;
  selectedPages: number[];
  setSelectedPages: (p: number[]) => void;
  onSubmit: () => void;
  isProcessing: boolean;
  error: string | null;
  onBack: () => void;
}) {
  const [numPages, setNumPages] = useState(0);

  const toggle = (n: number) => {
    setSelectedPages(
      selectedPages.includes(n)
        ? selectedPages.filter((p) => p !== n)
        : [...selectedPages, n].sort((a, b) => a - b)
    );
  };

  const selectAll = () => setSelectedPages(Array.from({ length: numPages }, (_, i) => i + 1));
  const clearAll = () => setSelectedPages([]);
  const allSelected = numPages > 0 && selectedPages.length === numPages;
  // Resolve page count directly via pdfjs — works regardless of render visibility
  useEffect(() => {
    let cancelled = false;
    const url = URL.createObjectURL(file);
    console.log("[Step2] Loading PDF to get page count...");
    pdfjs.getDocument(url).promise.then(({ numPages: n }) => {
      if (cancelled) return;
      console.log("[Step2] PDF loaded, numPages:", n);
      setNumPages(n);
      // Always auto-select all pages when entering step 2
      setSelectedPages(Array.from({ length: n }, (_, i) => i + 1));
    }).catch((err) => {
      console.error("[Step2] Failed to load PDF:", err);
    }).finally(() => {
      URL.revokeObjectURL(url);
    });
    return () => { cancelled = true; };
  }, [file]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-load document once to know numPages (hidden)
  return (
    <div className="w-full h-full overflow-auto bg-slate-50 flex flex-col">
      <div className="shrink-0 px-8 pt-6 pb-2">
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Step 2 of 2</span>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Define Extraction</h1>
        </div>
      </div>

      <div className="px-8 pb-8 pt-4 flex gap-6 items-start min-h-0 flex-1">
        {/* ── Left: Page Grid ── */}
        <div className="flex-1 min-w-0 h-full flex flex-col bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <label className="flex items-center gap-3 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={allSelected ? clearAll : selectAll}
                className="w-4.5 h-4.5 rounded border-slate-300 text-[var(--ls-accent)] focus:ring-[var(--ls-accent)] cursor-pointer transition-shadow"
                aria-label="Select all pages"
              />
              <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">Select All Pages</span>
            </label>
            <div className="flex-1" />
            <button
              type="button"
              onClick={clearAll}
              className="px-3.5 py-2 text-xs font-bold border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[var(--ls-accent)] shadow-sm"
            >
              Clear Selection
            </button>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto">
            {numPages === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-400">
                <Loader2 size={32} className="animate-spin text-[var(--ls-accent)]" aria-hidden="true" />
                <p className="text-sm font-semibold">Loading PDF preview…</p>
              </div>
            ) : (
              <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {Array.from({ length: numPages }, (_, i) => i + 1).map((n) => (
                  <PageThumbnail
                    key={n}
                    file={file}
                    pageNum={n}
                    selected={selectedPages.includes(n)}
                    onToggle={() => toggle(n)}
                  />
                ))}
              </div>
            )}
          </div>

          {numPages > 0 && (
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 shrink-0">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                {selectedPages.length} of {numPages} pages selected
              </p>
            </div>
          )}
        </div>

        {/* ── Right: Panel ── */}
        <RightPanel
          file={file}
          examination={examination}
          setExamination={setExamination}
          subject={subject}
          setSubject={setSubject}
          year={year}
          setYear={setYear}
          paperType={paperType}
          setPaperType={setPaperType}
          language={language}
          setLanguage={setLanguage}
          numPages={numPages}
          selectedPages={selectedPages}
          onClose={onBack}
          onSubmit={onSubmit}
          isProcessing={isProcessing}
          error={error}
        />
      </div>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export function AddPaperWizard() {
  const {
    pdfFile, setPdfFile,
    paperType, setPaperType,
    language, setLanguage,
    year, setYear,
    examination, setExamination,
    subject, setSubject,
    selectedPages, setSelectedPages,
    setUploadedPdfPath,
    setSubmissionId,
  } = useStore();

  const { currentUser } = useAuthStore();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const handleFileAccepted = (file: File) => {
    setPdfFile(file);
    setSelectedPages([]); // will be auto-selected once page count loads
    setError(null);
    setStep(2);
  };

  const handleSubmit = async () => {
    console.log("[AddPaperWizard] handleSubmit triggered", { hasPdfFile: !!pdfFile, selectedPages });
    if (!pdfFile || selectedPages.length === 0) {
      console.warn("[AddPaperWizard] early return — pdfFile:", !!pdfFile, "pages:", selectedPages);
      return;
    }
    setIsProcessing(true);
    setError(null);

    try {
      // ── 1. Upload PDF ──────────────────────────────────────────────────────
      const fd = new FormData();
      fd.append("file", pdfFile);

      const uploadRes = await fetch(`${BASE_URL}/pdf/upload`, {
        method: "POST",
        body: fd,
      });

      if (!uploadRes.ok) {
        const detail = await uploadRes.json().catch(() => ({}));
        throw new Error(detail?.detail ?? `Upload failed (${uploadRes.status})`);
      }

      const { pdf_path } = await uploadRes.json();
      setUploadedPdfPath(pdf_path);

      // ── 2. Add to Queue ────────────────────────────────────────────────────
      const queueRes = await fetch(`${BASE_URL}/api/queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdf_path,
          metadata: {
            language,
            paperType,
            year,
            examination,
            subject,
          },
          pages: selectedPages,
          submitter_id: currentUser?.id,
        }),
      });

      if (!queueRes.ok) {
        const detail = await queueRes.json().catch(() => ({}));
        throw new Error(detail?.detail ?? `Queue failed (${queueRes.status})`);
      }

      const { id } = await queueRes.json();
      setSubmissionId(id);
      setSubmittedId(id);
      setShowSuccess(true);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Success ──────────────────────────────────────────────────────────────
  if (showSuccess) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 p-6 sm:p-8 animate-in fade-in duration-300">
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-10 sm:p-14 flex flex-col items-center max-w-lg w-full text-center">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-green-100">
            <CheckCircle2 size={40} className="text-green-500" aria-hidden="true" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">Added to Queue</h2>
          <p className="text-slate-500 text-sm font-medium leading-relaxed mb-4 max-w-xs mx-auto">
            Your paper has been queued. Once the maintainers trigger MinerU processing,
            you will be notified to validate the extraction.
          </p>
          {submittedId && (
            <p className="text-[11px] font-bold text-slate-400 font-mono mb-8 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-100">
              ID: {submittedId}
            </p>
          )}
          <div className="flex flex-col gap-3.5 w-full max-w-sm">
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full bg-[var(--ls-accent)] text-white font-bold py-3 rounded-xl hover:brightness-90 transition-all shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--ls-accent)]"
            >
              Return to Dashboard
            </button>
            <button
              onClick={() => {
                setShowSuccess(false);
                setPdfFile(null);
                setSelectedPages([]);
                setSubmittedId(null);
                setStep(1);
              }}
              className="w-full bg-white border border-slate-300 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-colors text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-300"
            >
              Add Another Paper
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-slate-50">
      {step === 1 ? (
        <Step1 onFileAccepted={handleFileAccepted} />
      ) : (
        pdfFile && (
          <Step2
            file={pdfFile}
            examination={examination}
            setExamination={setExamination}
            subject={subject}
            setSubject={setSubject}
            year={year}
            setYear={setYear}
            paperType={paperType}
            setPaperType={setPaperType}
            language={language}
            setLanguage={setLanguage}
            selectedPages={selectedPages}
            setSelectedPages={setSelectedPages}
            onSubmit={handleSubmit}
            isProcessing={isProcessing}
            error={error}
            onBack={() => { setPdfFile(null); setSelectedPages([]); setError(null); setStep(1); }}
          />
        )
      )}
    </div>
  );
}
