import { useStore } from "@/store/useStore";
import { Play, Square, Activity } from "lucide-react";

export function TopBar() {
  const { gpuStatus, setGpuStatus } = useStore();

  return (
    <div className="h-14 shrink-0 bg-[var(--color-bg-surface)] border-b border-[var(--color-border-hairline)] flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <h1 className="text-[var(--color-text-primary)] font-display font-semibold">Curation Studio</h1>
        
        {/* Metadata Chips */}
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 text-xs rounded bg-[var(--color-bg-surface-raised)] text-[var(--color-text-muted)] border border-[var(--color-border-hairline)] hover:text-white cursor-pointer transition-colors">
            2019
          </span>
          <span className="px-2 py-1 text-xs rounded bg-[var(--color-bg-surface-raised)] text-[var(--color-text-muted)] border border-[var(--color-border-hairline)] hover:text-white cursor-pointer transition-colors">
            AL Physics
          </span>
          <span className="px-2 py-1 text-xs rounded bg-[var(--color-bg-surface-raised)] text-[var(--color-text-muted)] border border-[var(--color-border-hairline)] hover:text-white cursor-pointer transition-colors">
            MCQ
          </span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
          <Activity size={14} /> Saved · 2s ago
        </div>

        {/* GPU Status & Actions */}
        <div className="flex items-center gap-3 bg-black/20 p-1.5 rounded-lg border border-[var(--color-border-hairline)]">
          <div className="flex items-center gap-2 text-xs font-mono px-2">
            <span className={`w-2 h-2 rounded-full ${gpuStatus === 'live' ? 'bg-[var(--color-status-live)] shadow-[0_0_8px_var(--color-status-live)]' : gpuStatus === 'connecting' ? 'bg-[var(--color-status-warn)] animate-pulse' : 'bg-[var(--color-status-idle)]'}`} />
            <span className="text-[var(--color-text-muted)] w-28">
              {gpuStatus === 'live' ? 'Running · 04:12' : gpuStatus === 'connecting' ? 'Booting Worker...' : 'Worker Idle'}
            </span>
          </div>
          
          {gpuStatus === 'idle' ? (
            <button 
              onClick={() => {
                setGpuStatus('connecting');
                setTimeout(() => setGpuStatus('live'), 3000); // Mock boot
              }} 
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded bg-[var(--color-text-primary)] text-black hover:bg-white transition-colors"
            >
              <Play size={12} fill="currentColor" /> Connect
            </button>
          ) : (
            <button 
              onClick={() => setGpuStatus('idle')} 
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <Square size={12} fill="currentColor" /> Destroy
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
