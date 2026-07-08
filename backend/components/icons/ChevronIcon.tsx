import { ChevronIcon as SidebarChevronIcon } from "@/components/sidebar/icons";

type ChevronIconProps = {
  open: boolean;
};

/**
 * Renders the chevron icon.
 */
export default function ChevronIcon({ open }: ChevronIconProps) {
  return <SidebarChevronIcon open={open} />;
}
