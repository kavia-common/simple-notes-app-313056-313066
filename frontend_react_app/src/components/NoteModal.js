import React, { useEffect, useMemo, useState } from "react";

/**
 * Modal for creating/editing a note.
 * Kept dependency-free and accessible (basic focus/escape handling).
 */

// PUBLIC_INTERFACE
export default function NoteModal({ open, mode, initialNote, onClose, onSubmit, busy }) {
  /** Modal for adding/editing a note. */
  const isEdit = mode === "edit";

  const initial = useMemo(() => {
    return {
      title: initialNote?.title || "",
      content: initialNote?.content || "",
    };
  }, [initialNote]);

  const [title, setTitle] = useState(initial.title);
  const [content, setContent] = useState(initial.content);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(initial.title);
      setContent(initial.content);
      setError("");
    }
  }, [open, initial.title, initial.content]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required.");
      return;
    }
    setError("");
    await onSubmit?.({ title: trimmedTitle, content });
  };

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true" aria-label={isEdit ? "Edit note" : "Add note"}>
      <div className="modalCard">
        <div className="modalHeader">
          <div>
            <h2 className="modalTitle">{isEdit ? "Edit note" : "New note"}</h2>
            <p className="modalSubtitle">{isEdit ? "Update title and content." : "Capture a thought quickly."}</p>
          </div>
          <button type="button" className="iconButton" onClick={onClose} aria-label="Close modal" disabled={busy}>
            ×
          </button>
        </div>

        <form onSubmit={submit} className="modalForm">
          <label className="fieldLabel" htmlFor="note-title">
            Title <span className="requiredMark">*</span>
          </label>
          <input
            id="note-title"
            className="textInput"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Grocery list"
            disabled={busy}
            autoFocus
          />

          <label className="fieldLabel" htmlFor="note-content">
            Content
          </label>
          <textarea
            id="note-content"
            className="textArea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write something..."
            disabled={busy}
            rows={8}
          />

          {error ? (
            <div className="inlineError" role="alert">
              {error}
            </div>
          ) : null}

          <div className="modalActions">
            <button type="button" className="btnSecondary" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btnPrimary" disabled={busy}>
              {busy ? "Saving…" : isEdit ? "Save changes" : "Create note"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
