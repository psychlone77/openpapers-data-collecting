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
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={onToggle}
        className={`relative w-full aspect-[1/1.41] rounded-lg overflow-hidden border-2 transition-all focus:outline-none group
          ${selected
            ? "border-blue-500 shadow-[0_0_0_1px_rgba(59,130,246,0.25)]"
            : "border-slate-200 hover:border-slate-300"
          }`}
      >
        {/* Real PDF page via react-pdf */}
        <div className="absolute inset-0 bg-white [&_.react-pdf__Page]:w-full [&_.react-pdf__Page]:h-full [&_.react-pdf__Page]:flex [&_.react-pdf__Page]:items-center [&_.react-pdf__Page]:justify-center [&_canvas]:!w-full [&_canvas]:!h-full [&_canvas]:!object-cover">
          <Document file={file} loading={null}>
            <Page
              pageNumber={pageNum}
              width={250}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>
        </div>

        {/* Dim unselected */}
        {!selected && (
          <div className="absolute inset-0 bg-white/40 group-hover:bg-white/20 transition-colors" />
        )}

        {/* Selection badge — top right */}
        <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-all
          ${selected
            ? "bg-blue-500 shadow-sm"
            : "border-2 border-slate-300 border-dashed bg-white/80"
          }`}
        >
          {selected && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </button>
      <span className={`text-xs font-medium ${selected ? "text-blue-600" : "text-slate-500"}`}>
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
    <div className="w-[264px] shrink-0 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
      {/* File header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-100">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
              <svg width="18" height="20" viewBox="0 0 18 20" fill="none">
                <path d="M11 1H3C1.9 1 1 1.9 1 3V17C1 18.1 1.9 19 3 19H15C16.1 19 17 18.1 17 17V7L11 1Z" fill="#fee2e2" stroke="#ef4444" strokeWidth="1.2" />
                <path d="M11 1V7H17" stroke="#ef4444" strokeWidth="1.2" strokeLinejoin="round" />
                <text x="3.5" y="15" fill="#ef4444" fontSize="4.5" fontWeight="700" fontFamily="monospace">PDF</text>
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 break-all line-clamp-2 leading-snug">
                {file.name}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {fileSizeMB} MB · {numPages > 0 ? `${numPages} Pages` : "Loading…"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {/* Exam Type toggle */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">Exam Type</label>
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            {Object.keys(SUBJECTS_BY_EXAM).map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  setExamination(opt);
                  setSubject(SUBJECTS_BY_EXAM[opt][0]);
                  setSubjectSearch("");
                  setShowSubjectDrop(false);
                }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                  examination === opt
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">Subject</label>
          <div className="relative">
            <div
              className="flex items-center gap-2 bg-white border border-slate-300 rounded-md px-3 py-2 cursor-pointer hover:border-slate-400 transition-colors"
              onClick={() => setShowSubjectDrop((v) => !v)}
            >
              <span className="flex-1 text-sm text-slate-900">{subject}</span>
              <Search size={13} className="text-slate-400 shrink-0" />
            </div>
            {showSubjectDrop && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 overflow-hidden">
                <div className="p-2 border-b border-slate-100">
                  <input
                    autoFocus
                    value={subjectSearch}
                    onChange={(e) => setSubjectSearch(e.target.value)}
                    placeholder="Search…"
                    className="w-full text-xs px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="max-h-36 overflow-y-auto py-1">
                  {filtered.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setSubject(s); setSubjectSearch(""); setShowSubjectDrop(false); }}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 transition-colors ${
                        s === subject ? "text-blue-600 font-medium" : "text-slate-700"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <p className="px-3 py-2 text-xs text-slate-400">No matches</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Year */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">Year</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            min={1990}
            max={2030}
            className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Paper Type */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">Paper Type</label>
          <select
            value={paperType}
            onChange={(e) => setPaperType(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          >
            <option value="MCQ">MCQ</option>
            <option value="Structured Essay">Structured Essay</option>
            <option value="Essay">Essay</option>
          </select>
        </div>

        {/* Language */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          >
            <option value="en">English</option>
            <option value="si">Sinhala</option>
            <option value="ta">Tamil</option>
          </select>
        </div>

        {/* Pages to Extract */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">Pages to Extract</label>
          <input
            type="text"
            readOnly
            value={pagesToRangeString(selectedPages)}
            placeholder="None selected"
            className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 cursor-default focus:outline-none"
          />
          <p className="text-[10px] text-slate-400 mt-1">*Verify page selection in the grid.</p>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5">
            <p className="text-xs text-red-600 leading-relaxed">{error}</p>
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="px-4 pb-4 pt-2 border-t border-slate-100">
        <button
          onClick={onSubmit}
          disabled={selectedPages.length === 0 || isProcessing}
          className="w-full bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <><Loader2 size={15} className="animate-spin" /> Submitting…</>
          ) : (
            "Submit for Extraction"
          )}
        </button>
        {isProcessing && (
          <p className="text-[10px] text-slate-400 text-center mt-2 leading-relaxed">
            Uploading PDF and queuing for MinerU extraction…
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
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 p-8">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm w-full max-w-xl p-10 flex flex-col items-center gap-5">
        <div className="text-center flex flex-col items-center gap-2.5">
          <span className="bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">Step 1 of 2</span>
          <h1 className="text-2xl font-bold text-slate-900">Add New Paper</h1>
        </div>

        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); handle(e.dataTransfer.files[0]); }}
          className={`w-full border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-3 cursor-pointer transition-all ${
            isDragging ? "border-blue-400 bg-blue-50" : "border-slate-300 bg-slate-50 hover:bg-blue-50/50 hover:border-blue-400"
          }`}
        >
          <div className={`p-4 rounded-full mb-1 transition-colors ${isDragging ? "bg-blue-100" : "bg-blue-50"}`}>
            <UploadCloud size={36} className={isDragging ? "text-blue-700" : "text-blue-600"} />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700">Click to upload PDF</p>
            <p className="text-xs text-slate-400 mt-1">or drag and drop · PDF up to 50 MB</p>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => handle(e.target.files?.[0])}
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
    <div className="w-full h-full overflow-auto bg-slate-50">

      <div className="p-6 flex gap-5 items-start min-h-full">
        {/* ── Left: Page Grid ── */}
        <div className="flex-1 min-w-0 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={allSelected ? clearAll : selectAll}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-sm text-slate-700 font-medium">Select All</span>
            </label>
            <div className="flex-1" />
            <button
              onClick={clearAll}
              className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-md text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Clear Selection
            </button>
          </div>

          {/* Grid */}
          {numPages === 0 ? (
            <div className="p-12 flex flex-col items-center gap-3 text-slate-400">
              <Loader2 size={28} className="animate-spin" />
              <p className="text-sm">Loading PDF…</p>
            </div>
          ) : (
            <div className="p-5 grid grid-cols-4 gap-5">
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

          {numPages > 0 && (
            <div className="px-5 pb-4">
              <p className="text-xs text-slate-400">
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
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 p-8">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-12 flex flex-col items-center max-w-md w-full text-center">
          <CheckCircle2 size={56} className="text-green-500 mb-5" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Added to Extraction Queue</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-2">
            Your paper has been queued. Once the maintainers trigger MinerU processing,
            you will be notified to validate the extraction.
          </p>
          {submittedId && (
            <p className="text-[11px] text-slate-400 font-mono mb-6">
              Submission ID: {submittedId}
            </p>
          )}
          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
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
              className="w-full border border-slate-300 text-slate-600 font-medium py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-sm"
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
      {/* Step 2 header */}
      {step === 2 && (
        <div className="shrink-0 px-6 pt-5 pb-0 bg-slate-50">
          <h1 className="text-xl font-bold text-slate-900">
            Add New Paper{" "}
            <span className="text-slate-400 font-medium text-base">(Step 2: Define Extraction)</span>
          </h1>
        </div>
      )}

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
