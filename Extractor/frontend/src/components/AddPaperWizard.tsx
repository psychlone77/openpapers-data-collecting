"use client";

import { useState, useRef } from "react";
import { useStore } from "@/store/useStore";
import { Document, Page, pdfjs } from 'react-pdf';
import { UploadCloud, CheckCircle2, ChevronRight, ChevronLeft, Check, Circle, Loader2 } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const EXAM_SUBJECTS = {
  "A/L": ["Physics", "Chemistry", "Biology", "Mathematics", "Accounting", "Economics", "Business Studies", "IT"],
  "O/L": ["Science", "Mathematics", "English", "Sinhala", "Tamil", "History", "Geography", "Civics", "Buddhism"]
};

export function AddPaperWizard() {
  const {
    pdfFile, setPdfFile,
    paperType, setPaperType,
    language, setLanguage,
    year, setYear,
    examination, setExamination,
    subject, setSubject,
    selectedPages, setSelectedPages,
    setIsAddPaperWizardOpen,
    setUploadedPdfPath
  } = useStore();

  const [numPages, setNumPages] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewPage, setPreviewPage] = useState<number>(1);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setSelectedPages([]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setSelectedPages([]);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPreviewPage(1);
    // Auto-select all pages initially
    setSelectedPages(Array.from({ length: numPages }, (_, i) => i + 1));
  };

  const togglePageSelection = (pageNum: number) => {
    if (selectedPages.includes(pageNum)) {
      setSelectedPages(selectedPages.filter(p => p !== pageNum));
    } else {
      setSelectedPages([...selectedPages, pageNum].sort((a, b) => a - b));
    }
  };

  const handleContinue = async () => {
    if (!pdfFile || selectedPages.length === 0) return;

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', pdfFile);

      // 1. Upload to backend
      const uploadRes = await fetch('http://localhost:8000/pdf/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Upload failed");
      const uploadData = await uploadRes.json();
      setUploadedPdfPath(uploadData.pdf_path);

      // 2. Process with MinerU (sending selected pages metadata to backend)
      const processRes = await fetch('http://localhost:8000/pdf/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdf_path: uploadData.pdf_path,
          language: language,
          paper_type: paperType,
          pages: selectedPages // New field
        }),
      });

      if (!processRes.ok) throw new Error("MinerU processing failed");
      const processData = await processRes.json();

      useStore.getState().setCurationMarkdown(processData.curation_markdown || '');
      useStore.getState().setImages(processData.images_dict || {});
      useStore.getState().setBoxes(processData.bounding_boxes || []);

      // Close wizard and show Studio
      setIsAddPaperWizardOpen(false);
    } catch (err) {
      console.error("Error processing paper:", err);
      alert("Error processing paper. See console.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-[var(--color-bg-canvas)] p-8 overflow-y-auto">
      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-hairline)] rounded-xl shadow-2xl w-[90vw] max-w-7xl p-8 flex flex-col max-h-[90vh]">
        <h2 className="text-2xl font-display font-semibold mb-6">Add New Paper</h2>

        <div className="flex gap-8 flex-1 min-h-0">
          {/* Left Column: Metadata */}
          <div className="w-80 shrink-0 flex flex-col gap-4 overflow-y-auto pr-2">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Examination</label>
              <select
                className="w-full bg-[var(--color-bg-surface-raised)] border border-[var(--color-border-hairline)] rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-active)] focus:border-transparent transition-all"
                value={examination}
                onChange={(e) => {
                  const newExam = e.target.value;
                  setExamination(newExam);
                  setSubject(EXAM_SUBJECTS[newExam as keyof typeof EXAM_SUBJECTS][0]);
                }}
              >
                <option value="A/L">A/L</option>
                <option value="O/L">O/L</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Subject</label>
              <select
                className="w-full bg-[var(--color-bg-surface-raised)] border border-[var(--color-border-hairline)] rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-active)] focus:border-transparent transition-all"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                {(EXAM_SUBJECTS[examination as keyof typeof EXAM_SUBJECTS] || []).map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Year</label>
              <input
                type="number"
                className="w-full bg-[var(--color-bg-surface-raised)] border border-[var(--color-border-hairline)] rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-active)] focus:border-transparent transition-all"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Paper Type</label>
              <select
                className="w-full bg-[var(--color-bg-surface-raised)] border border-[var(--color-border-hairline)] rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-active)] focus:border-transparent transition-all"
                value={paperType}
                onChange={(e) => setPaperType(e.target.value)}
              >
                <option value="MCQ">MCQ</option>
                <option value="Structured Essay">Structured Essay</option>
                <option value="Essay">Essay</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Language</label>
              <select
                className="w-full bg-[var(--color-bg-surface-raised)] border border-[var(--color-border-hairline)] rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-active)] focus:border-transparent transition-all"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="en">English</option>
                <option value="si">Sinhala</option>
                <option value="ta">Tamil</option>
              </select>
            </div>
          </div>

          {/* Right Column: PDF Upload & Page Selector */}
          <div className="flex-1 flex flex-col bg-[var(--color-bg-surface-raised)] border border-[var(--color-border-hairline)] rounded-lg p-4 min-h-0">
            {!pdfFile ? (
              <div
                className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDraggingFile
                    ? 'border-[var(--color-accent-active)] bg-[var(--color-accent-active)]/10'
                    : 'border-[var(--color-border-hairline)] hover:bg-white/5'
                  }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <UploadCloud className="w-12 h-12 text-[var(--color-text-muted)] mb-4" />
                <p className="text-sm font-medium">Click to upload PDF</p>
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
              </div>
            ) : (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between mb-4 shrink-0 px-2">
                  <div>
                    <h3 className="text-sm font-medium">Select Pages to Extract</h3>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      {selectedPages.length} of {numPages} pages selected
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      className="text-xs text-[var(--color-text-muted)] hover:text-white transition-colors"
                      onClick={() => {
                        setPdfFile(null);
                        setNumPages(0);
                        setPreviewPage(1);
                      }}
                    >
                      Change PDF
                    </button>
                  </div>
                </div>

                <div className="flex-1 relative flex flex-col items-center justify-center bg-black/20 rounded-lg overflow-hidden border border-white/5">
                  <div className="absolute inset-0 flex items-center justify-center overflow-auto p-4">
                    <Document
                      file={pdfFile}
                      onLoadSuccess={onDocumentLoadSuccess}
                      className="flex justify-center"
                    >
                      {numPages > 0 && (
                        <div className="relative shadow-2xl transition-transform">
                          <Page
                            pageNumber={previewPage}
                            height={700} // large enough to read, will scale down by CSS if needed
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                            className="bg-white"
                          />

                          {/* Selection Overlay */}
                          <div
                            className={`absolute inset-0 border-4 pointer-events-none transition-colors ${selectedPages.includes(previewPage)
                                ? 'border-[var(--color-accent-active)]'
                                : 'border-transparent'
                              }`}
                          />
                        </div>
                      )}
                    </Document>
                  </div>

                  {/* Top Bar on Page View */}
                  <div className="absolute top-4 right-4 flex items-center gap-3">
                    <button
                      onClick={() => togglePageSelection(previewPage)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium shadow-lg backdrop-blur-md transition-all ${selectedPages.includes(previewPage)
                          ? 'bg-[var(--color-accent-active)] text-black'
                          : 'bg-black/60 text-white hover:bg-black/80'
                        }`}
                    >
                      {selectedPages.includes(previewPage) ? (
                        <>
                          <Check size={18} />
                          <span>Included</span>
                        </>
                      ) : (
                        <>
                          <Circle size={18} />
                          <span>Exclude</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Navigation Arrows */}
                  {numPages > 1 && (
                    <>
                      <button
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-black/80 backdrop-blur-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                        disabled={previewPage === 1}
                      >
                        <ChevronLeft size={24} />
                      </button>
                      <button
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-black/80 backdrop-blur-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        onClick={() => setPreviewPage(p => Math.min(numPages, p + 1))}
                        disabled={previewPage === numPages}
                      >
                        <ChevronRight size={24} />
                      </button>
                    </>
                  )}

                  {/* Page Indicator */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-sm font-medium text-white shadow-lg">
                    Page {previewPage} of {numPages}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end mt-8 shrink-0">
          <button
            className="bg-[var(--color-accent-active)] text-black font-semibold px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[var(--color-bg-surface)]"
            disabled={!pdfFile || selectedPages.length === 0 || isProcessing}
            onClick={handleContinue}
          >
            {isProcessing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Continue
                <ChevronRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
