import { create } from 'zustand';

export type GpuStatus = 'idle' | 'connecting' | 'live';

interface AppState {
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  
  gpuStatus: GpuStatus;
  setGpuStatus: (status: GpuStatus) => void;
  
  pdfScale: number;
  setPdfScale: (scale: number) => void;
  
  pdfFile: File | null;
  setPdfFile: (file: File | null) => void;
  
  leftPaneWidth: number;
  setLeftPaneWidth: (width: number) => void;
}

export const useStore = create<AppState>((set) => ({
  selectedNodeId: null,
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  
  gpuStatus: 'idle',
  setGpuStatus: (status) => set({ gpuStatus: status }),
  
  pdfScale: 1.0,
  setPdfScale: (scale) => set({ pdfScale: scale }),
  
  pdfFile: null,
  setPdfFile: (file) => set({ pdfFile: file }),
  
  leftPaneWidth: 50, // Percentage
  setLeftPaneWidth: (width) => set({ leftPaneWidth: width }),
}));
