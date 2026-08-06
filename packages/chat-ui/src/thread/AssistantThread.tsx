'use client';

import { useEffect, useState } from 'react';
import {
  ActionBarPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAui,
  useMessagePartReasoning,
} from '@assistant-ui/react';
import { MarkdownTextPrimitive } from '@assistant-ui/react-markdown';
import remarkGfm from 'remark-gfm';
import { Brain, ChevronDown, Copy, Square, ArrowUp } from 'lucide-react';
import {
  CHAT_V1_TAGS,
  insertChatTag,
  type ChatTagKey,
} from '@acongm/agent-session-sdk';

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
  const aui = useAui();

  const applyTag = (key: ChatTagKey) => {
    const current = aui.composer().getState().text;
    aui.composer().setText(insertChatTag(current, key));
  };

  return (
    <ComposerPrimitive.Root className="acongm-aui-composer">
      <div className="acongm-aui-composer__topline">
        <div className="acongm-chat-quick-tags" aria-label="提问快捷选项">
          {CHAT_V1_TAGS.map((tag) => (
            <button key={tag.key} type="button" onClick={() => applyTag(tag.key)}>
              {tag.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="acongm-chat-clear"
          onClick={() => window.dispatchEvent(new Event('acongm-chat-clear'))}
        >
          清空
        </button>
      </div>
      <div className="acongm-aui-composer__box">
        <ComposerPrimitive.Input
          rows={2}
          placeholder="结合文档提问…"
          className="acongm-aui-composer__input"
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
            <p className="acongm-aui-empty__title">文档阅读助手</p>
            <p className="acongm-aui-empty__desc">
              打开后加载构建期摘要；发送问题才会调用 AI。
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
