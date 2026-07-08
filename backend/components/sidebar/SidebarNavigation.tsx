import NavigationItem from "./NavigationItem";
import { InboxIcon, UnassignedIcon, HabitIcon, CalendarIcon, AnalyticsIcon, SettingsIcon } from "./icons";

type SidebarNavigationProps = {
  isInboxActive: boolean;
  isUnassignedActive: boolean;
  isHabitsActive: boolean;
  isCalendarActive: boolean;
  isAnalyticsActive: boolean;
  isSettingsActive: boolean;
  section?: "top" | "footer";
};

/**
 * Renders the static navigation rows for the sidebar.
 */
export default function SidebarNavigation({
  isInboxActive,
  isUnassignedActive,
  isHabitsActive,
  isCalendarActive,
  isAnalyticsActive,
  isSettingsActive,
  section = "top",
}: SidebarNavigationProps) {
  if (section === "footer") {
    return (
      <div className="space-y-1">
        <NavigationItem href="/unassigned" icon={<UnassignedIcon />} label="Unassigned" active={isUnassignedActive} />
        <NavigationItem href="/habits" icon={<HabitIcon />} label="Habits" active={isHabitsActive} />
        <NavigationItem href="/calendar" icon={<CalendarIcon />} label="Calendar" active={isCalendarActive} />
        <NavigationItem href="/analytics" icon={<AnalyticsIcon />} label="Analytics" active={isAnalyticsActive} />
        <NavigationItem href="/settings" icon={<SettingsIcon />} label="Settings" active={isSettingsActive} />
      </div>
    );
  }

  return (
    <div className="mb-4 flex flex-col gap-1">
      <NavigationItem href="/" icon={<InboxIcon />} label="Inbox" active={isInboxActive} />
    </div>
  );
}
