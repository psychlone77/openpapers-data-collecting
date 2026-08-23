import { useState } from 'react';
import { useStore, TreeItem } from '@/store/useStore';
import { GripVertical, MoreVertical, Plus } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export function QuestionTree() {
  const { treeItems, setTreeItems, selectedNodeId, setSelectedNodeId, addTreeItem } = useStore();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setTreeItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);

        // Only update order, keep parentId for now
        const newItems = arrayMove(items, oldIndex, newIndex);
        return newItems.map((item, idx) => ({ ...item, order: idx }));
      });
    }
  };

  const handleAddRoot = () => {
    addTreeItem({
      id: Math.random().toString(36).substring(7),
      parentId: null,
      type: 'question',
      content: 'New Question',
      order: treeItems.length
    });
  };

  // We are using a flat sortable context for simplicity right now.
  // Hierarchical rendering requires flat transformation to be robust with dnd-kit.
  const flatItems = [...treeItems].sort((a, b) => a.order - b.order);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="p-4 border-b border-[var(--color-border-hairline)] flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Document Hierarchy</h2>
        <button
          onClick={handleAddRoot}
          className="p-1 rounded hover:bg-white/10 text-[var(--color-text-muted)] hover:text-white transition-colors"
          title="Add Root Question"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 flex flex-col gap-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={flatItems.map(i => i.id)}
            strategy={verticalListSortingStrategy}
          >
            {flatItems.map(item => (
              <SortableNodeCard
                key={item.id}
                node={item}
                treeItems={treeItems}
                isSelected={selectedNodeId === item.id}
                onClick={() => setSelectedNodeId(item.id)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {flatItems.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8 text-[var(--color-text-muted)] text-sm border border-dashed border-[var(--color-border-hairline)] rounded-lg">
            No items in hierarchy.
            <button onClick={handleAddRoot} className="mt-2 text-[var(--color-accent-active)] hover:underline">
              Add a Question
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SortableNodeCard({ node, isSelected, onClick, treeItems }: { node: TreeItem, isSelected: boolean, onClick: () => void, treeItems: TreeItem[] }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: node.id });

  // Calculate depth for visual hierarchy
  let depth = 0;
  let currentParentId = node.parentId;
  while (currentParentId) {
    depth += 1;
    const parent = treeItems.find(i => i.id === currentParentId);
    if (parent) {
      currentParentId = parent.parentId;
    } else {
      break;
    }
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  const [showTabs, setShowTabs] = useState(false);
  const [activeTab, setActiveTab] = useState<'markdown' | 'preview'>('markdown');
  const { updateTreeItem, removeTreeItem } = useStore();

  const getTypeColor = () => {
    switch (node.type) {
      case 'question': return 'var(--color-box-text)';
      case 'subquestion': return 'var(--color-box-table)';
      case 'option': return 'var(--color-box-formula)';
      case 'hint': return 'var(--color-box-image)';
      default: return 'var(--color-text-muted)';
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`group relative flex flex-col rounded-lg border transition-all cursor-pointer overflow-hidden shrink-0
        ${isSelected
          ? 'bg-[var(--color-bg-surface-raised)] border-[var(--color-accent-active)] shadow-[0_0_0_1px_var(--color-accent-active)]'
          : 'bg-[var(--color-bg-surface)] border-[var(--color-border-hairline)] hover:bg-[var(--color-bg-surface-raised)] hover:border-gray-600'
        }`}
      style={{
        ...style,
        marginLeft: `${depth * 24}px`
      }}
      onClick={onClick}
    >
      <div className="flex items-center p-2.5">
        <div
          {...attributes}
          {...listeners}
          className="opacity-0 group-hover:opacity-50 hover:!opacity-100 cursor-grab px-1 text-[var(--color-text-muted)] transition-opacity"
        >
          <GripVertical size={16} />
        </div>

        {/* Type Badge */}
        <div className="w-2 h-8 rounded-sm mr-3 flex-shrink-0" style={{ backgroundColor: getTypeColor() }} />

        <div className="flex-1 min-w-0 flex flex-col mr-2">
          <div className="flex items-center gap-2 mb-1">
            <select
              value={node.type}
              onChange={(e) => { e.stopPropagation(); updateTreeItem(node.id, { type: e.target.value as TreeItem['type'] }); }}
              onClick={(e) => e.stopPropagation()}
              className="bg-transparent font-display font-semibold text-sm text-[var(--color-text-primary)] capitalize outline-none cursor-pointer hover:bg-white/5 rounded px-1 -ml-1"
            >
              <option value="question">Question</option>
              <option value="subquestion">Subquestion</option>
              <option value="option">Option</option>
              <option value="hint">Hint</option>
              <option value="rubric">Rubric</option>
              <option value="asset">Asset</option>
            </select>
          </div>
          <div className="text-xs text-[var(--color-text-muted)] truncate overflow-hidden">
            {node.content ? <InlineKaTeXPreview content={node.content} /> : 'Empty content'}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); removeTreeItem(node.id); }}
            className="p-1.5 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover:opacity-100"
            title="Delete Node"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowTabs(!showTabs); }}
            className="p-1.5 text-[var(--color-text-muted)] hover:text-white rounded transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      {showTabs && (
        <div className="border-t border-[var(--color-border-hairline)] bg-[var(--color-bg-surface)]">
          <div className="flex px-2 border-b border-[var(--color-border-hairline)]">
            <button
              onClick={(e) => { e.stopPropagation(); setActiveTab('markdown'); }}
              className={`px-3 py-1.5 text-xs font-medium ${activeTab === 'markdown' ? 'text-[var(--color-accent-active)] border-b-2 border-[var(--color-accent-active)]' : 'text-[var(--color-text-muted)] hover:text-white'}`}
            >
              Markdown
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setActiveTab('preview'); }}
              className={`px-3 py-1.5 text-xs font-medium ${activeTab === 'preview' ? 'text-[var(--color-accent-active)] border-b-2 border-[var(--color-accent-active)]' : 'text-[var(--color-text-muted)] hover:text-white'}`}
            >
              Preview
            </button>
          </div>
          <div className="p-3">
            {activeTab === 'markdown' ? (
              <textarea
                value={node.content}
                onChange={(e) => updateTreeItem(node.id, { content: e.target.value })}
                className="w-full bg-transparent text-xs text-[var(--color-text-primary)] font-mono resize-y min-h-[60px] outline-none"
                placeholder="Enter markdown or text... Use $math$ for inline and $$math$$ for block."
              />
            ) : (
              <div className="flex flex-col gap-2">
                {node.assetUrl && (
                  <div className="border border-[var(--color-border-hairline)] rounded overflow-hidden">
                    <img src={node.assetUrl} alt="Cropped Asset" className="w-full h-auto object-contain bg-white" />
                  </div>
                )}
                <div className="text-xs text-[var(--color-text-primary)] font-body leading-relaxed min-h-[60px]">
                  {node.content ? (
                    <KaTeXPreview content={node.content} />
                  ) : (
                    <span className="text-[var(--color-text-muted)] italic">No content to preview.</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Simple parser to render math mixed with text
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

function KaTeXPreview({ content }: { content: string }) {
  // Convert MinerU LaTeX delimiters to standard Markdown math delimiters ($ and $$)
  const normalizedContent = content
    .replace(/\\\((.*?)\\\)/g, '$$$1$$') // inline math
    .replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$'); // block math

  return (
    <div className="whitespace-pre-wrap markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          img: ({ node, src, ...props }) => {
            if (!src) return null;
            return <img src={src} {...props} />;
          }
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
}

function InlineKaTeXPreview({ content }: { content: string }) {
  // Convert MinerU LaTeX delimiters to standard Markdown math delimiters ($ and $$)
  // Also strip all newlines so it renders nicely on one line for the summary
  const normalizedContent = content
    .replace(/\n/g, ' ')
    .replace(/\\\((.*?)\\\)/g, '$$$1$$') // inline math
    .replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$'); // block math (converted to inline for preview by CSS)

  return (
    <div className="inline-markdown-content truncate [&>p]:inline">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ node, ...props }) => <span {...props} />,
          div: ({ node, ...props }) => <span {...props} />, // prevent math-display from breaking inline
          img: ({ node, src, ...props }) => {
            if (!src) return null;
            return <img src={src} {...props} />;
          }
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
}
