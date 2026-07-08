type SendButtonProps = {
  disabled: boolean;
  onClick: () => void;
};

/**
 * Renders the Inbox composer send button.
 */
export default function SendButton({ disabled, onClick }: SendButtonProps) {
  return (
    <div className="-mt-[68px] flex justify-end px-3 pb-3">
      <button
        onClick={onClick}
        disabled={disabled}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-pill)] transition duration-300 ease-[var(--ease-out)] hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Create item"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <path d="M12 19V5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="m5 12 7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
