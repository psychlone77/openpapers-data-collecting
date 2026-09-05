"use client";

import { AppShell } from "@/components/AppShell";
import dynamic from "next/dynamic";

const AddPaperWizard = dynamic(
  () => import("@/components/AddPaperWizard").then((mod) => mod.AddPaperWizard),
  { ssr: false }
);

export default function AddPaperPage() {
  return (
    <AppShell>
      <AddPaperWizard />
    </AppShell>
  );
}
