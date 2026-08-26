'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { flushSync } from 'react-dom';
import {
  ActionBarPrimitive,
  AuiIf,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  unstable_useComposerInput,
  useMessagePartReasoning,
  useMessagePartText,
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
import { useDocChatConfig } from '../runtime/DocChatConfigContext';
import { ChatQuickTags } from './ChatQuickTags';
import { normalizeComposerText } from './composer-text';
import { TrimmedComposerSend } from './TrimmedComposerSend';

function AssistantMarkdown() {
  return (
    <MarkdownTextPrimitive
      remarkPlugins={[remarkGfm]}
      className="acongm-gpt-md"
    />
  );
}

function UserText() {
  const part = useMessagePartText();
  return <>{normalizeComposerText(part.text)}</>;
}

function hasReasoningPart(parts: ReadonlyArray<{ type: string }>): boolean {
  return parts.some((part) => part.type === 'reasoning');
}

function ReasoningPanel({
  text,
  running,
}: {
  text: string;
  running: boolean;
}) {
  const { enableThinking } = useDocChatConfig();
  const [open, setOpen] = useState(() => enableThinking || text.length > 0);

  useEffect(() => {
    if (running) setOpen(true);
  }, [running]);

  useEffect(() => {
    if (text.length > 0) setOpen(true);
  }, [text.length]);

  if (!enableThinking && !text && !running) return null;

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
          <pre className="acongm-gpt-reasoning__text">
            {text ||
              (running
                ? ''
                : '模型未返回思考过程。若持续为空，当前模型可能未输出 reasoning / <think>。')}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

function ReasoningPart() {
  const part = useMessagePartReasoning();
  return (
    <ReasoningPanel
      text={part.text}
      running={part.status?.type === 'running'}
    />
  );
}

function ReasoningFallback() {
  return <ReasoningPanel text="" running={false} />;
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="acongm-gpt-msg is-user">
      <div className="acongm-gpt-msg__bubble">
        <MessagePrimitive.Parts components={{ Text: UserText }} />
      </div>
      <div className="acongm-gpt-actions-slot">
        <ActionBarPrimitive.Root
          autohide="never"
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
      </div>
    </MessagePrimitive.Root>
  );
}

function EditComposer() {
  const trimBeforeSend = useTrimComposerBeforeSend();

  return (
    <ComposerPrimitive.Root className="acongm-gpt-edit" onSubmit={trimBeforeSend}>
      <ComposerPrimitive.Input className="acongm-gpt-edit__input" />
      <div className="acongm-gpt-edit__actions">
        <ComposerPrimitive.Cancel className="acongm-gpt-edit__cancel">
          取消
        </ComposerPrimitive.Cancel>
        <TrimmedComposerSend className="acongm-gpt-edit__send">
          发送
        </TrimmedComposerSend>
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
        <AuiIf condition={(s) => !hasReasoningPart(s.message.parts)}>
          <ReasoningFallback />
        </AuiIf>
      </div>
      <div className="acongm-gpt-actions-slot">
        <ActionBarPrimitive.Root
          autohide="never"
          className="acongm-gpt-actions is-assistant"
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
          <ActionBarPrimitive.Reload asChild>
            <button type="button" className="acongm-gpt-icon-btn" title="重新生成">
              <RefreshCw size={14} aria-hidden />
            </button>
          </ActionBarPrimitive.Reload>
        </ActionBarPrimitive.Root>
      </div>
    </MessagePrimitive.Root>
  );
}

function useTrimComposerBeforeSend() {
  const { value, setText } = unstable_useComposerInput();

  return useCallback(
    (event?: FormEvent) => {
      const normalized = normalizeComposerText(value);
      if (!normalized) {
        event?.preventDefault();
        return;
      }
      if (normalized !== value) {
        flushSync(() => setText(normalized));
      }
    },
    [value, setText],
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

  const { value, setText, send } = unstable_useComposerInput({ disabled });
  const trimBeforeSend = useTrimComposerBeforeSend();

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }
    const normalized = normalizeComposerText(value);
    if (!normalized) {
      event.preventDefault();
      return;
    }
    if (normalized !== value) {
      event.preventDefault();
      flushSync(() => setText(normalized));
      send();
    }
  };

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
      onSubmit={trimBeforeSend}
    >
      {chips.length > 0 ? (
        <div className="acongm-gpt-composer__chips">
          <ContextChipBar chips={chips} onRemove={removeChip} />
        </div>
      ) : null}
      <ChatQuickTags disabled={disabled} />
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
          onKeyDown={onKeyDown}
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
            <TrimmedComposerSend
              className="acongm-gpt-composer__send"
              title="发送"
              disabled={disabled}
            >
              <ArrowUp size={16} strokeWidth={2.25} aria-hidden />
            </TrimmedComposerSend>
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
    <div className="acongm-gpt-thread__footer">
      <ThreadScrollToBottom />
      <Composer placeholder={placeholder} disabled={composerDisabled} />
      <p className="acongm-gpt-disclaimer acongm-gpt-disclaimer--thread">
        {disclaimer}
      </p>
    </div>
  );
}

type ScrollAnchor = {
  kind: 'viewport' | 'document';
  value: number;
};

function isDrawerViewport(viewport: HTMLElement | null): boolean {
  return Boolean(viewport?.closest('.acongm-chat-rd'));
}

function captureScrollAnchor(viewport: HTMLDivElement | null): ScrollAnchor | null {
  if (isDrawerViewport(viewport) && viewport) {
    return {
      kind: 'viewport',
      value: viewport.scrollHeight - viewport.scrollTop,
    };
  }
  const doc = document.scrollingElement;
  if (!doc) return null;
  return { kind: 'document', value: doc.scrollHeight - doc.scrollTop };
}

function restoreScrollAnchor(
  viewport: HTMLDivElement | null,
  anchor: ScrollAnchor,
) {
  if (anchor.kind === 'viewport' && viewport) {
    viewport.scrollTop = viewport.scrollHeight - anchor.value;
    return;
  }
  const doc = document.scrollingElement;
  if (doc) {
    doc.scrollTop = doc.scrollHeight - anchor.value;
  }
}

function scrollDocumentToLatest() {
  const doc = document.scrollingElement;
  if (doc) {
    doc.scrollTop = doc.scrollHeight;
  }
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
  const scrollAnchorRef = useRef<ScrollAnchor | null>(null);
  const didAlignLatestRef = useRef(false);
  const loadingOlderRef = useRef(loadingOlder);
  loadingOlderRef.current = loadingOlder;

  const requestOlder = useCallback(() => {
    if (!hasOlderMessages || loadingOlderRef.current || !onLoadOlderMessages) {
      return;
    }
    scrollAnchorRef.current = captureScrollAnchor(viewportRef.current);
    onLoadOlderMessages();
  }, [hasOlderMessages, onLoadOlderMessages]);

  useEffect(() => {
    if (loadingOlder || scrollAnchorRef.current === null) return;
    const anchor = scrollAnchorRef.current;
    scrollAnchorRef.current = null;
    restoreScrollAnchor(viewportRef.current, anchor);
  }, [loadingOlder]);

  useEffect(() => {
    const onWindowScroll = () => {
      if ((document.scrollingElement?.scrollTop ?? window.scrollY) < 120) {
        requestOlder();
      }
    };
    window.addEventListener('scroll', onWindowScroll, { passive: true });
    return () => window.removeEventListener('scroll', onWindowScroll);
  }, [requestOlder]);

  useEffect(() => {
    if (didAlignLatestRef.current) return;
    const viewport = viewportRef.current;
    if (!viewport || isDrawerViewport(viewport)) return;
    if (!viewport.querySelector('.acongm-gpt-msg')) return;
    scrollDocumentToLatest();
    didAlignLatestRef.current = true;
  });

  return (
    <>
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
      </ThreadPrimitive.Viewport>
      <ConversationFooter
        placeholder={placeholder}
        composerDisabled={composerDisabled}
        disclaimer={disclaimer}
      />
    </>
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
 * Long-thread rest layout:
 * Root → Viewport (messages grow the page) + fixed composer sibling.
 * The document scrolls; the sidebar stays 100vh and the input stays on screen.
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
