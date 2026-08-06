'use client';

import type { KnowledgeRef } from '@acongm/kb-catalog';

export type ContextChipBarProps = {
  chips: KnowledgeRef[];
  onRemove?: (id: string) => void;
  emptyHint?: string;
};

export function ContextChipBar({
  chips,
  onRemove,
  emptyHint,
}: ContextChipBarProps) {
  if (!chips.length) {
    return emptyHint ? (
      <div className="acongm-context-chips is-empty">{emptyHint}</div>
    ) : null;
  }

  return (
    <div className="acongm-context-chips" aria-label="知识上下文">
      {chips.map((chip) => (
        <span key={chip.id} className="acongm-context-chip" data-level={chip.level}>
          <span className="acongm-context-chip__label">{chip.title}</span>
          {onRemove ? (
            <button
              type="button"
              className="acongm-context-chip__remove"
              aria-label={`移除 ${chip.title}`}
              onClick={() => onRemove(chip.id)}
            >
              ×
            </button>
          ) : null}
        </span>
      ))}
    </div>
  );
}
