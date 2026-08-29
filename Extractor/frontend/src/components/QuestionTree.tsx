import { useState, useRef } from 'react';
import { useStore } from '@/store/useStore';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';

export function QuestionTree() {
  const curationMarkdown = useStore(state => state.curationMarkdown);
  const setCurationMarkdown = useStore(state => state.setCurationMarkdown);
  const images = useStore(state => state.images);
  const [activeTab, setActiveTab] = useState<'markdown' | 'preview'>('markdown');

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const isSyncingEditor = useRef<NodeJS.Timeout | null>(null);
  const isSyncingPreview = useRef<NodeJS.Timeout | null>(null);

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

  const getLine = (node: any) => node?.position?.start?.line;

  const renderEditor = () => (
    <textarea
      ref={editorRef}
      onScroll={() => handleScroll('editor')}
      value={curationMarkdown}
      onChange={(e) => setCurationMarkdown(e.target.value)}
      className="w-full h-full bg-transparent text-sm text-[var(--color-text-primary)] font-mono outline-none resize-none overflow-auto"
      placeholder="Parsed Curation Syntax will appear here..."
    />
  );

  const renderPreview = () => (
    <div
      ref={previewRef}
      onScroll={() => handleScroll('preview')}
      className="relative w-full h-full bg-[var(--color-bg-surface)] p-4 rounded border border-[var(--color-border-hairline)] overflow-auto"
    >
      <div className="whitespace-pre-wrap markdown-content">
        <ReactMarkdown
          urlTransform={(value: string) => value}
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex, rehypeRaw]}
          components={{
            p: ({ node, ...props }) => <p data-line={getLine(node)} {...props} />,
            h1: ({ node, ...props }) => <h1 data-line={getLine(node)} {...props} />,
            h2: ({ node, ...props }) => <h2 data-line={getLine(node)} {...props} />,
            h3: ({ node, ...props }) => <h3 data-line={getLine(node)} {...props} />,
            ul: ({ node, ...props }) => <ul data-line={getLine(node)} {...props} />,
            ol: ({ node, ...props }) => <ol data-line={getLine(node)} {...props} />,
            li: ({ node, ...props }) => <li data-line={getLine(node)} {...props} />,
            blockquote: ({ node, ...props }) => <blockquote data-line={getLine(node)} {...props} />,
            img: ({ node, src, ...props }) => {
              if (!src) return null;
              const realSrc = images[src] || src;
              return <img data-line={getLine(node)} src={realSrc} {...props} className="max-w-full max-h-48 object-contain rounded my-2 bg-white/5" />;
            }
          }}
        >
          {curationMarkdown}
        </ReactMarkdown>
      </div>
    </div>
  );

  const handleSave = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/curation/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          curationMarkdown,
          images
        })
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.message || 'Saved successfully!');
      } else {
        alert('Error saving: ' + (data.detail || data.message));
      }
    } catch (error) {
      alert('Network error saving to database');
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[var(--color-bg-canvas)]">
      <div className="p-4 border-b border-[var(--color-border-hairline)] flex items-center justify-between bg-[var(--color-bg-surface)]">
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Curation Output</h2>
        <button
          onClick={handleSave}
          className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded text-xs font-semibold shadow transition-colors"
        >
          Save to Database
        </button>
      </div>

      <div className="flex px-2 border-b border-[var(--color-border-hairline)] bg-[var(--color-bg-surface)]">
        <button
          onClick={() => setActiveTab('markdown')}
          className={`px-3 py-1.5 text-xs font-medium ${activeTab === 'markdown' ? 'text-[var(--color-accent-active)] border-b-2 border-[var(--color-accent-active)]' : 'text-[var(--color-text-muted)] hover:text-white'}`}
        >
          Editor
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`px-3 py-1.5 text-xs font-medium ${activeTab === 'preview' ? 'text-[var(--color-accent-active)] border-b-2 border-[var(--color-accent-active)]' : 'text-[var(--color-text-muted)] hover:text-white'}`}
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
