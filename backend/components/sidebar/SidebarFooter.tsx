import type { ReactNode } from "react";
import SidebarNavigation from "./SidebarNavigation";
import { PlusIcon } from "./icons";

type SidebarFooterProps = {
  creatingArea: boolean;
  isUnassignedActive: boolean;
  createInput: (placeholder: string, className?: string) => ReactNode;
  onStartCreating: () => void;
};

/**
 * Renders the sidebar footer navigation and new-area action.
 */
export default function SidebarFooter({ creatingArea, isUnassignedActive, createInput, onStartCreating }: SidebarFooterProps) {
  return (
    <div className="mt-4 border-t border-[var(--surface-container)] pt-4">
      <SidebarNavigation
        isInboxActive={false}
        isUnassignedActive={isUnassignedActive}
        isHabitsActive={false}
        isCalendarActive={false}
        isAnalyticsActive={false}
        isSettingsActive={false}
        section="footer"
      />

      <div className="mt-4">
        {creatingArea ? (
          createInput("Area name")
        ) : (
          <button type="button" className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-[var(--text-muted)] transition hover:bg-[var(--surface-container)] hover:text-[var(--text)]" onClick={onStartCreating}>
            <PlusIcon />
            New Area
          </button>
        )}
      </div>
    </div>
  );
}
