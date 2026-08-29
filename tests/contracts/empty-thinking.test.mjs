import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assistantStreamParts } from '../../packages/chat-ui/src/runtime/assistant-stream-parts.ts';
import { parseSseStream } from '../../packages/agent-session-sdk/src/parse-sse-stream.ts';

const thread = readFileSync(
  'packages/chat-ui/src/thread/AssistantThread.tsx',
  'utf8',
);
const adapter = readFileSync(
  'packages/chat-ui/src/runtime/createDocChatModelAdapter.ts',
  'utf8',
);

function streamFrom(text) {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
}

async function collectSse(text) {
  const events = [];
  for await (const event of parseSseStream(streamFrom(text))) {
    events.push(event);
  }
  return events;
}

test('completed stream without thinking only yields the answer text', () => {
  assert.deepEqual(
    assistantStreamParts('', 'fmt 是标准库格式化包', {
      enableThinking: true,
      streaming: false,
    }),
    [{ type: 'text', text: 'fmt 是标准库格式化包' }],
  );
});

test('streaming with no tokens yet keeps an empty reasoning placeholder', () => {
  assert.deepEqual(
    assistantStreamParts('', '', {
      enableThinking: true,
      streaming: true,
    }),
    [{ type: 'reasoning', text: '' }],
  );
});

test('streaming answer without thinking drops the empty reasoning part', () => {
  assert.deepEqual(
    assistantStreamParts('', 'answer', {
      enableThinking: true,
      streaming: true,
    }),
    [{ type: 'text', text: 'answer' }],
  );
});

test('thinking plus text keeps both parts after the stream completes', () => {
  assert.deepEqual(
    assistantStreamParts('先看文档', 'fmt 打印', {
      enableThinking: true,
      streaming: false,
    }),
    [
      { type: 'reasoning', text: '先看文档' },
      { type: 'text', text: 'fmt 打印' },
    ],
  );
});

test('parseSseStream yields a trailing frame that has no blank-line terminator', async () => {
  const events = await collectSse(
    'data: {"type":"delta","content":"fmt 是格式化包"}\n',
  );
  assert.deepEqual(events, [{ type: 'delta', content: 'fmt 是格式化包' }]);
});

test('parseSseStream still splits blank-line terminated frames', async () => {
  const events = await collectSse(
    'data: {"type":"thinking","content":"step"}\n\ndata: {"type":"delta","content":"fmt"}\n\n',
  );
  assert.deepEqual(events, [
    { type: 'thinking', content: 'step' },
    { type: 'delta', content: 'fmt' },
  ]);
});

test('empty-think UI does not invent a reasoning error as the answer', () => {
  assert.doesNotMatch(thread, /模型未返回推理内容/);
  assert.doesNotMatch(thread, /ReasoningFallback/);
  assert.match(thread, /if \(!text && !running\) return null/);
  assert.match(adapter, /assistantStreamParts/);
  assert.match(adapter, /yield yieldParts\(thinking, text, enableThinking, false\)/);
});
