import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { MessageSquare, Send, CheckCircle, AlertCircle } from "lucide-react";

import { useStore } from "@/store/useStore";

export function ReviewPanel({ submissionId, status, onStatusChange }: { submissionId: string, status: string, onStatusChange: () => void }) {
  const { currentUser } = useAuthStore();
  const { curationMarkdown, images, boxes } = useStore();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [highlightedText, setHighlightedText] = useState("");

  const fetchComments = async () => {
    try {
      const res = await fetch(`http://localhost:8000/submissions/${submissionId}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchComments();
    
    // Listen for text selection globally or just let user click a button to capture selection
    const handleMouseUp = () => {
      const selection = window.getSelection()?.toString();
      if (selection && selection.trim().length > 0) {
        setHighlightedText(selection.trim());
      }
    };
    
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [submissionId]);

  const handleAddComment = async () => {
    if (!newComment.trim() || !currentUser) return;
    
    try {
      const res = await fetch(`http://localhost:8000/submissions/${submissionId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newComment,
          authorId: currentUser.id,
          highlightText: highlightedText || null
        })
      });
      if (res.ok) {
        setNewComment("");
        setHighlightedText("");
        fetchComments();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateStatus = async (newStatus: string) => {
    try {
      const res = await fetch(`http://localhost:8000/submissions/${submissionId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        onStatusChange();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isMaintainer = currentUser?.role === "MAINTAINER";

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-surface-raised)] border-l border-[var(--color-border-hairline)] w-80 shrink-0">
      <div className="p-4 border-b border-[var(--color-border-hairline)] flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <MessageSquare size={16} />
          Review Comments
        </h2>
        <span className="text-xs px-2 py-1 rounded bg-[var(--color-bg-canvas)] text-[var(--color-text-muted)] border border-[var(--color-border-hairline)]">
          {status}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {comments.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] text-center mt-4">No comments yet.</p>
        ) : (
          comments.map(c => (
            <div key={c.id} className="bg-[var(--color-bg-canvas)] p-3 rounded-lg border border-[var(--color-border-hairline)]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-[var(--color-accent-active)]">{c.author?.username}</span>
                <span className="text-[10px] text-[var(--color-text-muted)]">
                  {new Date(c.createdAt).toLocaleDateString()}
                </span>
              </div>
              {c.highlightText && (
                <div className="mb-2 pl-2 border-l-2 border-yellow-500/50 bg-yellow-500/10 p-2 text-xs text-[var(--color-text-primary)] font-mono rounded-r">
                  "{c.highlightText}"
                </div>
              )}
              <p className="text-sm text-white">{c.content}</p>
            </div>
          ))
        )}
      </div>

      <div className="p-4 bg-[var(--color-bg-surface)] border-t border-[var(--color-border-hairline)]">
        {highlightedText && (
          <div className="mb-2 flex items-start justify-between bg-yellow-500/10 border border-yellow-500/20 p-2 rounded text-xs">
            <span className="text-yellow-500/80 truncate pr-2">"{highlightedText}"</span>
            <button onClick={() => setHighlightedText("")} className="text-yellow-500 hover:text-yellow-400 font-bold shrink-0">×</button>
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="Add a comment... (Select text to highlight)"
            className="flex-1 bg-[var(--color-bg-canvas)] border border-[var(--color-border-hairline)] rounded-lg p-2 text-sm text-white outline-none focus:border-[var(--color-accent-active)] resize-none h-20"
          />
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-[10px] text-[var(--color-text-muted)] flex-1 pr-2">
            Tip: Highlight text in the editor/preview to attach it to your comment.
          </span>
          <button 
            onClick={handleAddComment}
            disabled={!newComment.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-accent-active)] text-black font-medium text-sm rounded-lg hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
          >
            <Send size={14} /> Send
          </button>
        </div>
        
        {/* Actions */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-[var(--color-border-hairline)]">
          {isMaintainer ? (
            <>
              <button 
                onClick={() => updateStatus("CHANGES_REQUESTED")}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-lg text-xs font-semibold hover:bg-yellow-500/20"
              >
                <AlertCircle size={14} /> Request Changes
              </button>
              <button 
                onClick={() => updateStatus("APPROVED")}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 bg-green-500/10 text-green-500 border border-green-500/20 rounded-lg text-xs font-semibold hover:bg-green-500/20"
              >
                <CheckCircle size={14} /> Approve & Merge
              </button>
            </>
          ) : (
            status === "CHANGES_REQUESTED" && (
              <button 
                onClick={async () => {
                  try {
                    const res = await fetch(`http://localhost:8000/api/curation/submission/${submissionId}/submit`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        curationMarkdown,
                        images,
                        boxes,
                        explanation: "Resubmitted after addressing feedback.",
                        authorId: currentUser?.id
                      })
                    });
                    if (res.ok) {
                      alert("Changes resubmitted for verification!");
                      window.location.href = '/dashboard';
                    }
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-[var(--color-accent-active)] text-black rounded-lg text-sm font-semibold hover:bg-[var(--color-accent-hover)]"
              >
                Save & Resubmit Changes
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
