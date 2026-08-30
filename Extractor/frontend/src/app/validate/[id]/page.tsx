"use client";

import { useState, useRef, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { TopBar } from "@/components/TopBar";
import { QuestionTree } from "@/components/QuestionTree";
import dynamic from 'next/dynamic';
import { useParams } from "next/navigation";

const PdfCanvas = dynamic(() => import('@/components/PdfCanvas').then(mod => mod.PdfCanvas), {
  ssr: false,
  loading: () => <div className="p-20 text-[var(--color-text-muted)] flex items-center justify-center h-full">Loading Canvas...</div>
});

export default function ValidatePage() {
  const { id } = useParams();
  const { 
    leftPaneWidth, setLeftPaneWidth,
    setUploadedPdfPath,
    setCurationMarkdown,
    setImages,
    setBoxes,
    submissionStatus,
    setSubmissionId,
    setSubmissionStatus,
    setYear, setExamination, setSubject, setPaperType
  } = useStore();
  
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/queue/${id}`);
        const data = await res.json();
        
        const sub = data.submission;
        setSubmissionId(sub.id);
        setSubmissionStatus(sub.status);
        
        // Ensure path uses forward slashes and is correctly formatted for pdfjs
        setUploadedPdfPath(`http://localhost:8000/pdf/files?path=${encodeURIComponent(sub.pdfUrl)}`);
        setCurationMarkdown(sub.curationMarkdown || "");
        let parsedImages = sub.imagesDict || {};
        if (typeof parsedImages === 'string') {
          try { parsedImages = JSON.parse(parsedImages); } catch (e) {}
        }
        if (typeof parsedImages === 'string') {
          try { parsedImages = JSON.parse(parsedImages); } catch (e) {}
        }
        setImages(parsedImages && typeof parsedImages === 'object' ? parsedImages : {});

        let parsedBoxes = sub.boundingBoxes || [];
        if (typeof parsedBoxes === 'string') {
          try { parsedBoxes = JSON.parse(parsedBoxes); } catch (e) {}
        }
        if (typeof parsedBoxes === 'string') {
          try { parsedBoxes = JSON.parse(parsedBoxes); } catch (e) {}
        }
        setBoxes(Array.isArray(parsedBoxes) ? parsedBoxes : []);
        
        if (sub.metadata) {
          const meta = typeof sub.metadata === 'string' ? JSON.parse(sub.metadata) : sub.metadata;
          if (meta.year) setYear(meta.year);
          if (meta.examination) setExamination(meta.examination);
          if (meta.subject) setSubject(meta.subject);
          if (meta.paperType) setPaperType(meta.paperType);
        }
      } catch (err) {
        console.error("Failed to load submission", err);
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchSubmission();
    }
  }, [id]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      if (newWidth > 20 && newWidth < 80) {
        setLeftPaneWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, setLeftPaneWidth]);

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center bg-[var(--color-bg-canvas)] text-white">Loading Studio...</div>;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--color-bg-canvas)]">
      <TopBar />
      
      <div className="flex-1 flex flex-row overflow-hidden" ref={containerRef}>
        {/* Left Pane: PDF Canvas */}
        <div 
          style={{ width: submissionStatus === "PENDING_MINERU" ? '100%' : `${leftPaneWidth}%` }} 
          className="relative h-full border-r border-[var(--color-border-hairline)] overflow-hidden"
        >
          <PdfCanvas />
        </div>

        {submissionStatus !== "PENDING_MINERU" && (
          <>
            {/* Resizer Divider */}
            <div 
              className="w-1 cursor-col-resize hover:bg-[var(--color-accent-active)] bg-transparent transition-colors duration-150 z-10"
              onMouseDown={handleMouseDown}
            />

            {/* Right Pane: Question Tree */}
            <div style={{ width: `${100 - leftPaneWidth}%` }} className="h-full overflow-hidden bg-[var(--color-bg-surface)]">
              <QuestionTree />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
