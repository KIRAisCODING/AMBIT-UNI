import { Input } from "@/components/ui";

type DeadlinePickerProps = {
  deadline: string;
  onDeadlineChange: (value: string) => void;
};

/**
 * Renders the task deadline picker.
 */
export default function DeadlinePicker({ deadline, onDeadlineChange }: DeadlinePickerProps) {
  return (
    <Input
      type="date"
      value={deadline}
      onChange={(e) => onDeadlineChange(e.target.value)}
      className="max-w-xs rounded-[20px] border border-[color:var(--border)]/70 bg-[var(--surface-low)]"
    />
  );
}
