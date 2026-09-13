import { AppShell } from "@/components/AppShell";
import { BookOpen, Upload, Cpu, CheckSquare, MessageSquare, Send, ShieldCheck } from "lucide-react";

export default function DocumentationPage() {
  const steps = [
    {
      title: "1. Upload Your Paper",
      description: "Start by selecting a PDF file of the exam paper you want to add. Make sure the file is clear and readable.",
      icon: <Upload className="w-6 h-6 text-blue-500" />,
      color: "bg-blue-50 border-blue-200"
    },
    {
      title: "2. Automatic Extraction",
      description: "Our system will automatically scan the document, recognize the text, and extract the structure (like questions, choices, and tables) into a raw format.",
      icon: <Cpu className="w-6 h-6 text-purple-500" />,
      color: "bg-purple-50 border-purple-200"
    },
    {
      title: "3. Validation & Editing",
      description: "You'll see a side-by-side view of the original PDF and the extracted text. Here, you can correct any mistakes, fix formatting, and ensure everything matches perfectly.",
      icon: <CheckSquare className="w-6 h-6 text-amber-500" />,
      color: "bg-amber-50 border-amber-200"
    },
    {
      title: "4. Annotations & Comments",
      description: "If there's a tricky section or something you're unsure about, you can add inline comments to specific parts of the text for our maintainers to review.",
      icon: <MessageSquare className="w-6 h-6 text-pink-500" />,
      color: "bg-pink-50 border-pink-200"
    },
    {
      title: "5. Submit for Review",
      description: "Once you are satisfied with the extracted text, submit your curation. It will be sent to the OpenPapers maintainers' queue.",
      icon: <Send className="w-6 h-6 text-indigo-500" />,
      color: "bg-indigo-50 border-indigo-200"
    },
    {
      title: "6. Maintainer Approval",
      description: "A maintainer will review your submission, resolve any comments you left, and approve it. Once approved, the paper becomes publicly available on OpenPapers!",
      icon: <ShieldCheck className="w-6 h-6 text-emerald-500" />,
      color: "bg-emerald-50 border-emerald-200"
    }
  ];

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto py-12 px-6">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-8 h-8 text-[var(--ls-accent)]" />
          <h1 className="text-3xl font-bold text-[var(--ls-text-primary)]">Documentation</h1>
        </div>
        <p className="text-[var(--ls-text-secondary)] text-lg mb-10">
          Learn how to digitize and contribute exam papers to the OpenPapers database.
        </p>

        <div className="space-y-12">
          <section>
            <h2 className="text-2xl font-semibold text-[var(--ls-text-primary)] mb-6">The Paper Adding Process</h2>
            
            <div className="grid gap-6">
              {steps.map((step, idx) => (
                <div key={idx} className={`p-6 rounded-2xl border ${step.color} flex gap-5 items-start`}>
                  <div className="p-3 bg-white rounded-xl shadow-sm shrink-0">
                    {step.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">{step.title}</h3>
                    <p className="text-slate-600 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
