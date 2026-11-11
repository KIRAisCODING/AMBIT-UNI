/**
 * AMBIT Notes Knowledge Base Utilities
 * Architecture Decisions 01 & 08
 */

/**
 * Derives a human-friendly display title from note title and markdown content.
 * - Returns explicit title if non-empty.
 * - Extracts first markdown heading (# Heading, ## Heading, etc.) if present.
 * - Or extracts the first non-empty line of content.
 * - Strips leading markdown heading tokens (#), bold/italic tokens (*, _), and excess whitespace.
 * - Truncates to max 100 characters with an ellipsis if longer.
 * - Returns "Untitled Note" if both title and content are empty.
 */
export function deriveNoteDisplayTitle(
  title: string | null | undefined,
  content: string | null | undefined
): string {
  if (title && title.trim()) {
    return title.trim();
  }

  if (!content || !content.trim()) {
    return "Untitled Note";
  }

  const lines = content.split("\n");
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // 1. Check for markdown heading: #, ##, ###, etc.
    const headingMatch = line.match(/^#{1,6}\s+(.+)$/);
    if (headingMatch && headingMatch[1].trim()) {
      return sanitizeTitle(headingMatch[1].trim());
    }

    // 2. Otherwise use first non-empty line
    return sanitizeTitle(line);
  }

  return "Untitled Note";
}

function sanitizeTitle(raw: string): string {
  // Strip bold/italics markers at start/end
  let cleaned = raw.replace(/^[*_~`]+/, "").replace(/[*_~`]+$/, "").trim();
  if (cleaned.length > 100) {
    cleaned = cleaned.slice(0, 97).trim() + "...";
  }
  return cleaned || "Untitled Note";
}

/**
 * Maps a Prisma Note record to standard API response JSON.
 * Resolves inherited hierarchy names and includes both explicit and derived display title.
 */
export function mapNoteToResponse(note: any) {
  const displayTitle = deriveNoteDisplayTitle(note.title, note.content);

  const areaName =
    note.area?.name ||
    note.project?.area?.name ||
    note.subProject?.project?.area?.name ||
    null;
  const projectName =
    note.project?.name || note.subProject?.project?.name || null;
  const subProjectName = note.subProject?.name || null;

  const effectiveAreaId =
    note.areaId ||
    note.project?.areaId ||
    note.subProject?.project?.areaId ||
    null;
  const effectiveProjectId =
    note.projectId || note.subProject?.projectId || null;
  const effectiveSubProjectId = note.subProjectId || null;

  const tags = Array.isArray(note.tags)
    ? note.tags.map((t: any) => ({
        id: t.id,
        name: t.name,
        color: t.color || null,
      }))
    : [];

  return {
    id: note.id,
    title: note.title,
    displayTitle,
    content: note.content,
    pinned: Boolean(note.pinned),
    isPinned: Boolean(note.pinned), // Alias for frontend specification compatibility
    archived: Boolean(note.archivedAt),
    archivedAt: note.archivedAt ? note.archivedAt.toISOString() : null,
    areaId: effectiveAreaId,
    projectId: effectiveProjectId,
    subProjectId: effectiveSubProjectId,
    area: areaName,
    project: projectName,
    subProject: subProjectName,
    tags,
    tagNames: tags.map((t: any) => t.name),
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

