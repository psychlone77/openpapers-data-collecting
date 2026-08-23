import { create } from 'zustand';

export type GpuStatus = 'idle' | 'connecting' | 'live';

export type NodeType = 'question' | 'subquestion' | 'option' | 'hint' | 'rubric' | 'asset';

export interface TreeItem {
  id: string;
  parentId: string | null;
  type: NodeType;
  content: string; // Markdown / KaTeXxt
  assetUrl?: string; // Optional image crop URL
  order: number;
}

interface AppState {
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;

  gpuStatus: GpuStatus;
  setGpuStatus: (status: GpuStatus) => void;

  pdfScale: number;
  setPdfScale: (scale: number) => void;

  pdfFile: File | null;
  setPdfFile: (file: File | null) => void;

  uploadedPdfPath: string | null;
  setUploadedPdfPath: (path: string | null) => void;

  leftPaneWidth: number;
  setLeftPaneWidth: (width: number) => void;

  // Tree State
  treeItems: TreeItem[];
  setTreeItems: (items: TreeItem[] | ((prev: TreeItem[]) => TreeItem[])) => void;
  addTreeItem: (item: TreeItem) => void;
  updateTreeItem: (id: string, updates: Partial<TreeItem>) => void;
  removeTreeItem: (id: string) => void;
  updateTreeItemImage: (bboxId: string, newBase64: string) => void;
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

  uploadedPdfPath: null,
  setUploadedPdfPath: (path) => set({ uploadedPdfPath: path }),

  leftPaneWidth: 50, // Percentage
  setLeftPaneWidth: (width) => set({ leftPaneWidth: width }),

  treeItems: [],
  setTreeItems: (items) => set((state) => ({
    treeItems: typeof items === 'function' ? items(state.treeItems) : items
  })),
  addTreeItem: (item) => set((state) => ({ treeItems: [...state.treeItems, item] })),
  updateTreeItem: (id, updates) => set((state) => ({
    treeItems: state.treeItems.map(item => item.id === id ? { ...item, ...updates } : item)
  })),
  updateTreeItemImage: (bboxId, newBase64) => set((state) => {
    const regex = new RegExp(`!\\[${bboxId}\\]\\([^)]+\\)`);
    const newItems = state.treeItems.map(item => {
      if (item.content.match(regex)) {
        return {
          ...item,
          content: item.content.replace(regex, `![${bboxId}](${newBase64})`)
        };
      }
      return item;
    });
    return { treeItems: newItems };
  }),
  removeTreeItem: (id) => set((state) => {
    // Also remove any children recursively if needed, but for now just filter out
    // A proper implementation would remove all descendants too.
    const removeIds = new Set<string>([id]);
    let currentSize = 0;
    while (removeIds.size > currentSize) {
      currentSize = removeIds.size;
      state.treeItems.forEach(item => {
        if (item.parentId && removeIds.has(item.parentId)) {
          removeIds.add(item.id);
        }
      });
    }
    return { treeItems: state.treeItems.filter(item => !removeIds.has(item.id)) };
  }),
}));
