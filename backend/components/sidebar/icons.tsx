import type { ReactNode } from "react";

function IconShell({ children }: { children: ReactNode }) {
  return <span className="flex h-6 w-6 items-center justify-center">{children}</span>;
}

/**
 * Renders the sidebar Inbox icon.
 */
export function InboxIcon() {
  return (
    <IconShell>
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
        <path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5v9A1.5 1.5 0 0 1 18.5 18h-13A1.5 1.5 0 0 1 4 16.5v-9Z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 10h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </IconShell>
  );
}

/**
 * Renders the sidebar Unassigned icon.
 */
export function UnassignedIcon() {
  return (
    <IconShell>
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
        <path d="M17.7025 7.35672L20.2126 7.20391C18.4133 2.45492 13.2475 -0.249942 8.21089 1.09489C2.84647 2.52725 -0.339883 8.01122 1.09396 13.3436C2.5278 18.6761 8.03887 21.8377 13.4033 20.4054C17.3863 19.3419 20.1685 16.0448 20.7505 12.2345" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M0.75 0.75V4.74998L2.75 6.74998" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </IconShell>
  );
}

/**
 * Renders the sidebar folder icon.
 */
export function FolderIcon() {
  return (
    <IconShell>
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
        <path d="M3.95363 19.2844L8.32282 13.139C8.72349 12.5757 9.25106 12.1169 9.86189 11.8004C10.4727 11.484 11.1493 11.3191 11.8357 11.3193H21.2985M3.95363 19.2844C4.32456 19.7225 4.78506 20.0742 5.30341 20.3152C5.82176 20.5561 6.38563 20.6806 6.95616 20.68H15.9767C16.7147 20.6801 17.4404 20.4894 18.0848 20.1259C18.7292 19.7624 19.2709 19.2383 19.6583 18.6035L22.8133 13.4297C22.9355 13.2158 23 12.9732 23 12.7262C23 12.4791 22.9357 12.2365 22.8135 12.0226C22.6913 11.8086 22.5156 11.631 22.3039 11.5076C22.0922 11.3841 21.8521 11.3192 21.6077 11.3193H21.2985M3.95363 19.2844C3.33766 18.56 2.99928 17.6363 3 16.6811V7.6789C3 6.88354 3.31258 6.12076 3.86897 5.55835C4.42537 4.99595 5.18 4.67999 5.96685 4.67999H8.83532C9.49161 4.67999 10.1209 4.94229 10.5847 5.41223L11.5697 6.40677C11.7533 6.59268 11.9714 6.7402 12.2115 6.8409C12.4516 6.9416 12.7089 6.99351 12.9688 6.99365L17.3412 6.99256C18.3908 6.99256 19.3973 7.41399 20.1394 8.16413C20.8816 8.91428 21.2985 9.9317 21.2985 10.9926V11.3193" stroke="black" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </IconShell>
  );
}

/**
 * Renders the sidebar chevron icon.
 */
export function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={`h-4 w-4 transition-transform ${open ? "rotate-90" : "rotate-0"}`}
      aria-hidden="true"
    >
      <path d="M7 4L13 10L7 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Renders the sidebar plus icon.
 */
export function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Renders the sidebar more-actions icon.
 */
export function MoreIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M5.5 10a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Zm6.25 0a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Zm6.25 0a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z" />
    </svg>
  );
}

/**
 * Renders the sidebar habit icon.
 */
export function HabitIcon() {
  return (
    <IconShell>
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
        <path d="M12 5v14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M5 12h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </IconShell>
  );
}

/**
 * Renders the sidebar calendar icon.
 */
export function CalendarIcon() {
  return (
    <IconShell>
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
        <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 3v4M16 3v4M4 9h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </IconShell>
  );
}

/**
 * Renders the sidebar analytics icon.
 */
export function AnalyticsIcon() {
  return (
    <IconShell>
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
        <path d="M5 18V9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M12 18V5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M19 18v-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </IconShell>
  );
}

/**
 * Renders the sidebar settings icon.
 */
export function SettingsIcon() {
  return (
    <IconShell>
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
        <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 8v4l2.5 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </IconShell>
  );
}
