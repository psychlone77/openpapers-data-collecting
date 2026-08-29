import { create } from 'zustand';

export type GpuStatus = 'idle' | 'connecting' | 'live';

export type NodeType = 'question' | 'subquestion' | 'option' | 'hint' | 'rubric' | 'asset';

export type BoxType = 'text' | 'table' | 'image' | 'formula';

export interface BBox {
  id: string;
  type: string;
  x0?: number;
  y0?: number;
  x1?: number;
  y1?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  pageNumber?: number;
  content?: string;
}

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

  boxes: BBox[];
  setBoxes: (boxes: BBox[]) => void;

  // Curation State
  curationMarkdown: string;
  setCurationMarkdown: (md: string) => void;
  updateTreeItemImage: (bboxId: string, newBase64: string, originalText?: string) => void;
  removeBoxContentFromTree: (bboxId: string, originalText?: string) => void;

  // Document Metadata
  paperType: string;
  setPaperType: (type: string) => void;
  language: string;
  setLanguage: (lang: string) => void;
  year: string;
  setYear: (year: string) => void;
  examination: string;
  setExamination: (exam: string) => void;
  subject: string;
  setSubject: (subject: string) => void;
  selectedPages: number[];
  setSelectedPages: (pages: number[]) => void;
  isAddPaperWizardOpen: boolean;
  setIsAddPaperWizardOpen: (isOpen: boolean) => void;
  
  submissionId: string | null;
  setSubmissionId: (id: string | null) => void;
  submissionStatus: string | null;
  setSubmissionStatus: (status: string | null) => void;

  images: Record<string, string>;
  setImages: (images: Record<string, string>) => void;
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

  boxes: [],
  setBoxes: (boxes) => set({ boxes }),

  curationMarkdown: "",
  setCurationMarkdown: (md) => set({ curationMarkdown: md }),
  
  paperType: "MCQ",
  setPaperType: (type) => set({ paperType: type }),
  language: "en",
  setLanguage: (lang) => set({ language: lang }),
  year: new Date().getFullYear().toString(),
  setYear: (year) => set({ year }),
  examination: "A/L",
  setExamination: (exam) => set({ examination: exam }),
  subject: "Physics",
  setSubject: (subject) => set({ subject }),
  selectedPages: [],
  setSelectedPages: (pages) => set({ selectedPages: pages }),
  isAddPaperWizardOpen: true,
  setIsAddPaperWizardOpen: (isOpen) => set({ isAddPaperWizardOpen: isOpen }),
  
  submissionId: null,
  setSubmissionId: (id) => set({ submissionId: id }),
  submissionStatus: null,
  setSubmissionStatus: (status) => set({ submissionStatus: status }),
  
  images: {},
  setImages: (images) => set({ images }),
  
  updateTreeItemImage: (bboxId, newBase64, originalText) => set((state) => {
    // Save to image dictionary
    const newImages = { ...state.images, [bboxId]: newBase64 };
    
    // 1. Check if the inline reference ![image](bboxId) already exists
    const inlineRegex = new RegExp(`!\\[(image)?\\]\\(${bboxId}\\)`);
    if (inlineRegex.test(state.curationMarkdown)) {
       return { images: newImages };
    }
    
    // 2. Check for old reference style ![image][bboxId] and clean it up to the new style
    const oldInlineRegex = new RegExp(`!\\[(image)?\\]\\[${bboxId}\\]`);
    if (oldInlineRegex.test(state.curationMarkdown)) {
       const cleaned = state.curationMarkdown.replace(oldInlineRegex, `![image](${bboxId})`);
       // Also strip out any [bboxId]: data... at the bottom if it exists
       const oldRefRegex = new RegExp(`\n*\\[${bboxId}\\]:\\s*(data:image/[^\\s]+)`, 'g');
       return { images: newImages, curationMarkdown: cleaned.replace(oldRefRegex, '') };
    }
    
    // 3. If it was originally text, we need to replace the text with the inline reference
    if (originalText && originalText.trim()) {
      // Normalize math delimiters to match what the backend generated
      const normalizedText = originalText
        .replace(/\\\(/g, '$')
        .replace(/\\\)/g, '$')
        .replace(/\\\[/g, '$$$$')
        .replace(/\\\]/g, '$$$$');

      const lines = normalizedText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const firstLine = lines.length > 0 ? lines[0] : null;
      
      if (firstLine && state.curationMarkdown.includes(firstLine)) {
        let newMarkdown = state.curationMarkdown;
        try {
          // Attempt to match the entire block to avoid leaving orphaned lines
          const escapedLines = lines.map(l => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
          const regexStr = escapedLines.join('\\s+');
          const blockRegex = new RegExp(regexStr);
          if (blockRegex.test(state.curationMarkdown)) {
            newMarkdown = state.curationMarkdown.replace(blockRegex, `![image](${bboxId})`);
            return { images: newImages, curationMarkdown: newMarkdown };
          }
        } catch (e) {
          // Ignore regex errors and fallback
        }
        
        // Fallback to replacing just the first line
        newMarkdown = state.curationMarkdown.replace(
          firstLine, 
          `![image](${bboxId})`
        );
        return { images: newImages, curationMarkdown: newMarkdown };
      }
    }
    
    // 4. Fallback if nothing matched (e.g. text was manually deleted/edited)
    return { images: newImages, curationMarkdown: state.curationMarkdown + `\n\n@images\n![image](${bboxId})` };
  }),
  
  removeBoxContentFromTree: (bboxId, originalText) => set((state) => {
    let newMarkdown = state.curationMarkdown;

    // 1. Remove inline image reference if it exists
    const inlineRegex = new RegExp(`!\\[(image)?\\]\\(${bboxId}\\)`, 'g');
    newMarkdown = newMarkdown.replace(inlineRegex, '');

    const oldInlineRegex = new RegExp(`!\\[(image)?\\]\\[${bboxId}\\]`, 'g');
    newMarkdown = newMarkdown.replace(oldInlineRegex, '');

    // 2. Remove original text if it exists
    if (originalText && originalText.trim()) {
      const normalizedText = originalText
        .replace(/\\\(/g, '$')
        .replace(/\\\)/g, '$')
        .replace(/\\\[/g, '$$$$')
        .replace(/\\\]/g, '$$$$');

      const lines = normalizedText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const firstLine = lines.length > 0 ? lines[0] : null;

      if (firstLine && newMarkdown.includes(firstLine)) {
        try {
          const escapedLines = lines.map(l => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
          const regexStr = escapedLines.join('\\s+');
          const blockRegex = new RegExp(regexStr, 'g');
          if (blockRegex.test(newMarkdown)) {
            newMarkdown = newMarkdown.replace(blockRegex, '');
          } else {
             // Fallback
             newMarkdown = newMarkdown.replace(firstLine, '');
          }
        } catch (e) {
          newMarkdown = newMarkdown.replace(firstLine, '');
        }
      }
    }

    // Clean up empty lines created by deletion
    newMarkdown = newMarkdown.replace(/\n{3,}/g, '\n\n').trim();

    const newImages = { ...state.images };
    delete newImages[bboxId];

    return { curationMarkdown: newMarkdown, images: newImages };
  }),
}));
