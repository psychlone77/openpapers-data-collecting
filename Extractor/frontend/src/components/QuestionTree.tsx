/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { MessageSquare } from "lucide-react";
import { InlineCommentPopover } from "./InlineCommentPopover";

const getLine = (node: any) => node?.position?.start?.line;

const MarkdownBlock = ({ line, children, Element = 'div', className = "", ...props }: any) => {
  const comments = useStore(state => state.comments);
  const activeCommentLine = useStore(state => state.activeCommentLine);
  const setActiveCommentLine = useStore(state => state.setActiveCommentLine);
  const highlightTextForComment = useStore(state => state.highlightTextForComment);
  const setHighlightTextForComment = useStore(state => state.setHighlightTextForComment);

  const extractText = (node: any): string => {
    if (!node) return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(extractText).join('');
    if (node.props?.children) return extractText(node.props.children);
    return '';
  };
  const blockText = extractText(children);

  const lineComments = comments.filter((c: any) => c.lineNumber === line);
  const hasComments = lineComments.length > 0;
  const unresolvedCount = lineComments.filter((c: any) => !c.resolved).length;
  const allResolved = hasComments && unresolvedCount === 0;
  const isActive = activeCommentLine === line;
  
  return (
    <Element className={`group relative ${className}`} data-line={line} {...props}>
      {children}
      
      {/* Comment Icon Trigger */}
      {(hasComments || isActive) ? (
        <button 
          type="button"
          onClick={(e) => { e.preventDefault(); setActiveCommentLine(isActive ? null : line); }}
          className={`absolute right-2 top-1 p-1 ${allResolved && !isActive ? 'text-slate-400' : 'text-[var(--ls-accent)]'} bg-white/90 backdrop-blur-sm rounded-md shadow-sm border border-slate-200 z-10`}
        >
          <MessageSquare size={16} />
          {unresolvedCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] rounded-full w-3 h-3 flex items-center justify-center">{unresolvedCount}</span>}
        </button>
      ) : (
        <button 
          type="button"
          onClick={(e) => { e.preventDefault(); setActiveCommentLine(line); }}
          className="absolute right-2 top-1 p-1 text-slate-400 hover:text-[var(--ls-accent)] opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm rounded-md shadow-sm border border-slate-200 z-10"
        >
          <MessageSquare size={16} />
        </button>
      )}

      {/* Popover */}
      {isActive && (
        <InlineCommentPopover 
          lineNumber={line} 
          initialHighlightText={highlightTextForComment}
          blockText={blockText}
          onClose={() => {
            setActiveCommentLine(null);
            setHighlightTextForComment(null);
          }} 
        />
      )}
    </Element>
  );
};

const ImageWrapper = ({ node, src, ...props }: any) => {
  const images = useStore(state => state.images);
  if (!src) return null;
  const realSrc = images[src as string] || src;
  return (
    <MarkdownBlock line={getLine(node)} Element="span" className="block">
      <img src={realSrc as string} {...props} className="max-w-full max-h-48 object-contain rounded my-2 bg-slate-100" />
    </MarkdownBlock>
  );
};

const markdownComponents = {
  p: ({ node, ...props }: any) => <MarkdownBlock line={getLine(node)} Element="p" {...props} />,
  h1: ({ node, ...props }: any) => <MarkdownBlock line={getLine(node)} Element="h1" {...props} />,
  h2: ({ node, ...props }: any) => <MarkdownBlock line={getLine(node)} Element="h2" {...props} />,
  h3: ({ node, ...props }: any) => <MarkdownBlock line={getLine(node)} Element="h3" {...props} />,
  ul: ({ node, ...props }: any) => <ul data-line={getLine(node)} {...props} />,
  ol: ({ node, ...props }: any) => <ol data-line={getLine(node)} {...props} />,
  li: ({ node, ...props }: any) => <MarkdownBlock line={getLine(node)} Element="li" {...props} />,
  table: ({ node, ...props }: any) => <div className="whitespace-normal overflow-x-auto"><table data-line={getLine(node)} className="w-full border-collapse my-4" {...props} /></div>,
  thead: ({ node, ...props }: any) => <thead className="bg-slate-50 dark:bg-slate-800" {...props} />,
  tbody: ({ node, ...props }: any) => <tbody {...props} />,
  tr: ({ node, ...props }: any) => <tr className="border-b border-slate-300 dark:border-slate-700" {...props} />,
  th: ({ node, ...props }: any) => <th className="border border-slate-300 dark:border-slate-600 px-4 py-2 text-left font-semibold" {...props} />,
  td: ({ node, ...props }: any) => <td className="border border-slate-300 dark:border-slate-600 px-4 py-2" {...props} />,
  pre: ({ node, ...props }: any) => <MarkdownBlock line={getLine(node)} Element="pre" {...props} />,
  blockquote: ({ node, ...props }: any) => <MarkdownBlock line={getLine(node)} Element="blockquote" {...props} />,
  img: ImageWrapper
};

export function QuestionTree() {
  const curationMarkdown = useStore(state => state.curationMarkdown);
  const setCurationMarkdown = useStore(state => state.setCurationMarkdown);
  const [activeTab, setActiveTab] = useState<'markdown' | 'preview'>('markdown');
  
  const floatingComment = useStore(state => state.floatingComment);
  const setFloatingComment = useStore(state => state.setFloatingComment);
  const setActiveCommentLine = useStore(state => state.setActiveCommentLine);
  const setHighlightTextForComment = useStore(state => state.setHighlightTextForComment);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const isSyncingEditor = useRef<NodeJS.Timeout | null>(null);
  const isSyncingPreview = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setFloatingComment(null);
        return;
      }
      const text = selection.toString().trim();
      if (!text) {
        setFloatingComment(null);
        return;
      }

      const range = selection.getRangeAt(0);
      let node = range.startContainer as HTMLElement;
      if (node.nodeType === 3) node = node.parentElement as HTMLElement;
      
      const lineElement = node.closest('[data-line]');
      if (!lineElement) {
        setFloatingComment(null);
        return;
      }

      const lineNumber = parseInt(lineElement.getAttribute('data-line') || '0', 10);
      
      const rect = range.getBoundingClientRect();
      const containerRect = previewRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      setFloatingComment({
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top - 30 + (previewRef.current?.scrollTop || 0),
        text,
        line: lineNumber
      });
    };

    const previewContainer = previewRef.current;
    if (previewContainer) {
      previewContainer.addEventListener('mouseup', handleMouseUp);
      return () => previewContainer.removeEventListener('mouseup', handleMouseUp);
    }
  }, []);

  const handleScroll = (source: 'editor' | 'preview') => {
    if (!editorRef.current || !previewRef.current) return;

    const totalLines = curationMarkdown.split('\n').length || 1;
    const elements = Array.from(previewRef.current.querySelectorAll('[data-line]')) as HTMLElement[];
    const lineElements = elements.map(el => ({
      line: parseInt(el.getAttribute('data-line') || '1', 10),
      offset: el.offsetTop - 16 // 16px padding
    })).sort((a, b) => a.line - b.line);

    if (source === 'editor') {
      if (isSyncingPreview.current) return;
      if (isSyncingEditor.current) clearTimeout(isSyncingEditor.current);
      isSyncingEditor.current = setTimeout(() => { isSyncingEditor.current = null; }, 50);

      const { scrollTop, scrollHeight, clientHeight } = editorRef.current;

      // Handle exact bottom
      if (Math.abs(scrollHeight - clientHeight - scrollTop) <= 2) {
        previewRef.current.scrollTop = previewRef.current.scrollHeight - previewRef.current.clientHeight;
        return;
      }

      const percentage = scrollTop / (scrollHeight - clientHeight || 1);
      const editorLine = percentage * totalLines;

      let el1 = { line: 1, offset: 0 };
      let el2 = { line: totalLines, offset: previewRef.current.scrollHeight - previewRef.current.clientHeight };

      for (const el of lineElements) {
        if (el.line <= editorLine) el1 = el;
      }
      for (const el of lineElements) {
        if (el.line > editorLine) {
          el2 = el;
          break;
        }
      }

      if (el2.line === el1.line) el2.line = el1.line + 1;

      const progress = (editorLine - el1.line) / (el2.line - el1.line);
      const targetScroll = el1.offset + progress * (el2.offset - el1.offset);
      previewRef.current.scrollTop = targetScroll;

    } else {
      if (isSyncingEditor.current) return;
      if (isSyncingPreview.current) clearTimeout(isSyncingPreview.current);
      isSyncingPreview.current = setTimeout(() => { isSyncingPreview.current = null; }, 50);

      const { scrollTop, scrollHeight, clientHeight } = previewRef.current;

      // Handle exact bottom
      if (Math.abs(scrollHeight - clientHeight - scrollTop) <= 2) {
        editorRef.current.scrollTop = editorRef.current.scrollHeight - editorRef.current.clientHeight;
        return;
      }

      let el1 = { line: 1, offset: 0 };
      let el2 = { line: totalLines, offset: scrollHeight - clientHeight };

      for (const el of lineElements) {
        if (el.offset <= scrollTop) el1 = el;
      }
      for (const el of lineElements) {
        if (el.offset > scrollTop) {
          el2 = el;
          break;
        }
      }

      if (el2.offset === el1.offset) el2.offset = el1.offset + 1;

      const progress = (scrollTop - el1.offset) / (el2.offset - el1.offset);
      const targetLine = el1.line + progress * (el2.line - el1.line);
      const percentage = targetLine / totalLines;
      editorRef.current.scrollTop = percentage * (editorRef.current.scrollHeight - editorRef.current.clientHeight);
    }
  };



  const renderEditor = () => (
    <textarea
      ref={editorRef}
      onScroll={() => handleScroll('editor')}
      value={curationMarkdown}
      onChange={(e) => setCurationMarkdown(e.target.value)}
      className="w-full h-full bg-transparent text-sm text-slate-900 font-mono outline-none resize-none overflow-auto"
      placeholder="Parsed Curation Syntax will appear here..."
    />
  );

  const renderPreview = () => (
    <div
      ref={previewRef}
      onScroll={() => handleScroll('preview')}
      className="relative w-full h-full bg-white p-4 rounded border border-slate-200 overflow-auto text-slate-900 text-sm"
    >
      {floatingComment && (
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            setActiveCommentLine(floatingComment.line);
            setHighlightTextForComment(floatingComment.text);
            setFloatingComment(null);
            window.getSelection()?.removeAllRanges();
          }}
          style={{ left: floatingComment.x, top: floatingComment.y }}
          className="absolute z-50 flex items-center gap-1.5 px-2 py-1 bg-slate-900 text-white text-xs rounded-md shadow-lg hover:bg-slate-800 transition-colors -translate-x-1/2"
        >
          <MessageSquare size={12} /> Add Comment
        </button>
      )}
      <div className="markdown-content pr-12">
        <ReactMarkdown
          urlTransform={(value: string) => value}
          remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]}
          rehypePlugins={[rehypeKatex, rehypeRaw]}
          components={markdownComponents as any}
        >
          {curationMarkdown}
        </ReactMarkdown>
      </div>
    </div>
  );



  return (
    <div className="w-full h-full flex flex-col bg-slate-50">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white shadow-sm z-10">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Curation Output</h2>
      </div>

      <div className="flex px-2 border-b border-slate-200 bg-white">
        <button
          onClick={() => setActiveTab('markdown')}
          className={`px-3 py-1.5 text-xs font-medium ${activeTab === 'markdown' ? 'text-[var(--ls-accent)] border-b-2 border-[var(--ls-accent)]' : 'text-slate-500 hover:text-slate-900'}`}
        >
          Editor
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`px-3 py-1.5 text-xs font-medium ${activeTab === 'preview' ? 'text-[var(--ls-accent)] border-b-2 border-[var(--ls-accent)]' : 'text-slate-500 hover:text-slate-900'}`}
        >
          Preview
        </button>
      </div>

      <div className="flex-1 p-4 relative overflow-hidden">
        <div className={`absolute inset-4 transition-opacity duration-200 ${activeTab === 'markdown' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          {renderEditor()}
        </div>
        <div className={`absolute inset-4 transition-opacity duration-200 ${activeTab === 'preview' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          {renderPreview()}
        </div>
      </div>
    </div>
  );
}
