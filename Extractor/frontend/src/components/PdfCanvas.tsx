"use client";

import { useState, useRef, useEffect } from 'react';
import { MousePointer2, Square, Type, Image as ImageIcon, Sigma, Table, ZoomIn, ZoomOut } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up the PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type BoxType = 'text' | 'table' | 'image' | 'formula';

interface BBox {
  id: string;
  type: BoxType;
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber?: number;
}

export function PdfCanvas() {
  const { selectedNodeId, pdfScale, setPdfScale, pdfFile, setPdfFile } = useStore();
  const [activeTool, setActiveTool] = useState<'pointer' | 'draw'>('pointer');
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Visibility filters for box types
  const [filters, setFilters] = useState<Record<BoxType, boolean>>({
    text: true,
    table: true,
    image: true,
    formula: true,
  });

  const toggleFilter = (type: BoxType) => {
    setFilters(prev => ({ ...prev, [type]: !prev[type] }));
  };

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setBoxes([]);
    }
  };

  // --- Drawing logic ---
  const [boxes, setBoxes] = useState<BBox[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<BBox | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const getMousePos = (e: React.MouseEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const CTM = svgRef.current.getScreenCTM();
    if (!CTM) return { x: 0, y: 0 };
    return {
      x: (e.clientX - CTM.e) / CTM.a,
      y: (e.clientY - CTM.f) / CTM.d,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool !== 'draw') return;
    const pos = getMousePos(e);
    setIsDrawing(true);
    setStartPoint(pos);
    setCurrentBox({
      id: 'temp',
      type: 'text', // default
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !startPoint || !currentBox) return;
    const pos = getMousePos(e);

    // Calculate new rect based on start and current pos (handle drawing in any direction)
    const x = Math.min(startPoint.x, pos.x);
    const y = Math.min(startPoint.y, pos.y);
    const width = Math.abs(pos.x - startPoint.x);
    const height = Math.abs(pos.y - startPoint.y);

    setCurrentBox({ ...currentBox, x, y, width, height });
  };

  const handleMouseUp = () => {
    if (isDrawing && currentBox && currentBox.width > 5 && currentBox.height > 5) {
      setBoxes([...boxes, { ...currentBox, id: Math.random().toString(36).substring(7), pageNumber }]);
    }
    setIsDrawing(false);
    setCurrentBox(null);
    setStartPoint(null);
  };

  const deleteBox = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (activeTool === 'pointer') {
      setBoxes(prev => prev.filter(b => b.id !== id));
    }
  };

  const currentPageBoxes = boxes.filter(b => b.pageNumber === pageNumber);

  return (
    <div className="w-full h-full flex flex-col relative bg-[#111316]">
      {/* Hidden file input */}
      <input
        type="file"
        accept="application/pdf"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileUpload}
      />

      {/* Legend / Toolbar Overlay */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-[var(--color-bg-surface-raised)] border border-[var(--color-border-hairline)] px-3 py-2 rounded-lg shadow-xl shadow-black/50">

        {/* Tool selector */}
        <div className="flex items-center gap-1 border-r border-[var(--color-border-hairline)] pr-3">
          <button
            onClick={() => setActiveTool('pointer')}
            className={`p-1.5 rounded transition-colors ${activeTool === 'pointer' ? 'bg-[var(--color-accent-active)] text-white' : 'text-[var(--color-text-muted)] hover:text-white hover:bg-white/10'}`}
            title="Pointer Tool"
          >
            <MousePointer2 size={16} />
          </button>
          <button
            onClick={() => setActiveTool('draw')}
            className={`p-1.5 rounded transition-colors ${activeTool === 'draw' ? 'bg-[var(--color-accent-active)] text-white' : 'text-[var(--color-text-muted)] hover:text-white hover:bg-white/10'}`}
            title="Draw Bounding Box"
          >
            <Square size={16} />
          </button>
        </div>

        {/* Legend Filters */}
        <div className="flex items-center gap-2 px-3 border-r border-[var(--color-border-hairline)]">
          <FilterPill type="text" active={filters.text} onClick={() => toggleFilter('text')} icon={<Type size={14} />} color="var(--color-box-text)" label="Text" />
          <FilterPill type="table" active={filters.table} onClick={() => toggleFilter('table')} icon={<Table size={14} />} color="var(--color-box-table)" label="Table" />
          <FilterPill type="image" active={filters.image} onClick={() => toggleFilter('image')} icon={<ImageIcon size={14} />} color="var(--color-box-image)" label="Image" />
          <FilterPill type="formula" active={filters.formula} onClick={() => toggleFilter('formula')} icon={<Sigma size={14} />} color="var(--color-box-formula)" label="Formula" />
        </div>

        {/* Upload Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1 text-xs font-semibold rounded bg-white text-black hover:bg-gray-200 transition-colors"
        >
          Upload PDF
        </button>
      </div>

      {/* PDF Scrollable Container */}
      <div className="flex-1 overflow-auto flex justify-center p-8 pt-20">
        {!pdfFile ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] mt-20">
            <div className="w-16 h-16 mb-4 rounded-full bg-[var(--color-bg-surface-raised)] flex items-center justify-center">
              <ImageIcon size={24} />
            </div>
            <p>No document loaded.</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 px-4 py-2 text-sm font-semibold rounded bg-[var(--color-accent-active)] text-white hover:bg-blue-600 transition-colors"
            >
              Select PDF File
            </button>
          </div>
        ) : (
          <div className="relative shadow-2xl bg-white" style={{ width: 'max-content', height: 'max-content' }}>

            <Document
              file={pdfFile}
              onLoadSuccess={onDocumentLoadSuccess}
              className="flex flex-col items-center"
              loading={<div className="p-20 text-black">Loading PDF...</div>}
              error={<div className="p-20 text-red-500">Failed to load PDF.</div>}
            >
              <Page
                pageNumber={pageNumber}
                scale={pdfScale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="relative"
              >
                {/* HTML Overlay for buttons */}
                <div className="absolute inset-0 z-30 pointer-events-none">
                  {currentPageBoxes.map(box => (
                    <div
                      key={box.id}
                      className="absolute pointer-events-auto group"
                      style={{
                        left: box.x, top: box.y, width: box.width, height: box.height
                      }}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); setBoxes(prev => prev.filter(b => b.id !== box.id)); }}
                        className="absolute -top-2.5 -right-2.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-50 hover:bg-red-600 cursor-pointer"
                        title="Remove bounding box"
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <line x1="2" y1="2" x2="8" y2="8" />
                          <line x1="8" y1="2" x2="2" y2="8" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>

                {/* SVG Overlay Layer for Drawing Boxes */}
                <svg
                  ref={svgRef}
                  className="absolute inset-0 z-20 w-full h-full"
                  style={{
                    pointerEvents: activeTool === 'draw' ? 'auto' : 'none',
                    cursor: activeTool === 'draw' ? 'crosshair' : 'default'
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  {/* Render confirmed boxes */}
                  {currentPageBoxes.map((box) => (
                    <rect
                      key={box.id}
                      x={box.x}
                      y={box.y}
                      width={box.width}
                      height={box.height}
                      fill={`var(--color-box-${box.type})`}
                      fillOpacity={0.15}
                      stroke={`var(--color-box-${box.type})`}
                      strokeWidth={2}
                      className="pointer-events-auto cursor-pointer hover:fill-opacity-30 transition-all"
                    />
                  ))}

                  {/* Render active drawing box */}
                  {isDrawing && currentBox && (
                    <rect
                      x={currentBox.x}
                      y={currentBox.y}
                      width={currentBox.width}
                      height={currentBox.height}
                      fill="var(--color-accent-active)"
                      fillOpacity={0.1}
                      stroke="var(--color-accent-active)"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                    />
                  )}
                </svg>
              </Page>
            </Document>

          </div>
        )}
      </div>

      {/* Zoom / Pan Controls (Bottom Right) */}
      <div className="absolute bottom-6 right-6 z-50 flex items-center gap-2 bg-[var(--color-bg-surface-raised)] border border-[var(--color-border-hairline)] px-2 py-1.5 rounded-lg shadow-lg">
        <button
          onClick={() => setPdfScale(Math.max(0.5, pdfScale - 0.2))}
          className="p-1 rounded text-[var(--color-text-muted)] hover:text-white hover:bg-white/10"
        >
          <ZoomOut size={16} />
        </button>
        <span className="text-xs font-mono text-[var(--color-text-muted)] w-10 text-center">
          {Math.round(pdfScale * 100)}%
        </span>
        <button
          onClick={() => setPdfScale(Math.min(3.0, pdfScale + 0.2))}
          className="p-1 rounded text-[var(--color-text-muted)] hover:text-white hover:bg-white/10"
        >
          <ZoomIn size={16} />
        </button>
      </div>

      {/* Page Navigation Controls (Bottom Left) */}
      <div className="absolute bottom-6 left-6 z-50 flex items-center gap-2 bg-[var(--color-bg-surface-raised)] border border-[var(--color-border-hairline)] px-3 py-1.5 rounded-lg shadow-lg">
        <button
          disabled={pageNumber <= 1}
          onClick={() => setPageNumber(prev => prev - 1)}
          className="text-xs font-semibold px-2 py-1 bg-black/20 rounded disabled:opacity-50"
        >
          Prev
        </button>
        <span className="text-xs text-[var(--color-text-muted)] font-mono">
          Page {pageNumber} of {numPages || '--'}
        </span>
        <button
          disabled={numPages === undefined || pageNumber >= numPages}
          onClick={() => setPageNumber(prev => prev + 1)}
          className="text-xs font-semibold px-2 py-1 bg-black/20 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function FilterPill({ type, active, onClick, icon, color, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all ${active ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
      style={{
        backgroundColor: active ? `color-mix(in srgb, ${color} 15%, transparent)` : 'transparent',
        color: active ? color : 'var(--color-text-muted)',
      }}
    >
      {icon} {label}
    </button>
  );
}
