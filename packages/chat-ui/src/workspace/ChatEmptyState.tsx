'use client';

export type ChatEmptyStateProps = {
  title?: string;
  subtitle?: string;
};

export function ChatEmptyState({
  title = '我们从哪开始？',
  subtitle = '随便问，或用 @ 挂载知识上下文（可选）',
}: ChatEmptyStateProps) {
  return (
    <div className="acongm-chat-empty">
      <h1 className="acongm-chat-empty__title">{title}</h1>
      {subtitle ? (
        <p className="acongm-chat-empty__subtitle">{subtitle}</p>
      ) : null}
    </div>
  );
}
