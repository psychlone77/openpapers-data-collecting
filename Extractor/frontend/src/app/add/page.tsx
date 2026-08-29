"use client";

import { TopBar } from "@/components/TopBar";
import dynamic from 'next/dynamic';

const AddPaperWizard = dynamic(() => import('@/components/AddPaperWizard').then(mod => mod.AddPaperWizard), {
  ssr: false
});
export default function AddPaperPage() {
  return (
    <div className="flex flex-col h-screen bg-[var(--color-bg-canvas)]">
      <TopBar />
      <div className="flex-1 overflow-hidden">
        <AddPaperWizard />
      </div>
    </div>
  );
}
