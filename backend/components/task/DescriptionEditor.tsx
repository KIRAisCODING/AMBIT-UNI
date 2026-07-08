import { Textarea } from "@/components/ui";

type DescriptionEditorProps = {
  description: string;
  onDescriptionChange: (value: string) => void;
};

/**
 * Renders the task description editor.
 */
export default function DescriptionEditor({ description, onDescriptionChange }: DescriptionEditorProps) {
  return (
    <Textarea
      value={description}
      onChange={(e) => onDescriptionChange(e.target.value)}
      placeholder="Description"
      className="min-h-28 rounded-[24px] border border-[color:var(--border)]/70 bg-[var(--surface-low)] p-4"
    />
  );
}
