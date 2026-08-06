import type {
  SummariesV1Snapshot,
  SummaryV1LookupResult,
} from '@acongm/kb-types';
import { formatSummaryMessage, normalizeSummaryData } from './summary-format';

let snapshotPromise: Promise<SummariesV1Snapshot> | null = null;

export function summaryPathVariants(pagePath: string): string[] {
  const normalized = pagePath.startsWith('/') ? pagePath : `/${pagePath}`;
  const variants = [normalized, normalized.replace(/^\//, '')];
  if (normalized.endsWith('/README.md')) {
    variants.push(normalized.replace(/\/README\.md$/, '/index.md'));
    variants.push(normalized.replace(/\/README\.md$/, '.md'));
  }
  if (normalized.endsWith('/index.md')) {
    variants.push(normalized.replace(/\/index\.md$/, '/README.md'));
    variants.push(normalized.replace(/\/index\.md$/, '.md'));
  }
  if (/^\/[^/]+\.md$/.test(normalized)) {
    const folder = normalized.slice(1, -3);
    variants.push(`/${folder}/README.md`, `/${folder}/index.md`);
  }
  return [...new Set(variants)];
}

export function findSummaryV1ByPath(
  snapshot: SummariesV1Snapshot | null | undefined,
  pagePath: string,
): SummaryV1LookupResult {
  const files = snapshot?.files || {};
  const entry = summaryPathVariants(pagePath)
    .map((path) => files[path] || files[path.replace(/^\//, '')])
    .find(Boolean);

  if (!entry) {
    return { status: 'missing', summary: null, reason: 'summary-not-built' };
  }
  return {
    status: entry.status || 'missing',
    summary:
      entry.status === 'success' && entry.summary
        ? normalizeSummaryData(entry.summary)
        : null,
    reason: entry.reason || entry.error || '',
  };
}

export async function loadSummaryV1Snapshot(
  url = '/summaries-v1.json',
  options: { signal?: AbortSignal } = {},
): Promise<SummariesV1Snapshot> {
  if (!snapshotPromise) {
    snapshotPromise = fetch(url, { signal: options.signal })
      .then((response) => {
        if (!response.ok) throw new Error('摘要快照加载失败');
        return response.json() as Promise<SummariesV1Snapshot>;
      })
      .catch((error) => {
        snapshotPromise = null;
        throw error;
      });
  }
  return snapshotPromise;
}

export async function loadSummaryV1(
  pagePath: string,
  options: { signal?: AbortSignal; url?: string } = {},
): Promise<SummaryV1LookupResult> {
  const snapshot = await loadSummaryV1Snapshot(options.url, options);
  return findSummaryV1ByPath(snapshot, pagePath);
}

export function summaryV1StatusText(
  result: SummaryV1LookupResult | null,
  options: { snapshotMissing?: boolean } = {},
): string {
  if (options.snapshotMissing) return '摘要快照未部署，请稍后刷新。';
  if (result?.status === 'short') return '本文较短，暂无独立 AI 摘要。';
  if (result?.status === 'excluded') {
    if (result.reason === 'section-index') {
      return '章节索引页，请打开具体文章查看摘要。';
    }
    return '本文未纳入 AI 摘要范围。';
  }
  if (result?.status === 'error') {
    return '本文摘要生成失败，将在后续构建自动重试。';
  }
  return '本文暂无构建期摘要。';
}

export function buildSummaryCardContent(
  result: SummaryV1LookupResult | null,
  options: { snapshotMissing?: boolean } = {},
): string {
  if (result?.summary) {
    return formatSummaryMessage(result.summary, '构建缓存 summaries-v1.json');
  }
  return summaryV1StatusText(result, options);
}

export function clearSummaryV1Snapshot(): void {
  snapshotPromise = null;
}
