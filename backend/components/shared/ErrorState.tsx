type ErrorStateProps = {
  message: string;
};

/**
 * Renders a shared error message.
 */
export default function ErrorState({ message }: ErrorStateProps) {
  return <p className="text-sm text-[var(--text-muted)]">{message}</p>;
}
