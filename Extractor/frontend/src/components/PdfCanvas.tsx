"use client";

import { useState, useRef, useEffect } from 'react';
import { MousePointer2, Square, Type, Image as ImageIcon, Sigma, Table, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
import { useStore, BBox, BoxType } from '@/store/useStore';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up the PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function PdfCanvas() {
  const { selectedNodeId, pdfScale, setPdfScale, pdfFile, setPdfFile, uploadedPdfPath, paperType, setPaperType, language, setLanguage, boxes, setBoxes, submissionStatus } = useStore();
  const [activeTool, setActiveTool] = useState<'pointer' | 'draw'>('pointer');
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);

  const [activeBoxId, setActiveBoxId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    type: 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
    startX: number;
    startY: number;
    initialBox: BBox;
  } | null>(null);
  
  const safeBoxes = Array.isArray(boxes) ? boxes : (typeof boxes === 'string' ? JSON.parse(boxes) : []);

  // Visibility filters for box types
  const [filters, setFilters] = useState<Record<BoxType, boolean>>({
    text: true, // Show text by default so users see extracted content
    table: true,
    image: true,
    formula: true,
  });

  const toggleFilter = (type: BoxType) => {
    setFilters(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const hasAutoNavigated = useRef(false);

  // Jump to the first page with boxes when they are loaded
  useEffect(() => {
    if (hasAutoNavigated.current) return;
    const safeBoxes = Array.isArray(boxes) ? boxes : (typeof boxes === 'string' ? JSON.parse(boxes) : []);
    if (safeBoxes && safeBoxes.length > 0) {
      // Find the lowest page number among all boxes
      const minPage = Math.min(...safeBoxes.map((b: any) => b.pageNumber || 1));
      if (minPage > 0 && minPage !== pageNumber) {
        setPageNumber(minPage);
      }
      hasAutoNavigated.current = true;
    }
  }, [boxes, pageNumber]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    // Don't blindly set pageNumber to 1 here if we already have boxes that dictate a different page
    if (!boxes || boxes.length === 0) {
      setPageNumber(1);
    }
  }

  // --- Drawing logic ---
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
    if (isDrawing && currentBox && (currentBox.width || 0) > 5 && (currentBox.height || 0) > 5) {
      // eslint-disable-next-line react-hooks/purity
      setBoxes([...safeBoxes, { ...currentBox, id: `box-${Date.now()}-${Math.floor(Math.random() * 1000)}`, pageNumber }]);
    }
    setIsDrawing(false);
    setCurrentBox(null);
  };

  const deleteBox = (id: string) => {
    const boxToDelete = safeBoxes.find((b: any) => b.id === id);
    setBoxes(safeBoxes.filter((b: any) => b.id !== id));
    if (boxToDelete) {
      useStore.getState().removeBoxContentFromTree(id, boxToDelete.content);
    }
  };

  const currentPageBoxes = safeBoxes.filter((b: any) => b.pageNumber === pageNumber);

  const updateBox = (id: string, updates: Partial<BBox>) => {
    setBoxes(safeBoxes.map((b: any) => b.id === id ? { ...b, ...updates } : b));
  };

  // Track latest boxes in a ref for event listeners
  const boxesRef = useRef<BBox[]>([]);
  useEffect(() => {
    boxesRef.current = boxes;
  }, [boxes]);

  // Global mouse events for Box dragging/resizing
  useEffect(() => {
    if (!dragState) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragState.startX) / pdfScale;
      const dy = (e.clientY - dragState.startY) / pdfScale;

      const { initialBox } = dragState;
      const isNorm = initialBox.x0 !== undefined;
      const cvsW = svgRef.current?.clientWidth || 1;
      const cvsH = svgRef.current?.clientHeight || 1;

      const pxLeft = isNorm ? (initialBox.x0! * cvsW) : initialBox.x!;
      const pxTop = isNorm ? (initialBox.y0! * cvsH) : initialBox.y!;
      const pxWidth = isNorm ? ((initialBox.x1! - initialBox.x0!) * cvsW) : initialBox.width!;
      const pxHeight = isNorm ? ((initialBox.y1! - initialBox.y0!) * cvsH) : initialBox.height!;

      let newLeft = pxLeft;
      let newTop = pxTop;
      let newWidth = pxWidth;
      let newHeight = pxHeight;

      if (dragState.type === 'move') {
        newLeft += dx;
        newTop += dy;
      } else {
        if (dragState.type.includes('w')) {
          newLeft += dx;
          newWidth -= dx;
        }
        if (dragState.type.includes('e')) {
          newWidth += dx;
        }
        if (dragState.type.includes('n')) {
          newTop += dy;
          newHeight -= dy;
        }
        if (dragState.type.includes('s')) {
          newHeight += dy;
        }
      }

      // Enforce minimum size
      if (newWidth < 10) {
        if (dragState.type.includes('w')) newLeft -= (10 - newWidth);
        newWidth = 10;
      }
      if (newHeight < 10) {
        if (dragState.type.includes('n')) newTop -= (10 - newHeight);
        newHeight = 10;
      }

      setBoxes(boxesRef.current.map((b: any) => {
        if (b.id !== initialBox.id) return b;
        if (isNorm) {
          return {
            ...b,
            x0: newLeft / cvsW,
            y0: newTop / cvsH,
            x1: (newLeft + newWidth) / cvsW,
            y1: (newTop + newHeight) / cvsH,
          };
        } else {
          return {
            ...b,
            x: newLeft,
            y: newTop,
            width: newWidth,
            height: newHeight,
          };
        }
      }));
    };

    const handleWindowMouseUp = async () => {
      const currentDragState = dragState;
      setDragState(null);
      
      if (!currentDragState) return;
      const { initialBox } = currentDragState;
      
      const updatedBox = boxesRef.current.find(b => b.id === initialBox.id);
      if (updatedBox && updatedBox.type === 'image') {
        if ((window as any).triggerImageCropFromCanvas) {
          await (window as any).triggerImageCropFromCanvas(updatedBox);
        }
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [dragState, pdfScale]);

  useEffect(() => {
    const triggerImageCrop = async (targetBox: BBox) => {
      const storeState = useStore.getState();
      if (!storeState.uploadedPdfPath) return;

      try {
        let bbox: number[] = [];
        if (targetBox.x0 !== undefined && targetBox.y0 !== undefined && targetBox.x1 !== undefined && targetBox.y1 !== undefined) {
           bbox = [targetBox.x0, targetBox.y0, targetBox.x1, targetBox.y1];
        } else if (svgRef.current) {
           const cvsW = svgRef.current.clientWidth || 1;
           const cvsH = svgRef.current.clientHeight || 1;
           bbox = [
             targetBox.x! / cvsW,
             targetBox.y! / cvsH,
             (targetBox.x! + targetBox.width!) / cvsW,
             (targetBox.y! + targetBox.height!) / cvsH
           ];
        }
        
        if (bbox.length === 4) {
           // If uploadedPdfPath is an API URL (e.g. from page.tsx), extract the real file path
           let realPdfPath = storeState.uploadedPdfPath;
           if (realPdfPath.includes('?path=')) {
             realPdfPath = decodeURIComponent(realPdfPath.split('?path=')[1]);
           }

           const res = await fetch('http://localhost:8000/pdf/crop', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
               pdf_path: realPdfPath,
               page_number: (targetBox.pageNumber || 1) - 1, // backend is 0-indexed
               bbox: bbox
             })
           });
           
           if (res.ok) {
             const data = await res.json();
             storeState.updateTreeItemImage(targetBox.id, data.image_base64, targetBox.content);
           }
        }
      } catch(e) {
        console.error("Error cropping updated image bounding box:", e);
      }
    };

    // Attach trigger function to window so we can call it from inline handlers easily without prop drilling
    (window as any).triggerImageCropFromCanvas = triggerImageCrop;
  }, []);

  return (
    <div className="w-full h-full flex flex-col relative bg-slate-100">
      {/* Legend / Toolbar Overlay */}
      {submissionStatus !== "PENDING_MINERU" && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-white/95 backdrop-blur border border-slate-200 px-3 py-2 rounded-xl shadow-md">

          {/* Tool selector */}
          <div className="flex items-center gap-1.5 border-r border-slate-200 pr-3.5">
            <button
              onClick={() => setActiveTool('pointer')}
              aria-label="Pointer Tool"
              aria-pressed={activeTool === 'pointer'}
              className={`p-2 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[var(--ls-accent)] ${activeTool === 'pointer' ? 'bg-[var(--ls-accent)] text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
              title="Pointer Tool"
            >
              <MousePointer2 size={16} aria-hidden="true" />
            </button>
            <button
              onClick={() => setActiveTool('draw')}
              aria-label="Draw Bounding Box Tool"
              aria-pressed={activeTool === 'draw'}
              className={`p-2 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[var(--ls-accent)] ${activeTool === 'draw' ? 'bg-[var(--ls-accent)] text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
              title="Draw Bounding Box"
            >
              <Square size={16} aria-hidden="true" />
            </button>
          </div>

          {/* Legend Filters */}
          <div className="flex items-center gap-2 pl-0.5">
            <FilterPill type="text" active={filters.text} onClick={() => toggleFilter('text')} icon={<Type size={14} />} color="var(--color-box-text)" label="Text" />
            <FilterPill type="table" active={filters.table} onClick={() => toggleFilter('table')} icon={<Table size={14} />} color="var(--color-box-table)" label="Table" />
            <FilterPill type="image" active={filters.image} onClick={() => toggleFilter('image')} icon={<ImageIcon size={14} />} color="var(--color-box-image)" label="Image" />
            <FilterPill type="formula" active={filters.formula} onClick={() => toggleFilter('formula')} icon={<Sigma size={14} />} color="var(--color-box-formula)" label="Formula" />
          </div>

        </div>
      )}

      {/* PDF Scrollable Container */}
      <div className="flex-1 overflow-auto flex justify-center p-8 pt-24 pb-24">
        {!pdfFile && !uploadedPdfPath ? (
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center text-center mt-20 relative z-50 shadow-sm animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100">
              <ImageIcon className="text-slate-400" size={32} aria-hidden="true" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 mb-2 tracking-tight">No PDF Loaded</h3>
            <p className="text-sm font-medium text-slate-500 mb-2">
              Please go to the Add Paper wizard to upload a PDF.
            </p>
          </div>
        ) : (
          <div 
            className="relative shadow-xl bg-white rounded-md transition-shadow" 
            style={{ width: 'max-content', height: 'max-content' }}
            onClick={() => setActiveBoxId(null)}
          >

            <Document
              file={pdfFile || uploadedPdfPath}
              onLoadSuccess={onDocumentLoadSuccess}
              className="flex flex-col items-center"
              loading={<div className="p-20 text-slate-500 font-medium flex flex-col items-center gap-4"><Loader2 size={24} className="animate-spin text-[var(--ls-accent)]" /> Loading document...</div>}
              error={<div className="p-20 text-red-500 font-medium">Failed to load PDF. Please check the file.</div>}
            >
              <Page
                pageNumber={pageNumber}
                scale={pdfScale}
                devicePixelRatio={typeof window !== "undefined" ? Math.max(window.devicePixelRatio || 1, 2) : 2}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className="relative overflow-hidden rounded-md"
              >
                {/* HTML Overlay for interactivity */}
                <div className="absolute inset-0 z-30 pointer-events-none">
                  {currentPageBoxes.map((box: BBox) => {
                    const isVisible = (filters as any)[box.type] ?? true;
                    if (!isVisible) return null;

                    const isActive = activeBoxId === box.id;
                    const left = box.x !== undefined ? box.x : (box.x0 !== undefined ? `${box.x0 * 100}%` : 0);
                    const top = box.y !== undefined ? box.y : (box.y0 !== undefined ? `${box.y0 * 100}%` : 0);
                    const width = box.width !== undefined ? box.width : (box.x1 !== undefined && box.x0 !== undefined ? `${(box.x1 - box.x0) * 100}%` : 0);
                    const height = box.height !== undefined ? box.height : (box.y1 !== undefined && box.y0 !== undefined ? `${(box.y1 - box.y0) * 100}%` : 0);

                    let color = '';
                    switch (box.type) {
                      case 'text': color = 'var(--color-box-text)'; break;
                      case 'table': color = 'var(--color-box-table)'; break;
                      case 'image': color = 'var(--color-box-image)'; break;
                      case 'formula': color = 'var(--color-box-formula)'; break;
                    }
                    const borderColor = color || '#888';

                    return (
                      <div
                        key={box.id}
                        className={`absolute group pointer-events-auto transition-colors ${
                          isActive 
                            ? (dragState?.type === 'move' ? 'outline outline-2 outline-[var(--ls-accent)] bg-[var(--ls-accent)]/10 z-40 cursor-grabbing shadow-sm' : 'outline outline-2 outline-[var(--ls-accent)] bg-[var(--ls-accent)]/10 z-40 cursor-grab hover:bg-[var(--ls-accent)]/20 shadow-sm')
                            : 'border-[1.5px] cursor-pointer'
                        }`}
                        style={{ 
                          left, top, width, height,
                          borderColor: isActive ? undefined : borderColor,
                          backgroundColor: isActive ? undefined : `color-mix(in srgb, ${borderColor} 15%, transparent)`
                        }}
                        onClick={(e) => { e.stopPropagation(); setActiveBoxId(box.id); }}
                        onMouseDown={(e) => {
                          if (isActive && e.button === 0) {
                            e.stopPropagation();
                            setDragState({ type: 'move', startX: e.clientX, startY: e.clientY, initialBox: box });
                          }
                        }}
                      >
                        {/* Toolbar */}
                        {(isActive || (!activeBoxId && true)) && (
                          <div className={`absolute -top-11 left-0 flex gap-1.5 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity z-50 bg-slate-900/90 backdrop-blur-sm rounded-lg p-1.5 shadow-lg`}>
                            <select
                              value={box.type}
                              aria-label="Change box type"
                              onChange={async (e) => {
                                const newType = e.target.value;
                                updateBox(box.id, { type: newType });
                                if (newType === 'image') {
                                  if ((window as any).triggerImageCropFromCanvas) {
                                    (window as any).triggerImageCropFromCanvas({ ...box, type: 'image' });
                                  }
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs font-medium bg-transparent text-white outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--ls-accent)] rounded px-1"
                            >
                              <option value="text" className="text-slate-900">Text</option>
                              <option value="table" className="text-slate-900">Table</option>
                              <option value="image" className="text-slate-900">Image</option>
                              <option value="formula" className="text-slate-900">Formula</option>
                            </select>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteBox(box.id); setActiveBoxId(null); }}
                              aria-label="Delete bounding box"
                              className="text-red-400 hover:text-red-300 hover:bg-red-400/20 p-1 rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                              title="Delete box"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                            </button>
                          </div>
                        )}

                        {/* Resize Handles */}
                        {isActive && (
                          <>
                            {['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map((pos) => (
                              <div
                                key={pos}
                                className="absolute bg-white border-2 border-[var(--ls-accent)] w-3 h-3 rounded-full shadow-sm"
                                style={{
                                  top: pos.includes('n') ? -6 : pos.includes('s') ? '100%' : '50%',
                                  left: pos.includes('w') ? -6 : pos.includes('e') ? '100%' : '50%',
                                  transform: pos.length === 1 ? 'translate(-50%, -50%)' : (pos.includes('s') && pos.includes('e') ? 'translate(-100%, -100%)' : 'translate(0, 0)'),
                                  cursor: `${pos}-resize`,
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setDragState({ type: pos as any, startX: e.clientX, startY: e.clientY, initialBox: box });
                                }}
                              />
                            ))}
                          </>
                        )}
                      </div>
                    );
                  })}
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
                  {/* Render active drawing box */}
                  {isDrawing && currentBox && (
                    <rect
                      x={currentBox.x || 0}
                      y={currentBox.y || 0}
                      width={currentBox.width || 0}
                      height={currentBox.height || 0}
                      fill="var(--color-accent-active)"
                      fillOpacity={0.15}
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
      <div className="absolute bottom-6 right-6 z-50 flex items-center gap-1.5 bg-white/95 backdrop-blur border border-slate-200 px-2 py-1.5 rounded-xl shadow-md">
        <button
          onClick={() => setPdfScale(Math.max(0.5, pdfScale - 0.2))}
          aria-label="Zoom out"
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[var(--ls-accent)]"
        >
          <ZoomOut size={16} aria-hidden="true" />
        </button>
        <span className="text-xs font-bold text-slate-600 w-12 text-center select-none" aria-live="polite">
          {Math.round(pdfScale * 100)}%
        </span>
        <button
          onClick={() => setPdfScale(Math.min(3.0, pdfScale + 0.2))}
          aria-label="Zoom in"
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[var(--ls-accent)]"
        >
          <ZoomIn size={16} aria-hidden="true" />
        </button>
      </div>

      {/* Page Navigation Controls (Bottom Left) */}
      <div className="absolute bottom-6 left-6 z-50 flex items-center gap-3 bg-white/95 backdrop-blur border border-slate-200 px-3 py-2 rounded-xl shadow-md">
        <button
          disabled={pageNumber <= 1}
          onClick={() => setPageNumber(prev => prev - 1)}
          aria-label="Previous Page"
          className="text-xs font-bold px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[var(--ls-accent)]"
        >
          Prev
        </button>
        <span className="text-xs text-slate-500 font-bold tracking-wide" aria-live="polite">
          Page {pageNumber} of {numPages || '--'}
        </span>
        <button
          disabled={numPages === undefined || pageNumber >= numPages}
          onClick={() => setPageNumber(prev => prev + 1)}
          aria-label="Next Page"
          className="text-xs font-bold px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[var(--ls-accent)]"
        >
          Next
        </button>
      </div>
    </div>
  );
}

interface FilterPillProps {
  type: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  color: string;
  label: string;
}

function FilterPill({ active, onClick, icon, color, label }: FilterPillProps) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-label={`Toggle ${label} bounding boxes`}
      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[var(--ls-accent)] ${active ? 'opacity-100 hover:brightness-95' : 'opacity-50 hover:opacity-80 bg-transparent hover:bg-slate-100'}`}
      style={{
        backgroundColor: active ? `color-mix(in srgb, ${color} 15%, transparent)` : undefined,
        color: active ? color : 'var(--ls-text-secondary)',
      }}
    >
      {icon} {label}
    </button>
  );
}
