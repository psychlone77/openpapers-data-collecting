/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useStore } from "@/store/useStore";
import { useAuthStore } from "@/store/useAuthStore";
import { Send, X, MessageSquare } from "lucide-react";

interface Props {
  lineNumber: number;
  initialHighlightText?: string | null;
  blockText?: string;
  onClose: () => void;
}

export function InlineCommentPopover({ lineNumber, initialHighlightText, blockText, onClose }: Props) {
  const { comments, setComments, resolveComment, submissionId } = useStore();
  const { currentUser } = useAuthStore();
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const blockComments = comments.filter((c: any) => c.lineNumber === lineNumber);

  const handleSubmit = async () => {
    if (!newComment.trim() || !currentUser || !submissionId) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`http://localhost:8000/api/queue/${submissionId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newComment.trim(),
          lineNumber,
          authorId: currentUser.id,
          highlightText: initialHighlightText || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setComments([...comments, data.comment]);
        setNewComment("");
      }
    } catch (e) {
      console.error("Failed to post comment", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <span 
      role="dialog"
      aria-label={`Comments for line ${lineNumber}`}
      className="absolute right-0 top-8 w-72 bg-white rounded-lg shadow-xl border border-slate-200 z-50 flex flex-col cursor-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-lg">
        <strong className="text-sm font-semibold flex items-center gap-2 text-slate-700 m-0">
          <MessageSquare size={16} aria-hidden="true" /> Comments
        </strong>
        <button 
          onClick={onClose} 
          aria-label="Close comments"
          className="text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 rounded-sm transition-colors flex-shrink-0"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </span>

      <span className="p-3 flex-1 max-h-64 overflow-y-auto flex flex-col gap-3">
        {blockComments.length === 0 ? (
          <span className="text-sm text-slate-500 text-center italic py-4 block">No comments on this line yet.</span>
        ) : (
          blockComments.map((c: any) => (
            <span key={c.id} className={`bg-slate-50 p-2.5 rounded-md border shadow-sm transition-opacity block ${c.resolved ? 'border-green-200 opacity-70' : 'border-slate-100'}`}>
              <span className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  {c.author?.username || "Unknown User"}
                  {c.resolved && <span className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0.5 rounded-sm font-medium">Resolved</span>}
                </span>
                <time className="text-xs text-slate-400" dateTime={new Date(c.createdAt).toISOString()}>
                  {new Date(c.createdAt).toLocaleDateString()}
                </time>
              </span>

              {c.highlightText && (
                <span className="block mt-1 mb-2">
                  <span className="text-xs font-medium text-slate-500 uppercase flex items-center justify-between tracking-wide">
                    Highlight
                    {blockText?.includes(c.highlightText) ? (
                      <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-sm text-[10px]">Original</span>
                    ) : (
                      <span className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded-sm text-[10px]">Fixed / Changed</span>
                    )}
                  </span>
                  <span className="block text-sm italic text-slate-600 border-l-2 border-slate-300 pl-2 mt-1.5 m-0">
                    "{c.highlightText}"
                  </span>
                </span>
              )}

              <span className="text-sm text-slate-700 whitespace-pre-wrap mt-1 mb-0 block">{c.content}</span>
              
              {!c.resolved && currentUser && (
                <span className="flex justify-end mt-2 pt-1 border-t border-slate-100/50">
                  <button 
                    onClick={() => resolveComment(c.id, currentUser.id)}
                    className="text-xs font-medium text-[var(--ls-accent)] hover:opacity-80 focus:outline-none focus-visible:underline transition-opacity"
                  >
                    Resolve
                  </button>
                </span>
              )}
            </span>
          ))
        )}
      </span>

      <span className="p-3 border-t border-slate-100 bg-slate-50 rounded-b-lg flex flex-col gap-2">
        {initialHighlightText && (
          <span className="bg-white p-2 rounded border border-slate-200 text-xs italic text-slate-600 border-l-2 border-l-[var(--ls-accent)] shadow-sm block">
            "{initialHighlightText}"
          </span>
        )}
        <span className="flex gap-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            aria-label="Add a comment"
            className="flex-1 min-h-[40px] text-sm bg-white border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:border-[var(--ls-accent)] focus:ring-1 focus:ring-[var(--ls-accent)] resize-none transition-shadow"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!newComment.trim() || isSubmitting}
            aria-label="Send comment"
            className="self-end bg-[var(--ls-accent)] text-white p-2 rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--ls-accent)] transition-all flex-shrink-0"
          >
            <Send size={16} aria-hidden="true" />
          </button>
        </span>
      </span>
    </span>
  );
}
