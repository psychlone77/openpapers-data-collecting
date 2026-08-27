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
  type: string;
  x0?: number;
  y0?: number;
  x1?: number;
  y1?: number;
  // Legacy support for user drawing
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  pageNumber?: number;
  content?: string;
}

export function PdfCanvas() {
  const { selectedNodeId, pdfScale, setPdfScale, pdfFile, setPdfFile, paperType, setPaperType, language, setLanguage } = useStore();
  const [activeTool, setActiveTool] = useState<'pointer' | 'draw'>('pointer');
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeBoxId, setActiveBoxId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    type: 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
    startX: number;
    startY: number;
    initialBox: BBox;
  } | null>(null);

  // Visibility filters for box types
  const [filters, setFilters] = useState<Record<BoxType, boolean>>({
    text: false, // Hidden by default as requested to reduce clutter
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

  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setBoxes([]);

      // Upload to backend
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('http://localhost:8000/pdf/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          useStore.getState().setUploadedPdfPath(data.pdf_path);

          // Call MinerU processing
          setIsProcessing(true);
          try {
            const processRes = await fetch('http://localhost:8000/pdf/process', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                pdf_path: data.pdf_path,
                language: useStore.getState().language,
                paper_type: useStore.getState().paperType 
              }),
            });

            if (processRes.ok) {
              const processData = await processRes.json();
              useStore.getState().setCurationMarkdown(processData.curation_markdown || '');
              useStore.getState().setImages(processData.images_dict || {});
              setBoxes(processData.bounding_boxes);
            } else {
              alert("MinerU processing failed.");
            }
          } catch (err) {
            console.error("Error calling MinerU process API:", err);
          } finally {
            setIsProcessing(false);
          }

        } else {
          console.error("Failed to upload PDF to backend");
        }
      } catch (err) {
        console.error("Error uploading PDF:", err);
      }
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
    if (isDrawing && currentBox && (currentBox.width || 0) > 5 && (currentBox.height || 0) > 5) {
      // eslint-disable-next-line react-hooks/purity
      setBoxes([...boxes, { ...currentBox, id: `box-${Date.now()}-${Math.floor(Math.random() * 1000)}`, pageNumber }]);
    }
    setIsDrawing(false);
    setCurrentBox(null);
  };

  const deleteBox = (id: string) => {
    const boxToDelete = boxes.find(b => b.id === id);
    setBoxes(boxes.filter(b => b.id !== id));
    if (boxToDelete) {
      useStore.getState().removeBoxContentFromTree(id, boxToDelete.content);
    }
  };

  const currentPageBoxes = boxes.filter(b => b.pageNumber === pageNumber);

  const updateBox = (id: string, updates: Partial<BBox>) => {
    setBoxes(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
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

      setBoxes(prev => prev.map(b => {
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
           const res = await fetch('http://localhost:8000/pdf/crop', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
               pdf_path: storeState.uploadedPdfPath,
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

    const handleWindowMouseUp = async () => {
      const currentDragState = dragState;
      setDragState(null);
      
      if (!currentDragState) return;
      const { initialBox } = currentDragState;
      
      const updatedBox = boxesRef.current.find(b => b.id === initialBox.id);
      if (updatedBox && updatedBox.type === 'image') {
        await triggerImageCrop(updatedBox);
      }
    };

    // Attach trigger function to window so we can call it from inline handlers easily without prop drilling
    (window as any).triggerImageCropFromCanvas = triggerImageCrop;

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [dragState, pdfScale]);

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

        {/* Metadata Selectors */}
        <div className="flex items-center gap-2 px-2 border-r border-[var(--color-border-hairline)]">
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="text-xs bg-transparent border border-[var(--color-border-hairline)] rounded px-2 py-1 text-white outline-none cursor-pointer hover:border-[var(--color-accent-active)]"
          >
            <option value="en">English (EN)</option>
            <option value="ta">Tamil (TA)</option>
            <option value="si">Sinhala (SI)</option>
          </select>
          <select 
            value={paperType}
            onChange={(e) => setPaperType(e.target.value)}
            className="text-xs bg-transparent border border-[var(--color-border-hairline)] rounded px-2 py-1 text-white outline-none cursor-pointer hover:border-[var(--color-accent-active)]"
          >
            <option value="MCQ">MCQ</option>
            <option value="ESSAY">Essay</option>
            <option value="STRUCTURED_ESSAY">Structured Essay</option>
          </select>
        </div>

        {/* Upload Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1 text-xs font-semibold rounded bg-white text-black hover:bg-gray-200 transition-colors flex items-center gap-2"
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              Processing...
            </>
          ) : (
            "Upload PDF"
          )}
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
          <div 
            className="relative shadow-2xl bg-white" 
            style={{ width: 'max-content', height: 'max-content' }}
            onClick={() => setActiveBoxId(null)}
          >

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
                {/* HTML Overlay for interactivity */}
                <div className="absolute inset-0 z-30 pointer-events-none">
                  {console.log("Rendering HTML overlay. currentPageBoxes:", currentPageBoxes)}
                  {currentPageBoxes.map(box => {
                    const isVisible = (filters as any)[box.type] ?? true;
                    if (!isVisible) return null;

                    const isActive = activeBoxId === box.id;
                    const left = box.x !== undefined ? box.x : (box.x0 !== undefined ? `${box.x0 * 100}%` : 0);
                    const top = box.y !== undefined ? box.y : (box.y0 !== undefined ? `${box.y0 * 100}%` : 0);
                    const width = box.width !== undefined ? box.width : (box.x1 !== undefined && box.x0 !== undefined ? `${(box.x1 - box.x0) * 100}%` : 0);
                    const height = box.height !== undefined ? box.height : (box.y1 !== undefined && box.y0 !== undefined ? `${(box.y1 - box.y0) * 100}%` : 0);

                    return (
                      <div
                        key={box.id}
                        className={`absolute group pointer-events-auto transition-colors ${isActive ? 'outline outline-2 outline-blue-500 bg-blue-500/10 z-40' : ''}`}
                        style={{ left, top, width, height }}
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
                          <div className={`absolute -top-10 left-0 flex gap-1 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity z-50 bg-black/80 rounded p-1 shadow`}>
                            <select
                              value={box.type}
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
                              className="text-xs bg-transparent text-white outline-none cursor-pointer"
                            >
                              <option value="text">Text</option>
                              <option value="table">Table</option>
                              <option value="image">Image</option>
                              <option value="formula">Formula</option>
                            </select>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteBox(box.id); setActiveBoxId(null); }}
                              className="text-red-400 hover:text-red-300 px-1"
                              title="Delete box"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                            </button>
                          </div>
                        )}

                        {/* Resize Handles */}
                        {isActive && (
                          <>
                            {['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map((pos) => (
                              <div
                                key={pos}
                                className="absolute bg-white border border-blue-500 w-2 h-2 rounded-full"
                                style={{
                                  top: pos.includes('n') ? -4 : pos.includes('s') ? '100%' : '50%',
                                  left: pos.includes('w') ? -4 : pos.includes('e') ? '100%' : '50%',
                                  transform: pos.length === 1 ? 'translate(-50%, -50%)' : (pos.includes('s') && pos.includes('e') ? 'translate(-100%, -100%)' : 'translate(0, 0)'), // Simplified positioning
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
                  {/* Render confirmed boxes */}
                  {currentPageBoxes.map((box) => {
                    const bx = box.x !== undefined ? box.x : (box.x0 !== undefined ? `${box.x0 * 100}%` : 0);
                    const by = box.y !== undefined ? box.y : (box.y0 !== undefined ? `${box.y0 * 100}%` : 0);
                    const bw = box.width !== undefined ? box.width : (box.x1 !== undefined && box.x0 !== undefined ? `${(box.x1 - box.x0) * 100}%` : 0);
                    const bh = box.height !== undefined ? box.height : (box.y1 !== undefined && box.y0 !== undefined ? `${(box.y1 - box.y0) * 100}%` : 0);

                    const isActive = activeBoxId === box.id;
                    let color = '';
                    switch (box.type) {
                      case 'text': color = 'var(--color-box-text)'; break;
                      case 'table': color = 'var(--color-box-table)'; break;
                      case 'image': color = 'var(--color-box-image)'; break;
                      case 'formula': color = 'var(--color-box-formula)'; break;
                    }

                    // Skip rendering if filtered out
                    // box.type could be text, table, image, formula. default to true if unknown type
                    const isVisible = (filters as any)[box.type] ?? true;
                    if (!isVisible) return null;

                    return (
                      <rect
                        key={box.id}
                        x={bx} y={by} width={bw} height={bh}
                        fill={isActive ? '#3b82f6' : (color || '#888')}
                        fillOpacity={isActive ? 0.3 : 0.1}
                        stroke={isActive ? '#3b82f6' : (color || '#888')}
                        strokeWidth="1"
                        className="transition-colors cursor-pointer"
                        onClick={() => setActiveBoxId(box.id)}
                      />
                    );
                  })}

                  {/* Render active drawing box */}
                  {isDrawing && currentBox && (
                    <rect
                      x={currentBox.x || 0}
                      y={currentBox.y || 0}
                      width={currentBox.width || 0}
                      height={currentBox.height || 0}
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
