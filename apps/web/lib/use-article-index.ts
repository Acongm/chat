'use client';

import { useEffect, useState } from 'react';
import {
  buildArticleIndex,
  type ArticleIndexEntry,
} from '@acongm/kb-catalog';
import { loadSummaryV1Snapshot } from '@acongm/agent-session-sdk';

export function useArticleIndex(summariesUrl: string) {
  const [articles, setArticles] = useState<ArticleIndexEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void loadSummaryV1Snapshot(summariesUrl)
      .then((snapshot) => {
        if (cancelled) return;
        setArticles(buildArticleIndex(snapshot.files ?? {}));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : '加载文章索引失败');
        setArticles([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [summariesUrl]);

  return { articles, loading, error };
}
