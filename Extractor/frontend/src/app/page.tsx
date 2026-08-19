"use client";

import { useState, useRef, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { TopBar } from "@/components/TopBar";
import { QuestionTree } from "@/components/QuestionTree";
import dynamic from 'next/dynamic';

const PdfCanvas = dynamic(() => import('@/components/PdfCanvas').then(mod => mod.PdfCanvas), {
  ssr: false,
  loading: () => <div className="p-20 text-[var(--color-text-muted)] flex items-center justify-center h-full">Loading Canvas...</div>
});

export default function Home() {
  const { leftPaneWidth, setLeftPaneWidth } = useStore();
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--color-bg-canvas)]">
      <TopBar />
      
      <div className="flex-1 flex flex-row overflow-hidden" ref={containerRef}>
        {/* Left Pane: PDF Canvas */}
        <div style={{ width: `${leftPaneWidth}%` }} className="relative h-full border-r border-[var(--color-border-hairline)] overflow-hidden">
          <PdfCanvas />
        </div>

        {/* Resizer Divider */}
        <div 
          className="w-1 cursor-col-resize hover:bg-[var(--color-accent-active)] bg-transparent transition-colors duration-150 z-10"
          onMouseDown={handleMouseDown}
        />

        {/* Right Pane: Question Tree */}
        <div style={{ width: `${100 - leftPaneWidth}%` }} className="h-full overflow-hidden bg-[var(--color-bg-surface)]">
          <QuestionTree />
        </div>
      </div>
    </div>
  );
}
