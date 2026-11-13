import React, { useState } from 'react';
import { 
  FileText, Plus, Pin, Archive, Trash2, Search, Tag, Folder, Sparkles, X, Edit3, Eye
} from 'lucide-react';
import { Note, AreaHierarchy } from '../types';
import { useNotes } from '../hooks/useNotes';

interface NotesViewProps {
  hierarchy?: AreaHierarchy[];
  initialAreaId?: string;
  initialProjectId?: string;
}

export default function NotesView({
  hierarchy = [],
  initialAreaId,
  initialProjectId,
}: NotesViewProps) {
  const {
    notes,
    isLoading,
    createNote,
    updateNote,
    deleteNote,
    togglePin,
    archiveNote,
  } = useNotes();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string>(initialAreaId || '');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // New Note Form State
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newAreaId, setNewAreaId] = useState(initialAreaId || '');
  const [newProjectId, setNewProjectId] = useState(initialProjectId || '');
  const [newSubProjectId, setNewSubProjectId] = useState('');
  const [newTags, setNewTags] = useState<string[]>([]);
  const [tagInput, setNewTagInput] = useState('');
  const [previewMode, setPreviewMode] = useState(false);

  // Extract all unique tags across notes
  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags || [])));

  // Filter notes
  const filteredNotes = notes.filter((n) => {
    if (n.archivedAt) return false; // Exclude archived notes
    if (selectedAreaId === '__unassigned__') {
      if (n.areaId || n.projectId || n.subProjectId) return false;
    } else if (selectedAreaId && n.areaId !== selectedAreaId) {
      return false;
    }
    if (selectedTag && !n.tags.includes(selectedTag)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const titleMatch = (n.title || '').toLowerCase().includes(q);
      const contentMatch = n.content.toLowerCase().includes(q);
      const tagMatch = n.tags.some((t) => t.toLowerCase().includes(q));
      if (!titleMatch && !contentMatch && !tagMatch) return false;
    }
    return true;
  });

  // Sort: pinned first, then newest updated
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() && !newTitle.trim()) return;

    const pendingTag = tagInput.trim();
    const finalTags = pendingTag && !newTags.includes(pendingTag) ? [...newTags, pendingTag] : newTags;

    await createNote({
      title: newTitle.trim() || null,
      content: newContent.trim(),
      areaId: newAreaId || null,
      projectId: newProjectId || null,
      subProjectId: newSubProjectId || null,
      tags: finalTags,
    });

    setIsCreating(false);
    setNewTitle('');
    setNewContent('');
    setNewTags([]);
    setNewTagInput('');
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote) return;

    await updateNote(editingNote.id, {
      title: editingNote.title?.trim() || null,
      content: editingNote.content.trim(),
      areaId: editingNote.areaId || null,
      projectId: editingNote.projectId || null,
      subProjectId: editingNote.subProjectId || null,
      tags: editingNote.tags,
    });

    setEditingNote(null);
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto animate-fade-in relative p-6 md:p-8 rounded-[32px] overflow-hidden border border-border/40 shadow-sm">
      {/* Background Gradient */}
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-t from-surface/95 via-surface/80 to-surface/35 backdrop-blur-md pointer-events-none"
        style={{
          maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.95) 70%, rgba(0,0,0,0.5) 100%)',
          WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.95) 70%, rgba(0,0,0,0.5) 100%)',
        }}
      />

      {/* Header with Search and New Note Action */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-headline font-bold text-textPrimary flex items-center gap-2">
            <FileText className="text-accent" size={24} />
            <span>Notes & Knowledge</span>
          </h2>
          <p className="text-xs text-textSecondary mt-0.5">
            Capture thoughts, documentation, references, and insights in Markdown.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative max-w-xs w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-textSecondary">
              <Search size={16} />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full bg-surface border border-border text-xs pl-9 pr-3 py-2 rounded-full placeholder:text-textMuted text-textPrimary outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 rounded-full bg-accent text-accent-text text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:opacity-90 transition-opacity cursor-pointer shrink-0"
          >
            <Plus size={16} />
            <span>New Note</span>
          </button>
        </div>
      </div>

      {/* Filter Chips: Tags and Life Area */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
        <button
          onClick={() => {
            setSelectedTag(null);
            setSelectedAreaId('');
          }}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
            !selectedTag && !selectedAreaId
              ? 'bg-pill-active text-pill-active-text'
              : 'bg-pill text-textSecondary hover:text-textPrimary'
          }`}
        >
          All Notes
        </button>

        <button
          onClick={() => {
            setSelectedTag(null);
            setSelectedAreaId(selectedAreaId === '__unassigned__' ? '' : '__unassigned__');
          }}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
            selectedAreaId === '__unassigned__'
              ? 'bg-pill-active text-pill-active-text shadow-sm'
              : 'bg-pill text-textSecondary hover:text-textPrimary'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span>Unassigned</span>
          <span className="text-[10px] opacity-75 font-mono">
            ({notes.filter((n) => !n.archivedAt && !n.areaId && !n.projectId && !n.subProjectId).length})
          </span>
        </button>

        {hierarchy.map((area) => (
          <button
            key={area.id || area.name}
            onClick={() => setSelectedAreaId(selectedAreaId === area.id ? '' : area.id || '')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
              selectedAreaId === area.id
                ? 'bg-pill-active text-pill-active-text'
                : 'bg-pill text-textSecondary hover:text-textPrimary'
            }`}
          >
            <Folder size={12} />
            <span>{area.name}</span>
          </button>
        ))}

        {allTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
              selectedTag === tag
                ? 'bg-pill-active text-pill-active-text'
                : 'bg-pill text-textSecondary hover:text-textPrimary'
            }`}
          >
            <Tag size={12} />
            <span>#{tag}</span>
          </button>
        ))}
      </div>

      {/* Notes Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-6 h-6 border-2 border-textSecondary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sortedNotes.length === 0 ? (
        <div className="bg-surface border border-border rounded-[28px] p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
          <div className="p-4 rounded-full bg-surfaceSecondary text-textSecondary border border-border mb-3">
            <FileText size={28} />
          </div>
          <h3 className="text-lg font-headline font-semibold text-textPrimary mb-1">
            {searchQuery ? 'No matching notes found' : 'No notes yet'}
          </h3>
          <p className="text-xs text-textSecondary max-w-sm mb-4">
            {searchQuery
              ? 'Try modifying your search query or clear the active filters.'
              : 'Notes are standalone knowledge records for your references, ideas, and documentation.'}
          </p>
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 rounded-xl bg-accent text-accent-text text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} />
            <span>Create First Note</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sortedNotes.map((note) => (
            <div
              key={note.id}
              className={`group bg-surface border rounded-[24px] p-5 canvas-shadow hover:shadow-lg transition-all duration-200 relative flex flex-col justify-between min-h-[180px] ${
                note.pinned ? 'border-accent/40 bg-accent/[0.02]' : 'border-border'
              }`}
            >
              <div>
                {/* Card Header: Pin + Actions */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {note.pinned && (
                      <span className="p-1 rounded-md bg-accent/10 text-accent" title="Pinned Note">
                        <Pin size={12} />
                      </span>
                    )}
                    <h4 className="text-sm font-semibold text-textPrimary line-clamp-1">
                      {note.title || 'Untitled Note'}
                    </h4>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => togglePin(note.id)}
                      className="p-1 rounded hover:bg-surfaceSecondary text-textSecondary hover:text-textPrimary transition-colors cursor-pointer"
                      title={note.pinned ? 'Unpin note' : 'Pin note to top'}
                    >
                      <Pin size={14} className={note.pinned ? 'text-accent fill-accent' : ''} />
                    </button>
                    <button
                      onClick={() => setEditingNote(note)}
                      className="p-1 rounded hover:bg-surfaceSecondary text-textSecondary hover:text-textPrimary transition-colors cursor-pointer"
                      title="Edit note"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => archiveNote(note.id)}
                      className="p-1 rounded hover:bg-surfaceSecondary text-textSecondary hover:text-textPrimary transition-colors cursor-pointer"
                      title="Archive note"
                    >
                      <Archive size={14} />
                    </button>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="p-1 rounded hover:bg-red-500/10 text-textSecondary hover:text-red-500 transition-colors cursor-pointer"
                      title="Delete note"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Content snippet */}
                <p className="text-xs text-textSecondary leading-relaxed whitespace-pre-line line-clamp-4 font-mono mb-4">
                  {note.content}
                </p>
              </div>

              {/* Card Footer: Area/Project path & Tags */}
              <div className="pt-3 border-t border-border flex flex-col gap-1.5">
                {note.area && (
                  <div className="flex items-center gap-1 text-[11px] text-textSecondary font-medium">
                    <Folder size={12} className="text-textSecondary/70" />
                    <span>{note.area.name}</span>
                    {note.project && (
                      <>
                        <span>/</span>
                        <span>{note.project.name}</span>
                      </>
                    )}
                  </div>
                )}

                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {note.tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex text-[10px] font-medium bg-pill text-textSecondary px-2 py-0.5 rounded"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Note Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-border rounded-[28px] w-full max-w-xl max-h-[90vh] overflow-y-auto canvas-shadow p-6 md:p-8 relative">
            <button
              onClick={() => setIsCreating(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-surfaceSecondary text-textSecondary hover:text-textPrimary transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-headline font-bold text-textPrimary mb-4">
              Create First-Class Note
            </h3>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1">
                  TITLE (OPTIONAL)
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. System Architecture Notes"
                  className="w-full bg-surfaceSecondary border border-border rounded-xl px-4 py-2.5 text-sm text-textPrimary outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-textSecondary">
                    MARKDOWN CONTENT
                  </label>
                  <button
                    type="button"
                    onClick={() => setPreviewMode(!previewMode)}
                    className="text-xs text-accent flex items-center gap-1 cursor-pointer"
                  >
                    {previewMode ? <Edit3 size={12} /> : <Eye size={12} />}
                    <span>{previewMode ? 'Edit' : 'Preview'}</span>
                  </button>
                </div>

                {previewMode ? (
                  <div className="w-full min-h-[160px] max-h-[300px] overflow-y-auto bg-surfaceSecondary border border-border rounded-xl p-3 text-xs text-textPrimary font-mono whitespace-pre-wrap">
                    {newContent || <span className="text-textMuted italic">No content</span>}
                  </div>
                ) : (
                  <textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    rows={6}
                    required
                    placeholder="Write in Markdown format..."
                    className="w-full bg-surfaceSecondary border border-border rounded-xl p-3 text-xs text-textPrimary font-mono outline-none focus:ring-2 focus:ring-accent/20"
                  />
                )}
              </div>

              {/* Hierarchy Placement */}
              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1.5 flex items-center gap-1">
                  <Folder size={12} />
                  <span>LIFE AREA & PROJECT (OPTIONAL)</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newAreaId}
                    onChange={(e) => {
                      setNewAreaId(e.target.value);
                      setNewProjectId('');
                    }}
                    className="w-full bg-surfaceSecondary border border-border rounded-xl px-3 py-2 text-xs text-textPrimary outline-none cursor-pointer"
                  >
                    <option value="">No Area (Standalone)</option>
                    {hierarchy.map((a) => (
                      <option key={a.id || a.name} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={newProjectId}
                    onChange={(e) => setNewProjectId(e.target.value)}
                    disabled={!newAreaId}
                    className="w-full bg-surfaceSecondary border border-border rounded-xl px-3 py-2 text-xs text-textPrimary outline-none cursor-pointer disabled:opacity-40"
                  >
                    <option value="">No Project</option>
                    {hierarchy
                      .find((a) => a.id === newAreaId)
                      ?.projects.map((p) => (
                        <option key={p.id || p.name} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1 flex items-center gap-1">
                  <Tag size={12} />
                  <span>TAGS</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    placeholder="Add tag and press Enter..."
                    className="flex-1 bg-surfaceSecondary border border-border rounded-xl px-3 py-2 text-xs text-textPrimary outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const t = tagInput.trim();
                        if (t && !newTags.includes(t)) {
                          setNewTags([...newTags, t]);
                          setNewTagInput('');
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const t = tagInput.trim();
                      if (t && !newTags.includes(t)) {
                        setNewTags([...newTags, t]);
                        setNewTagInput('');
                      }
                    }}
                    className="px-3 py-2 rounded-xl border border-border bg-surface text-xs font-semibold cursor-pointer"
                  >
                    Add
                  </button>
                </div>

                {newTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {newTags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-pill text-textSecondary"
                      >
                        #{t}
                        <button
                          type="button"
                          onClick={() => setNewTags(newTags.filter((tag) => tag !== t))}
                          className="hover:text-red-500 cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-textSecondary hover:text-textPrimary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-accent text-accent-text text-xs font-semibold cursor-pointer hover:opacity-90"
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Note Modal */}
      {editingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-border rounded-[28px] w-full max-w-xl max-h-[90vh] overflow-y-auto canvas-shadow p-6 md:p-8 relative">
            <button
              onClick={() => setEditingNote(null)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-surfaceSecondary text-textSecondary hover:text-textPrimary transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-headline font-bold text-textPrimary mb-4">
              Edit Note
            </h3>

            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1">
                  TITLE
                </label>
                <input
                  type="text"
                  value={editingNote.title || ''}
                  onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                  placeholder="Note title"
                  className="w-full bg-surfaceSecondary border border-border rounded-xl px-4 py-2.5 text-sm text-textPrimary outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-textSecondary mb-1">
                  MARKDOWN CONTENT
                </label>
                <textarea
                  value={editingNote.content}
                  onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                  rows={6}
                  required
                  className="w-full bg-surfaceSecondary border border-border rounded-xl p-3 text-xs text-textPrimary font-mono outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingNote(null)}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-textSecondary hover:text-textPrimary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-accent text-accent-text text-xs font-semibold cursor-pointer hover:opacity-90"
                >
                  Update Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

