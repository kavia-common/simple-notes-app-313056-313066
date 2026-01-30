import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import NoteModal from "./components/NoteModal";
import NoteCard from "./components/NoteCard";
import { createNote, deleteNote, getConfiguredApiBaseUrl, listNotes, searchNotes, updateNote } from "./api/notesApi";

function containsInsensitive(haystack, needle) {
  return String(haystack || "").toLowerCase().includes(String(needle || "").toLowerCase());
}

function filterClientSide(notes, query) {
  const q = String(query || "").trim();
  if (!q) return notes;
  return notes.filter((n) => containsInsensitive(n?.title, q) || containsInsensitive(n?.content, q));
}

// PUBLIC_INTERFACE
function App() {
  /** Simple Notes App: list/create/edit/delete/search notes. */
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyMutation, setBusyMutation] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // "create" | "edit"
  const [activeNote, setActiveNote] = useState(null);

  const [serverSearchActive, setServerSearchActive] = useState(false);

  const listAbortRef = useRef(null);
  const searchAbortRef = useRef(null);

  const apiBase = getConfiguredApiBaseUrl();

  const visibleNotes = useMemo(() => filterClientSide(notes, search), [notes, search]);

  const loadNotes = async () => {
    if (listAbortRef.current) listAbortRef.current.abort();
    const controller = new AbortController();
    listAbortRef.current = controller;

    setLoading(true);
    setError("");
    try {
      const data = await listNotes({ signal: controller.signal });
      setNotes(data);
    } catch (e) {
      if (e?.name === "AbortError") return;
      setError(e?.message || "Failed to load notes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Attempt server-side search (optional) but only when query is meaningful; fallback to client-side filter otherwise.
  useEffect(() => {
    const q = String(search || "").trim();
    if (q.length < 2) {
      setServerSearchActive(false);
      if (searchAbortRef.current) searchAbortRef.current.abort();
      return;
    }

    // Debounce to avoid spamming the backend on every keypress.
    const t = setTimeout(async () => {
      if (searchAbortRef.current) searchAbortRef.current.abort();
      const controller = new AbortController();
      searchAbortRef.current = controller;

      try {
        const results = await searchNotes(q, { signal: controller.signal });
        // If server search returns something, we show it. If it returns empty, we still show empty (server authoritative).
        // If it errors, we keep existing notes and rely on client-side filter.
        setNotes(results);
        setServerSearchActive(true);
      } catch (e) {
        if (e?.name === "AbortError") return;
        setServerSearchActive(false);
        // Do not set a hard error for optional search; keep UI calm.
      }
    }, 350);

    return () => clearTimeout(t);
  }, [search]);

  const openCreate = () => {
    setModalMode("create");
    setActiveNote(null);
    setModalOpen(true);
  };

  const openEdit = (note) => {
    setModalMode("edit");
    setActiveNote(note);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (busyMutation) return;
    setModalOpen(false);
  };

  const handleSubmitModal = async (payload) => {
    setBusyMutation(true);
    setError("");
    try {
      if (modalMode === "edit") {
        const id = activeNote?.id;
        if (!id) throw new Error("Cannot edit: missing note id.");
        await updateNote(id, payload);
      } else {
        await createNote(payload);
      }
      setModalOpen(false);
      // After mutations, reload full list (authoritative).
      await loadNotes();
    } catch (e) {
      setError(e?.message || "Action failed.");
    } finally {
      setBusyMutation(false);
    }
  };

  const handleDelete = async (note) => {
    const title = note?.title || "this note";
    const ok = window.confirm(`Delete "${title}"? This cannot be undone.`);
    if (!ok) return;

    setBusyMutation(true);
    setError("");
    try {
      if (!note?.id) throw new Error("Cannot delete: missing note id.");
      await deleteNote(note.id);
      await loadNotes();
    } catch (e) {
      setError(e?.message || "Delete failed.");
    } finally {
      setBusyMutation(false);
    }
  };

  const handleResetSearch = async () => {
    setSearch("");
    setServerSearchActive(false);
    await loadNotes();
  };

  return (
    <div className="appShell">
      <header className="topBar">
        <div className="topBarInner">
          <div className="brand">
            <div className="brandMark" aria-hidden="true" />
            <div>
              <div className="brandName">Simple Notes</div>
              <div className="brandSub">Create, edit, delete, and search your notes.</div>
            </div>
          </div>

          <div className="topBarActions">
            <button className="btnSecondary" type="button" onClick={loadNotes} disabled={loading || busyMutation}>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <button className="btnPrimary" type="button" onClick={openCreate} disabled={busyMutation}>
              + New note
            </button>
          </div>
        </div>
      </header>

      <main className="main">
        <section className="controlsCard" aria-label="Search and status">
          <div className="searchRow">
            <div className="searchField">
              <label className="srOnly" htmlFor="search">
                Search notes
              </label>
              <input
                id="search"
                className="searchInput"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title or content…"
              />
            </div>

            {search ? (
              <button className="btnSecondary" type="button" onClick={handleResetSearch} disabled={loading || busyMutation}>
                Clear
              </button>
            ) : null}
          </div>

          <div className="statusRow">
            <div className="statusLeft">
              <span className="statusPill">
                {serverSearchActive ? "Server search" : "Client filter"} • {visibleNotes.length} shown
              </span>
              <span className="statusPill subtle">Total: {notes.length}</span>
            </div>

            <div className="statusRight">
              {apiBase ? (
                <span className="statusHint" title={apiBase}>
                  API: {apiBase}
                </span>
              ) : (
                <span className="statusHint">API: (same-origin)</span>
              )}
            </div>
          </div>

          {error ? (
            <div className="errorBanner" role="alert">
              <div className="errorTitle">Something went wrong</div>
              <div className="errorBody">{error}</div>
            </div>
          ) : null}
        </section>

        <section className="listSection" aria-label="Notes list">
          {loading ? (
            <div className="emptyState">
              <div className="emptyTitle">Loading notes…</div>
              <div className="emptyBody">Please wait.</div>
            </div>
          ) : visibleNotes.length === 0 ? (
            <div className="emptyState">
              <div className="emptyTitle">{search ? "No matching notes" : "No notes yet"}</div>
              <div className="emptyBody">
                {search ? "Try a different search term or clear the search." : "Create your first note to get started."}
              </div>
              {!search ? (
                <button className="btnPrimary" type="button" onClick={openCreate}>
                  + Create a note
                </button>
              ) : null}
            </div>
          ) : (
            <div className="notesGrid">
              {visibleNotes.map((n) => (
                <NoteCard key={n.id || `${n.title}-${Math.random()}`} note={n} onEdit={openEdit} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </section>

        <button className="fab" type="button" onClick={openCreate} aria-label="Add a new note">
          +
        </button>
      </main>

      <NoteModal
        open={modalOpen}
        mode={modalMode}
        initialNote={activeNote}
        onClose={closeModal}
        onSubmit={handleSubmitModal}
        busy={busyMutation}
      />
    </div>
  );
}

export default App;
