'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  ActionBarPrimitive,
  AuiIf,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useMessagePartReasoning,
} from '@assistant-ui/react';
import { MarkdownTextPrimitive } from '@assistant-ui/react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowUp,
  Brain,
  Check,
  ChevronDown,
  Copy,
  Pencil,
  Plus,
  RefreshCw,
  Square,
} from 'lucide-react';
import { ContextChipBar } from '../knowledge/ContextChipBar';
import { useKnowledgeUi } from '../knowledge/KnowledgeUiContext';

function AssistantMarkdown() {
  return (
    <MarkdownTextPrimitive
      remarkPlugins={[remarkGfm]}
      className="acongm-gpt-md"
    />
  );
}

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
      className={`acongm-gpt-reasoning${running ? ' is-streaming' : ''}${shown ? ' is-open' : ''}`}
    >
      <button
        type="button"
        className="acongm-gpt-reasoning__trigger"
        aria-expanded={shown}
        onClick={() => setOpen((value) => !value)}
      >
        <Brain size={14} aria-hidden />
        <span className={running ? 'acongm-gpt-shimmer' : undefined}>
          {running ? '思考中…' : '思考过程'}
        </span>
        <ChevronDown size={14} aria-hidden />
      </button>
      {shown ? (
        <div className="acongm-gpt-reasoning__body" aria-busy={running}>
          <pre className="acongm-gpt-reasoning__text">{part.text}</pre>
        </div>
      ) : null}
    </div>
  );
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="acongm-gpt-msg is-user">
      <div className="acongm-gpt-msg__bubble">
        <MessagePrimitive.Parts />
      </div>
      <ActionBarPrimitive.Root
        hideWhenRunning
        autohide="always"
        className="acongm-gpt-actions is-user"
      >
        <ActionBarPrimitive.Copy asChild>
          <button type="button" className="acongm-gpt-icon-btn" title="复制">
            <AuiIf condition={(s) => s.message.isCopied}>
              <Check size={14} aria-hidden />
            </AuiIf>
            <AuiIf condition={(s) => !s.message.isCopied}>
              <Copy size={14} aria-hidden />
            </AuiIf>
          </button>
        </ActionBarPrimitive.Copy>
        <ActionBarPrimitive.Edit asChild>
          <button type="button" className="acongm-gpt-icon-btn" title="编辑">
            <Pencil size={14} aria-hidden />
          </button>
        </ActionBarPrimitive.Edit>
      </ActionBarPrimitive.Root>
    </MessagePrimitive.Root>
  );
}

function EditComposer() {
  return (
    <ComposerPrimitive.Root className="acongm-gpt-edit">
      <ComposerPrimitive.Input className="acongm-gpt-edit__input" />
      <div className="acongm-gpt-edit__actions">
        <ComposerPrimitive.Cancel className="acongm-gpt-edit__cancel">
          取消
        </ComposerPrimitive.Cancel>
        <ComposerPrimitive.Send className="acongm-gpt-edit__send">
          发送
        </ComposerPrimitive.Send>
      </div>
    </ComposerPrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="acongm-gpt-msg is-assistant">
      <div className="acongm-gpt-msg__body">
        <MessagePrimitive.Parts
          components={{
            Text: AssistantMarkdown,
            Reasoning: ReasoningPart,
          }}
        />
      </div>
      <ActionBarPrimitive.Root hideWhenRunning className="acongm-gpt-actions">
        <ActionBarPrimitive.Copy asChild>
          <button type="button" className="acongm-gpt-icon-btn" title="复制">
            <AuiIf condition={(s) => s.message.isCopied}>
              <Check size={14} aria-hidden />
            </AuiIf>
            <AuiIf condition={(s) => !s.message.isCopied}>
              <Copy size={14} aria-hidden />
            </AuiIf>
          </button>
        </ActionBarPrimitive.Copy>
        <ActionBarPrimitive.Reload asChild>
          <button type="button" className="acongm-gpt-icon-btn" title="重新生成">
            <RefreshCw size={14} aria-hidden />
          </button>
        </ActionBarPrimitive.Reload>
      </ActionBarPrimitive.Root>
    </MessagePrimitive.Root>
  );
}

function Composer({
  placeholder,
  disabled = false,
}: {
  placeholder: string;
  disabled?: boolean;
}) {
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
    <ComposerPrimitive.Root
      className="acongm-gpt-composer"
      data-disabled={disabled ? 'true' : undefined}
    >
      {chips.length > 0 ? (
        <div className="acongm-gpt-composer__chips">
          <ContextChipBar chips={chips} onRemove={removeChip} />
        </div>
      ) : null}
      <div className="acongm-gpt-composer__row">
        <button
          type="button"
          className="acongm-gpt-composer__plus"
          onClick={openAttachPicker}
          title="添加知识 / 附件"
          aria-label="添加知识"
        >
          <Plus size={18} strokeWidth={2} aria-hidden />
        </button>
        <ComposerPrimitive.Input
          autoFocus
          rows={1}
          placeholder={placeholder}
          className="acongm-gpt-composer__input"
          disabled={disabled}
          onChange={onInputChange}
        />
        <div className="acongm-gpt-composer__primary">
          <ThreadPrimitive.If running>
            <ComposerPrimitive.Cancel
              className="acongm-gpt-composer__send"
              title="停止"
              disabled={disabled}
            >
              <Square size={12} fill="currentColor" aria-hidden />
            </ComposerPrimitive.Cancel>
          </ThreadPrimitive.If>
          <ThreadPrimitive.If running={false}>
            <ComposerPrimitive.Send
              className="acongm-gpt-composer__send"
              title="发送"
              disabled={disabled}
            >
              <ArrowUp size={16} strokeWidth={2.25} aria-hidden />
            </ComposerPrimitive.Send>
          </ThreadPrimitive.If>
        </div>
      </div>
    </ComposerPrimitive.Root>
  );
}

function EmptyState({
  title,
  placeholder,
  disabled = false,
}: {
  title: string;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <div className="acongm-gpt-empty">
      <h1 className="acongm-gpt-empty__title">{title}</h1>
      <div className="acongm-gpt-empty__composer">
        <Composer placeholder={placeholder} disabled={disabled} />
      </div>
    </div>
  );
}

function ThreadScrollToBottom() {
  return (
    <ThreadPrimitive.ScrollToBottom className="acongm-gpt-scroll-bottom">
      <ChevronDown size={18} aria-hidden />
    </ThreadPrimitive.ScrollToBottom>
  );
}

function HistoryLoadIndicator({ loading }: { loading: boolean }) {
  if (!loading) return null;
  return (
    <div className="acongm-gpt-history-load" aria-busy="true">
      正在加载更早的消息…
    </div>
  );
}

function ConversationFooter({
  placeholder,
  composerDisabled,
  disclaimer,
}: {
  placeholder: string;
  composerDisabled: boolean;
  disclaimer: string;
}) {
  return (
    <ThreadPrimitive.ViewportFooter className="acongm-gpt-thread__footer sticky bottom-0">
      <ThreadScrollToBottom />
      <Composer placeholder={placeholder} disabled={composerDisabled} />
      <p className="acongm-gpt-disclaimer acongm-gpt-disclaimer--thread">
        {disclaimer}
      </p>
    </ThreadPrimitive.ViewportFooter>
  );
}

function LazyHistoryViewport({
  hasOlderMessages,
  loadingOlder,
  onLoadOlderMessages,
  placeholder,
  composerDisabled,
  disclaimer,
}: {
  hasOlderMessages: boolean;
  loadingOlder: boolean;
  onLoadOlderMessages?: () => void;
  placeholder: string;
  composerDisabled: boolean;
  disclaimer: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const scrollAnchorRef = useRef<number | null>(null);
  const loadingOlderRef = useRef(loadingOlder);
  loadingOlderRef.current = loadingOlder;

  const requestOlder = () => {
    if (!hasOlderMessages || loadingOlderRef.current || !onLoadOlderMessages) {
      return;
    }
    const viewport = viewportRef.current;
    if (viewport) {
      scrollAnchorRef.current = viewport.scrollHeight - viewport.scrollTop;
    }
    onLoadOlderMessages();
  };

  useEffect(() => {
    if (loadingOlder || scrollAnchorRef.current === null) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const anchor = scrollAnchorRef.current;
    scrollAnchorRef.current = null;
    viewport.scrollTop = viewport.scrollHeight - anchor;
  }, [loadingOlder]);

  return (
    <ThreadPrimitive.Viewport
      ref={viewportRef}
      className="acongm-gpt-thread__viewport"
      onScroll={(event) => {
        const viewport = event.currentTarget;
        if (viewport.scrollTop < 120) {
          requestOlder();
        }
      }}
    >
      <HistoryLoadIndicator loading={loadingOlder} />
      <ThreadPrimitive.Messages
        components={{
          UserMessage,
          EditComposer,
          AssistantMessage,
        }}
      />
      <ConversationFooter
        placeholder={placeholder}
        composerDisabled={composerDisabled}
        disclaimer={disclaimer}
      />
    </ThreadPrimitive.Viewport>
  );
}

export type AssistantThreadProps = {
  emptyTitle?: string;
  placeholder?: string;
  disclaimer?: string;
  composerDisabled?: boolean;
  hasOlderMessages?: boolean;
  loadingOlder?: boolean;
  onLoadOlderMessages?: () => void;
};

/**
 * Official assistant-ui Thread layout:
 * Root → empty composer, or Viewport → Messages + sticky ViewportFooter.
 * https://www.assistant-ui.com/docs/primitives/thread
 * https://www.assistant-ui.com/examples/chatgpt
 */
export function AssistantThread({
  emptyTitle = '我们从哪开始？',
  placeholder = '有什么可以帮忙的？输入 @ 引用知识…',
  disclaimer = '回答可能不准确，请核对重要信息。',
  composerDisabled = false,
  hasOlderMessages = false,
  loadingOlder = false,
  onLoadOlderMessages,
}: AssistantThreadProps) {
  return (
    <ThreadPrimitive.Root className="acongm-gpt-thread">
      <AuiIf condition={(s) => s.thread.isEmpty}>
        <EmptyState
          title={emptyTitle}
          placeholder={placeholder}
          disabled={composerDisabled}
        />
      </AuiIf>

      <AuiIf condition={(s) => !s.thread.isEmpty}>
        <LazyHistoryViewport
          hasOlderMessages={hasOlderMessages}
          loadingOlder={loadingOlder}
          onLoadOlderMessages={onLoadOlderMessages}
          placeholder={placeholder}
          composerDisabled={composerDisabled}
          disclaimer={disclaimer}
        />
      </AuiIf>
    </ThreadPrimitive.Root>
  );
}
