type ComposerInputProps = {
  content: string;
  onContentChange: (value: string) => void;
};

/**
 * Renders the Inbox composer text input.
 */
export default function ComposerInput({ content, onContentChange }: ComposerInputProps) {
  return (
    <textarea
      value={content}
      onChange={(e) => onContentChange(e.target.value)}
      className="min-h-[128px] w-full resize-none rounded-[28px] border border-[color:var(--border)]/70 bg-[var(--surface-lowest)] p-5 pb-16 text-base leading-7 text-[var(--text)] shadow-[0_10px_40px_rgba(0,0,0,0.04)] outline-none transition duration-300 ease-[var(--ease-out)] placeholder:text-[var(--text-subtle)] focus:ring-2 focus:ring-[var(--primary)]/20 sm:p-6 sm:pb-16"
      placeholder="Capture an idea..."
    />
  );
}
