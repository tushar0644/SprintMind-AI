import React, { useState, useRef } from "react";
import { Button } from "../../../components/ui/Button";

interface CommentEditorProps {
  initialValue?: string;
  submitLabel?: string;
  cancelLabel?: string;
  placeholder?: string;
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
  isCompact?: boolean;
}

export const renderMarkdown = (text: string): string => {
  if (!text) return "";
  
  // Escape HTML tags to prevent XSS
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code Blocks (```code```) - run first to avoid modifying syntax inside
  html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-zinc-900 text-zinc-100 p-3 rounded-xl text-[11px] font-mono my-2 overflow-x-auto select-text border border-zinc-800"><code>$1</code></pre>');

  // Inline Code (`code`)
  html = html.replace(/`(.*?)`/g, '<code class="bg-zinc-100 text-rose-600 px-1.5 py-0.5 rounded-lg text-[11px] font-mono font-semibold">$1</code>');

  // Bold (**text**)
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // Italic (*text*)
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

  // Unordered list items (- item)
  html = html.replace(/^\s*-\s+(.*?)$/gm, '<li class="list-disc list-inside ml-2.5 my-1 text-xs">$1</li>');

  // Line breaks
  html = html.replace(/\n/g, "<br />");

  return html;
};

export const CommentEditor: React.FC<CommentEditorProps> = ({
  initialValue = "",
  submitLabel = "Comment",
  cancelLabel = "Cancel",
  placeholder = "Write a comment… (Markdown supported)",
  onSubmit,
  onCancel,
  isCompact = false
}) => {
  const [value, setValue] = useState(initialValue);
  const [isPreview, setIsPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertMarkdown = (syntax: string, placeholderText = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);

    let replacement = "";
    if (syntax === "bold") {
      replacement = `**${selected || placeholderText || "bold text"}**`;
    } else if (syntax === "italic") {
      replacement = `*${selected || placeholderText || "italic text"}*`;
    } else if (syntax === "code") {
      replacement = `\`${selected || placeholderText || "code"}\``;
    } else if (syntax === "list") {
      replacement = `\n- ${selected || placeholderText || "item"}`;
    }

    const newValue = text.substring(0, start) + replacement + text.substring(end);
    setValue(newValue);

    // Reset cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + 2, 
        start + replacement.length - (syntax === "list" ? 0 : 2)
      );
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(value);
      setValue("");
      setIsPreview(false);
    } catch (err: any) {
      setError(err.message || "Failed to post comment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5">
      <div className="border border-stitch-outline-variant rounded-2xl bg-white overflow-hidden focus-within:ring-2 focus-within:ring-stitch-primary/10 focus-within:border-stitch-primary transition-all duration-200">
        
        {/* Formatting Toolbar */}
        {!isPreview && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-stitch-surface-container/20 border-b border-stitch-outline-variant/40 select-none">
            <button
              type="button"
              onClick={() => insertMarkdown("bold")}
              className="p-1 text-xs font-bold text-stitch-on-surface-variant hover:text-stitch-on-surface hover:bg-stitch-surface-container rounded transition-colors"
              title="Bold"
            >
              B
            </button>
            <button
              type="button"
              onClick={() => insertMarkdown("italic")}
              className="p-1 text-xs italic text-stitch-on-surface-variant hover:text-stitch-on-surface hover:bg-stitch-surface-container rounded transition-colors"
              title="Italic"
            >
              I
            </button>
            <button
              type="button"
              onClick={() => insertMarkdown("code")}
              className="p-1 text-[11px] font-mono text-stitch-on-surface-variant hover:text-stitch-on-surface hover:bg-stitch-surface-container rounded transition-colors"
              title="Inline Code"
            >
              &lt;/&gt;
            </button>
            <button
              type="button"
              onClick={() => insertMarkdown("list")}
              className="p-1 text-xs text-stitch-on-surface-variant hover:text-stitch-on-surface hover:bg-stitch-surface-container rounded transition-colors"
              title="Bulleted List"
            >
              • List
            </button>

            <button
              type="button"
              onClick={() => setIsPreview(true)}
              className="ml-auto text-[10px] uppercase font-bold text-stitch-primary hover:underline"
            >
              Preview
            </button>
          </div>
        )}

        {isPreview && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-stitch-surface-container/20 border-b border-stitch-outline-variant/40 select-none">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stitch-on-surface-variant/70">Preview Mode</span>
            <button
              type="button"
              onClick={() => setIsPreview(false)}
              className="text-[10px] uppercase font-bold text-stitch-primary hover:underline"
            >
              Write
            </button>
          </div>
        )}

        {/* Editor Area */}
        <div className="relative">
          {isPreview ? (
            <div 
              className={`w-full px-4.5 py-3 text-xs leading-relaxed text-stitch-on-surface select-text overflow-y-auto max-h-40 min-h-[70px] prose prose-sm prose-indigo`}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(value) || `<span class="text-stitch-on-surface-variant/40 italic">Nothing to preview.</span>` }}
            />
          ) : (
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              rows={isCompact ? 2 : 3}
              disabled={isSubmitting}
              className="w-full bg-transparent border-0 outline-none focus:outline-none focus:ring-0 px-4.5 py-3 text-xs leading-relaxed text-stitch-on-surface placeholder-stitch-on-surface-variant/40 resize-none select-text"
            />
          )}
        </div>
      </div>

      {error && (
        <p className="text-[10px] font-semibold text-stitch-error bg-stitch-error/5 border border-stitch-error/10 rounded-lg px-2.5 py-1.5 select-none">
          {error}
        </p>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-xl text-xs font-semibold px-3 py-1.5"
          >
            {cancelLabel}
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={isSubmitting || !value.trim()}
          className="rounded-xl text-xs font-semibold px-3 py-1.5"
        >
          {isSubmitting ? "Posting…" : submitLabel}
        </Button>
      </div>
    </form>
  );
};
