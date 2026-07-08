import CompletionCheckbox from "./CompletionCheckbox";
import DeadlinePicker from "./DeadlinePicker";
import DescriptionEditor from "./DescriptionEditor";
import { Button } from "@/components/ui";

type TaskEditorProps = {
  description: string;
  deadline: string;
  completed: boolean;
  onDescriptionChange: (value: string) => void;
  onDeadlineChange: (value: string) => void;
  onCompletedChange: (value: boolean) => void;
  onSave: () => void;
};

/**
 * Renders the task editing controls.
 */
export default function TaskEditor({
  description,
  deadline,
  completed,
  onDescriptionChange,
  onDeadlineChange,
  onCompletedChange,
  onSave,
}: TaskEditorProps) {
  return (
    <div className="space-y-3">
      <DescriptionEditor description={description} onDescriptionChange={onDescriptionChange} />
      <DeadlinePicker deadline={deadline} onDeadlineChange={onDeadlineChange} />
      <CompletionCheckbox completed={completed} onCompletedChange={onCompletedChange} />

      <Button onClick={onSave} className="mt-2">
        Save
      </Button>
    </div>
  );
}
