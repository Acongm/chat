'use client';

import {
  CHAT_V1_TAGS,
  deriveTagOptions,
  insertChatTag,
  type ChatTagKey,
} from '@acongm/agent-session-sdk';
import { unstable_useComposerInput } from '@assistant-ui/react';

function isTagActive(key: ChatTagKey, value: string): boolean {
  const tag = CHAT_V1_TAGS.find((item) => item.key === key);
  if (!tag) return false;
  if (key === 'web') return deriveTagOptions(value).enableWebSearch;
  return value.includes(tag.prefix);
}

export function ChatQuickTags({ disabled = false }: { disabled?: boolean }) {
  const { value, setText, isDisabled } = unstable_useComposerInput({ disabled });

  return (
    <div className="acongm-gpt-composer__tags" role="group" aria-label="快捷指令">
      {CHAT_V1_TAGS.map((tag) => (
        <button
          key={tag.key}
          type="button"
          className={isTagActive(tag.key, value) ? 'is-active' : undefined}
          disabled={isDisabled}
          onClick={() => setText(insertChatTag(value, tag.key))}
        >
          {tag.label}
        </button>
      ))}
    </div>
  );
}
