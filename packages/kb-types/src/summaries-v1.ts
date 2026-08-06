/**
 * summaries-v1.json 快照类型 — 构建期 AI 摘要缓存契约
 */

export type SummaryV1Data = {
  summary: string;
  keyPoints: string[];
  keywords: string[];
  techStack: string[];
  difficulty: string;
  contentType: string;
};

export type SummaryV1FileStatus =
  | 'success'
  | 'short'
  | 'excluded'
  | 'error'
  | 'missing'
  | string;

export type SummaryV1FileEntry = {
  sourceHash?: string;
  analysisHash?: string;
  status?: SummaryV1FileStatus;
  summary?: SummaryV1Data | string | Record<string, unknown>;
  reason?: string;
  error?: string;
  processedAt?: string;
};

export type SummaryV1AnalysisMeta = {
  model?: string;
  promptVersion?: string;
  extractVersion?: string;
};

export type SummariesV1Snapshot = {
  version: number;
  generatedAt?: string;
  analysis?: SummaryV1AnalysisMeta;
  files: Record<string, SummaryV1FileEntry>;
  stats?: Record<string, unknown>;
};

export type SummaryV1LookupResult = {
  status: SummaryV1FileStatus;
  summary: SummaryV1Data | null;
  reason: string;
};

export type ModuleIndexFile = {
  path: string;
  title: string;
  summary?: string;
  keywords?: string[];
};

export type ModuleIndexEntry = {
  sidebarKey?: string;
  description?: string;
  files?: ModuleIndexFile[];
};

export type ModuleIndexSnapshot = {
  _meta?: {
    generatedAt?: string;
    moduleCount?: number;
  };
  modules?: Record<string, ModuleIndexEntry>;
};

export type ModuleInfo = {
  key: string;
  sidebarKey: string;
  description: string;
};
