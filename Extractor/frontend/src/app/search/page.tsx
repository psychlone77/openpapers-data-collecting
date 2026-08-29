"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { Search, PenTool } from "lucide-react";
import { useRouter } from "next/navigation";

const EXAM_SUBJECTS = {
  "A/L": ["Physics", "Chemistry", "Biology", "Mathematics", "Accounting", "Economics", "Business Studies", "IT"],
  "O/L": ["Science", "Mathematics", "English", "Sinhala", "Tamil", "History", "Geography", "Civics", "Buddhism"]
};

export default function SearchPage() {
  const [examination, setExamination] = useState("A/L");
  const [subject, setSubject] = useState(EXAM_SUBJECTS["A/L"][0]);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/curation/papers/search?exam=${encodeURIComponent(examination)}&subject=${encodeURIComponent(subject)}&year=${encodeURIComponent(year)}`);
      const data = await res.json();
      setPapers(data.papers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFixMistake = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/curation/paper/${id}/edit`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/validate/${data.submission_id}`);
      } else {
        alert("Failed to start edit session");
      }
    } catch (e) {
      console.error(e);
      alert("Error starting edit session");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--color-bg-canvas)]">
      <TopBar />
      
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-display font-bold text-white mb-2">
            Search Papers
          </h1>
          <p className="text-[var(--color-text-muted)] mb-8">
            Find an existing paper to fix extraction mistakes.
          </p>
          
          <form onSubmit={handleSearch} className="flex gap-4 mb-8">
            <div className="flex-1 flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Examination</label>
                <select
                  className="w-full bg-[var(--color-bg-surface-raised)] border border-[var(--color-border-hairline)] rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-active)] transition-all"
                  value={examination}
                  onChange={(e) => {
                    const newExam = e.target.value;
                    setExamination(newExam);
                    setSubject(EXAM_SUBJECTS[newExam as keyof typeof EXAM_SUBJECTS][0]);
                  }}
                >
                  <option value="A/L">A/L</option>
                  <option value="O/L">O/L</option>
                </select>
              </div>
              
              <div className="flex-1">
                <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Subject</label>
                <select
                  className="w-full bg-[var(--color-bg-surface-raised)] border border-[var(--color-border-hairline)] rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-active)] transition-all"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                >
                  {(EXAM_SUBJECTS[examination as keyof typeof EXAM_SUBJECTS] || []).map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              <div className="w-32">
                <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-1">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full bg-[var(--color-bg-surface-raised)] border border-[var(--color-border-hairline)] rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-active)] transition-all"
                />
              </div>
            </div>
            
            <div className="flex items-end">
              <button 
                type="submit"
                className="h-[50px] bg-[var(--color-bg-surface-raised)] text-white px-6 rounded-xl border border-[var(--color-border-hairline)] hover:border-[var(--color-accent-active)] font-medium transition-colors"
              >
                Search
              </button>
            </div>
          </form>
          
          <div className="flex flex-col gap-4">
            {loading ? (
              <p className="text-[var(--color-text-muted)]">Searching...</p>
            ) : papers.length > 0 ? (
              papers.map((p) => (
                <div key={p.id} className="bg-[var(--color-bg-surface)] border border-[var(--color-border-hairline)] rounded-xl p-6 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg text-white">{p.name}</h3>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">
                      {p.hasMarkdown ? "Editable" : "No raw data available for edit"}
                    </p>
                  </div>
                  
                  {p.hasMarkdown && (
                    <button 
                      onClick={() => handleFixMistake(p.id)}
                      className="flex items-center gap-2 bg-[var(--color-accent-active)] text-black px-4 py-2 rounded-lg font-medium hover:bg-[var(--color-accent-hover)] transition-colors"
                    >
                      <PenTool size={16} />
                      Fix Mistake
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-[var(--color-text-muted)]">No papers found. Try adjusting your filters and search.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
