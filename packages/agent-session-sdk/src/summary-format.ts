import type { SummaryV1Data } from '@acongm/kb-types';

const FALLBACK: SummaryV1Data = {
  summary: '暂无摘要',
  keyPoints: [],
  keywords: [],
  techStack: [],
  difficulty: '未分级',
  contentType: '综合',
};

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function coerce(parsed: Record<string, unknown>): SummaryV1Data {
  let summary =
    typeof parsed.summary === 'string' ? parsed.summary.trim() : '';
  if (summary.startsWith('{') || summary.startsWith('[')) {
    try {
      const nested = JSON.parse(summary) as Record<string, unknown>;
      if (typeof nested.summary === 'string') return coerce(nested);
    } catch {
      // keep
    }
  }
  if (!summary || summary.startsWith('{') || summary.includes('"summary"')) {
    return { ...FALLBACK };
  }
  return {
    summary,
    keyPoints: toStringArray(parsed.keyPoints),
    keywords: toStringArray(parsed.keywords),
    techStack: toStringArray(parsed.techStack),
    difficulty:
      typeof parsed.difficulty === 'string' && parsed.difficulty
        ? parsed.difficulty
        : '未分级',
    contentType:
      typeof parsed.contentType === 'string' && parsed.contentType
        ? parsed.contentType
        : '综合',
  };
}

export function normalizeSummaryData(input: unknown): SummaryV1Data {
  if (!input) return { ...FALLBACK };
  if (typeof input === 'string') {
    const plain = input.trim();
    if (!plain) return { ...FALLBACK };
    try {
      const parsed = JSON.parse(plain) as Record<string, unknown>;
      if (typeof parsed.summary === 'string') return coerce(parsed);
    } catch {
      // plain
    }
    if (plain.startsWith('{') || plain.includes('"summary"')) {
      return { ...FALLBACK };
    }
    return { ...FALLBACK, summary: plain };
  }
  if (typeof input === 'object') return coerce(input as Record<string, unknown>);
  return { ...FALLBACK };
}

export function formatSummaryMessage(
  data: SummaryV1Data | string,
  sourceLabel = '',
): string {
  if (typeof data === 'string') return `内容提炼\n\n${data}`;
  const lines = ['内容提炼'];
  if (sourceLabel) lines.push(`来源：${sourceLabel}`);
  lines.push('', data.summary || '暂无摘要');
  if (data.keyPoints?.length) {
    lines.push('', '核心要点');
    for (const point of data.keyPoints) lines.push(`• ${point}`);
  }
  const tags = [...(data.keywords ?? []), ...(data.techStack ?? [])];
  if (tags.length) {
    lines.push('', `关键词：${[...new Set(tags)].join('、')}`);
  }
  if (data.difficulty && data.difficulty !== '未分级') {
    lines.push(`难度：${data.difficulty}`);
  }
  if (data.contentType && data.contentType !== '综合') {
    lines.push(`类型：${data.contentType}`);
  }
  lines.push('', '—', '你可以继续提问，我会结合当前页面内容回答。');
  return lines.join('\n');
}
