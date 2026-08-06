import type { ModuleEntry } from './module-catalog';

export function portalDocUrl(
  entry: ModuleEntry,
  pagePath: string | undefined,
  portalBase: string,
): string {
  const base = portalBase.replace(/\/$/, '');
  if (!pagePath) {
    return `${base}/docs/${entry.domainId}/${entry.folder}`;
  }
  const slug = pagePath
    .replace(/^\//, '')
    .replace(/\.mdx?$/, '')
    .split('/')
    .slice(1)
    .join('/');
  return `${base}/docs/${entry.domainId}/${entry.folder}/${slug}`;
}
