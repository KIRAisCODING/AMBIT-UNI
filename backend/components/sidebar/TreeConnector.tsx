type TreeConnectorProps = {
  isLastChild: boolean;
  level: 1 | 2 | 3;
};

/**
 * Draws the hierarchy connector for each nested branch.
 */
export default function TreeConnector({ isLastChild, level }: TreeConnectorProps) {
  const guideHeight = level === 2 ? "h-[72px]" : "h-[24px]";

  return (
    <div className="flex w-4 shrink-0 flex-col items-start pt-[5px]">
      {!isLastChild ? <div className={`${guideHeight} border-l border-[var(--border)]/40`} /> : null}
      <div className="h-px w-4 border-t border-[var(--border)]/40" />
    </div>
  );
}
