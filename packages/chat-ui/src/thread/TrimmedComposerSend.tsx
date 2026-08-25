'use client';

import { useCallback, type ReactNode } from 'react';
import { unstable_useComposerInput } from '@assistant-ui/react';
import { normalizeComposerText } from './composer-text';

type TrimmedComposerSendProps = {
  className?: string;
  title?: string;
  disabled?: boolean;
  children: ReactNode;
};

export function TrimmedComposerSend({
  className,
  title,
  disabled = false,
  children,
}: TrimmedComposerSendProps) {
  const { value, setText, send, canSend, isDisabled } = unstable_useComposerInput({
    disabled,
  });

  const normalized = normalizeComposerText(value);
  const isSendable = canSend && normalized.length > 0;

  const handleClick = useCallback(() => {
    if (!isSendable) return;
    if (normalized !== value) setText(normalized);
    send();
  }, [isSendable, normalized, value, setText, send]);

  return (
    <button
      type="button"
      className={className}
      title={title}
      disabled={!isSendable || isDisabled}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}
