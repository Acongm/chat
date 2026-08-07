'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  ActionBarPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useMessagePartReasoning,
} from '@assistant-ui/react';
import { MarkdownTextPrimitive } from '@assistant-ui/react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowUp, Brain, ChevronDown, Copy, Plus, Square } from 'lucide-react';
import { ContextChipBar } from '../knowledge/ContextChipBar';
import { useKnowledgeUi } from '../knowledge/KnowledgeUiContext';

function AssistantMarkdown() {
  return (
    <MarkdownTextPrimitive
      remarkPlugins={[remarkGfm]}
      className="acongm-aui-md"
    />
  );
}

/** Codex 风格可折叠思考块：流式时展开，历史默认收起可点开查看 */
function ReasoningPart() {
  const part = useMessagePartReasoning();
  const running = part.status?.type === 'running';
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (running) setOpen(true);
  }, [running]);

  const shown = running || open;

  return (
    <div
      className={`acongm-aui-reasoning${running ? ' is-streaming' : ''}${shown ? ' is-open' : ''}`}
    >
      <button
        type="button"
        className="acongm-aui-reasoning__trigger"
        aria-expanded={shown}
        onClick={() => setOpen((value) => !value)}
      >
        <Brain className="acongm-aui-reasoning__icon" aria-hidden />
        <span className={running ? 'acongm-aui-shimmer' : undefined}>
          {running ? '思考中…' : '思考过程'}
        </span>
        <ChevronDown
          className="acongm-aui-reasoning__chevron"
          aria-hidden
        />
      </button>
      {shown ? (
        <div className="acongm-aui-reasoning__body" aria-busy={running}>
          <pre className="acongm-aui-reasoning__text">{part.text}</pre>
        </div>
      ) : null}
    </div>
  );
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="acongm-aui-msg is-user">
      <div className="acongm-aui-msg__bubble">
        <MessagePrimitive.Content />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="acongm-aui-msg is-assistant">
      <div className="acongm-aui-msg__meta">
        <span className="acongm-aui-msg__label">助手</span>
        <ActionBarPrimitive.Root hideWhenRunning className="acongm-aui-actions">
          <ActionBarPrimitive.Copy className="acongm-aui-icon-btn" title="复制">
            <Copy size={14} />
          </ActionBarPrimitive.Copy>
        </ActionBarPrimitive.Root>
      </div>
      <div className="acongm-aui-msg__body">
        <MessagePrimitive.Content
          components={{
            Text: AssistantMarkdown,
            Reasoning: ReasoningPart,
          }}
        />
      </div>
    </MessagePrimitive.Root>
  );
}

function Composer() {
  const {
    chips,
    removeChip,
    openAttachPicker,
    setMentionQuery,
    closeMention,
    mention,
  } = useKnowledgeUi();

  const onInputChange = (event: FormEvent<HTMLTextAreaElement>) => {
    const value = event.currentTarget.value;
    const match = /(^|\s)@([^\s@]*)$/.exec(value);
    if (match) {
      setMentionQuery(match[2] ?? '');
    } else if (mention.open) {
      closeMention();
    }
  };

  return (
    <ComposerPrimitive.Root className="acongm-aui-composer">
      <div className="acongm-aui-composer__chips">
        <ContextChipBar chips={chips} onRemove={removeChip} />
      </div>
      <div className="acongm-aui-composer__box">
        <button
          type="button"
          className="acongm-aui-composer__tool"
          onClick={openAttachPicker}
          title="关联知识"
          aria-label="关联知识"
        >
          <Plus size={18} strokeWidth={2} aria-hidden />
        </button>
        <ComposerPrimitive.Input
          rows={2}
          placeholder="有什么可以帮忙的？输入 @ 引用知识…"
          className="acongm-aui-composer__input"
          onChange={onInputChange}
        />
        <ThreadPrimitive.If running={false}>
          <ComposerPrimitive.Send className="acongm-aui-send" title="发送">
            <ArrowUp size={16} strokeWidth={2.25} />
          </ComposerPrimitive.Send>
        </ThreadPrimitive.If>
        <ThreadPrimitive.If running>
          <ComposerPrimitive.Cancel className="acongm-aui-stop" title="停止">
            <Square size={12} fill="currentColor" />
          </ComposerPrimitive.Cancel>
        </ThreadPrimitive.If>
      </div>
    </ComposerPrimitive.Root>
  );
}

/** assistant-ui Thread：Codex 风消息列表 + Reasoning + Composer */
export function AssistantThread() {
  return (
    <ThreadPrimitive.Root className="acongm-aui-thread">
      <ThreadPrimitive.Viewport className="acongm-aui-thread__viewport">
        <ThreadPrimitive.Empty>
          <div className="acongm-aui-empty">
            <p className="acongm-aui-empty__title">有什么可以帮忙的？</p>
            <p className="acongm-aui-empty__desc">
              可以直接提问，也可以用 @ 或 + 关联知识上下文。
            </p>
          </div>
        </ThreadPrimitive.Empty>
        <ThreadPrimitive.Messages
          components={{
            UserMessage,
            AssistantMessage,
          }}
        />
      </ThreadPrimitive.Viewport>
      <ThreadPrimitive.ViewportFooter className="acongm-aui-thread__footer">
        <Composer />
      </ThreadPrimitive.ViewportFooter>
    </ThreadPrimitive.Root>
  );
}
