import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { GripVertical, MoreVertical, ChevronDown, Check } from 'lucide-react';

export function QuestionTree() {
  const { selectedNodeId, setSelectedNodeId } = useStore();

  return (
    <div className="w-full h-full flex flex-col">
      <div className="p-4 border-b border-[var(--color-border-hairline)] flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Document Hierarchy</h2>
      </div>
      
      <div className="flex-1 overflow-auto p-4 flex flex-col gap-2">
        {/* Mock Root Question */}
        <NodeCard id="q1" type="structured_parent" title="Question 1 Structured Essay" marks={15} isSelected={selectedNodeId === 'q1'} onClick={() => setSelectedNodeId('q1')} />
        
        {/* Mock Child node */}
        <div className="pl-6 border-l border-[var(--color-border-hairline)] ml-3 flex flex-col gap-2 relative">
          {/* Connector line */}
          <div className="absolute top-6 -left-px w-6 h-px bg-[var(--color-border-hairline)]" />
          <NodeCard id="q1a" type="structured_part" title="1(a) Short Answer" marks={2} isSelected={selectedNodeId === 'q1a'} onClick={() => setSelectedNodeId('q1a')} />
          
          <div className="absolute top-20 -left-px w-6 h-px bg-[var(--color-border-hairline)]" />
          <NodeCard id="q1b" type="structured_part" title="1(b) Descriptive" marks={5} isSelected={selectedNodeId === 'q1b'} onClick={() => setSelectedNodeId('q1b')} expanded />
          
          {/* Mock Deep Child */}
          <div className="pl-6 border-l border-[var(--color-border-hairline)] ml-3 mt-2 flex flex-col gap-2 relative">
            <div className="absolute top-6 -left-px w-6 h-px bg-[var(--color-border-hairline)]" />
            <NodeCard id="q1b_i" type="structured_part" title="1(b)(i) Derivation" marks={3} isSelected={selectedNodeId === 'q1b_i'} onClick={() => setSelectedNodeId('q1b_i')} />
            
            <div className="absolute top-20 -left-px w-6 h-px bg-[var(--color-border-hairline)]" />
            <NodeCard id="q1b_ii" type="structured_part" title="1(b)(ii) Graphical" marks={2} isSelected={selectedNodeId === 'q1b_ii'} onClick={() => setSelectedNodeId('q1b_ii')} />
          </div>
        </div>

        {/* Orphan Asset Tray (Warn state example) */}
        <div className="mt-8 p-3 rounded-lg border border-[var(--color-status-warn)] bg-[color-mix(in_srgb,var(--color-status-warn)_10%,transparent)]">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-[var(--color-status-warn)]" />
            <h3 className="text-xs font-semibold text-[var(--color-status-warn)] uppercase tracking-wider">Unresolved Assets (1)</h3>
          </div>
          <div className="bg-[var(--color-bg-surface-raised)] border border-[var(--color-border-hairline)] p-2 rounded flex items-center justify-between">
            <span className="text-xs text-[var(--color-text-muted)] font-mono">crop_table_01.png</span>
            <button className="text-xs text-[var(--color-accent-active)] font-medium hover:underline">Attach...</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NodeCard({ id, type, title, marks, isSelected, onClick, expanded = false }: any) {
  const [showTabs, setShowTabs] = useState(expanded);
  
  // Maps type to color legend
  const getTypeColor = () => {
    switch (type) {
      case 'mcq': return 'var(--color-box-text)';
      case 'structured_parent': return 'var(--color-box-table)';
      case 'structured_part': return 'var(--color-box-formula)';
      case 'essay': return 'var(--color-box-image)';
      default: return 'var(--color-text-muted)';
    }
  };

  return (
    <div 
      className={`group relative flex flex-col rounded-lg border transition-all cursor-pointer overflow-hidden
        ${isSelected 
          ? 'bg-[var(--color-bg-surface-raised)] border-[var(--color-accent-active)] shadow-[0_0_0_1px_var(--color-accent-active)]' 
          : 'bg-[var(--color-bg-surface)] border-[var(--color-border-hairline)] hover:bg-[var(--color-bg-surface-raised)] hover:border-gray-600'
        }`}
      onClick={onClick}
    >
      <div className="flex items-center p-2.5">
        <div className="opacity-0 group-hover:opacity-50 hover:!opacity-100 cursor-grab px-1 text-[var(--color-text-muted)] transition-opacity">
          <GripVertical size={16} />
        </div>
        
        {/* Type Badge */}
        <div className="w-2 h-8 rounded-sm mr-3" style={{ backgroundColor: getTypeColor() }} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display font-semibold text-sm text-[var(--color-text-primary)] truncate">{title}</span>
            <span className="text-xs font-mono text-[var(--color-text-muted)]">[{marks}mk]</span>
          </div>
        </div>
        
        <button className="p-1.5 text-[var(--color-text-muted)] hover:text-white rounded transition-colors opacity-0 group-hover:opacity-100">
          <MoreVertical size={16} />
        </button>
      </div>

      {showTabs && (
        <div className="border-t border-[var(--color-border-hairline)] bg-[var(--color-bg-surface)]">
          <div className="flex px-2 border-b border-[var(--color-border-hairline)]">
            <button className="px-3 py-1.5 text-xs font-medium text-[var(--color-accent-active)] border-b-2 border-[var(--color-accent-active)]">Content</button>
            <button className="px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:text-white">Rubric</button>
            <button className="px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:text-white">Solution</button>
          </div>
          <div className="p-3 text-xs text-[var(--color-text-muted)] font-body leading-relaxed">
            <p>Define the term <em>momentum</em> in the context of classical mechanics. Use $p = mv$ in your explanation.</p>
          </div>
        </div>
      )}
    </div>
  );
}
