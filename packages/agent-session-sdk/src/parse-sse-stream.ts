function parseSseFrame<TEvent>(frame: string): TEvent | null {
  const data = frame
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n');
  if (!data) return null;
  try {
    return JSON.parse(data) as TEvent;
  } catch {
    return null;
  }
}

function consumeSseBuffer<TEvent>(
  buffer: string,
  flush: boolean,
): { events: TEvent[]; rest: string } {
  const pieces = buffer.split(/\r?\n\r?\n/);
  const complete = flush ? pieces : pieces.slice(0, -1);
  const rest = flush ? '' : (pieces[pieces.length - 1] ?? '');
  const events: TEvent[] = [];
  for (const frame of complete) {
    const event = parseSseFrame<TEvent>(frame);
    if (event) events.push(event);
  }
  return { events, rest };
}

export async function* parseSseStream<TEvent>(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<TEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const { events, rest } = consumeSseBuffer<TEvent>(buffer, done);
    buffer = rest;
    for (const event of events) yield event;
    if (done) break;
  }
}
