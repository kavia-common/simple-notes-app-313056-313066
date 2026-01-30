import React from "react";

function truncate(text, maxLen) {
  const t = String(text || "");
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

// PUBLIC_INTERFACE
export default function NoteCard({ note, onEdit, onDelete }) {
  /** Displays a note and provides edit/delete actions. */
  const title = note?.title || "(Untitled)";
  const content = note?.content || "";

  return (
    <article className="noteCard" aria-label={`Note: ${title}`}>
      <div className="noteTopRow">
        <h3 className="noteTitle" title={title}>
          {truncate(title, 80)}
        </h3>

        <div className="noteActions">
          <button type="button" className="chipButton" onClick={() => onEdit?.(note)} aria-label={`Edit ${title}`}>
            Edit
          </button>
          <button
            type="button"
            className="chipButton danger"
            onClick={() => onDelete?.(note)}
            aria-label={`Delete ${title}`}
          >
            Delete
          </button>
        </div>
      </div>

      {content ? <p className="noteContent">{truncate(content, 240)}</p> : <p className="noteContent muted">No content</p>}
    </article>
  );
}
