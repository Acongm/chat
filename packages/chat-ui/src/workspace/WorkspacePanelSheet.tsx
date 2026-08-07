'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export type WorkspacePanelSheetProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/**
 * 移动端面板：全屏覆盖主对话区（ChatGPT / assistant-ui 式侧栏替代）。
 */
export function WorkspacePanelSheet({
  open,
  title,
  onClose,
  children,
}: WorkspacePanelSheetProps) {
  if (!open) return null;

  return (
    <div className="acongm-workspace-sheet" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        className="acongm-workspace-sheet__backdrop"
        aria-label="关闭面板"
        onClick={onClose}
      />
      <div className="acongm-workspace-sheet__panel">
        <div className="acongm-workspace-sheet__header">
          <strong>{title}</strong>
          <button
            type="button"
            className="acongm-workspace-sheet__close"
            onClick={onClose}
            title="关闭"
            aria-label="关闭"
          >
            <X size={16} strokeWidth={2} aria-hidden />
          </button>
        </div>
        <div className="acongm-workspace-sheet__body">{children}</div>
      </div>
    </div>
  );
}
