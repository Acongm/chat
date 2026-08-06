'use client';

import { useEffect, useMemo, useState } from 'react';
import type { KnowledgeRef } from '@acongm/kb-catalog';
import type { KnowledgeSearchHit } from '@acongm/kb-catalog';

export type KnowledgeMentionMenuProps = {
  open: boolean;
  query: string;
  hits: KnowledgeSearchHit[];
  onSelect: (ref: KnowledgeRef) => void;
  onClose: () => void;
  anchor?: { top: number; left: number } | null;
};

export function KnowledgeMentionMenu({
  open,
  query,
  hits,
  onSelect,
  onClose,
  anchor,
}: KnowledgeMentionMenuProps) {
  const [active, setActive] = useState(0);
  const visible = useMemo(() => hits.slice(0, 12), [hits]);

  useEffect(() => {
    setActive(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActive((i) => Math.min(i + 1, Math.max(visible.length - 1, 0)));
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
        return;
      }
      if (event.key === 'Enter' && visible[active]) {
        event.preventDefault();
        onSelect(visible[active].ref);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, visible, active, onClose, onSelect]);

  if (!open) return null;

  return (
    <div
      className="acongm-mention-menu"
      style={
        anchor
          ? { top: anchor.top, left: anchor.left }
          : undefined
      }
      role="listbox"
      aria-label="引用知识"
    >
      <div className="acongm-mention-menu__head">
        引用知识{query ? ` · ${query}` : ''}
        <button type="button" onClick={onClose}>
          关闭
        </button>
      </div>
      {visible.length === 0 ? (
        <p className="acongm-mention-menu__empty">无匹配</p>
      ) : (
        <ul>
          {visible.map((hit, index) => (
            <li key={hit.ref.id}>
              <button
                type="button"
                className={index === active ? 'is-active' : undefined}
                onMouseEnter={() => setActive(index)}
                onClick={() => onSelect(hit.ref)}
              >
                <span>{hit.ref.title}</span>
                <small>
                  {hit.ref.level}
                  {hit.subtitle ? ` · ${hit.subtitle}` : ''}
                </small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
