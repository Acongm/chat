'use client';

import { useMemo, useState } from 'react';
import type { KnowledgeRef, ModuleEntry } from '@acongm/kb-catalog';
import type { ArticleIndexEntry } from '@acongm/kb-catalog';
import { listArticlesForModule } from '@acongm/kb-catalog';

export type KnowledgePanelProps = {
  modules: ModuleEntry[];
  articles: ArticleIndexEntry[];
  chips: KnowledgeRef[];
  onToggle: (ref: KnowledgeRef) => void;
  loadingArticles?: boolean;
};

function isActive(chips: KnowledgeRef[], id: string): boolean {
  return chips.some((c) => c.id === id);
}

export function KnowledgePanel({
  modules,
  articles,
  chips,
  onToggle,
  loadingArticles,
}: KnowledgePanelProps) {
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});
  const grouped = useMemo(() => {
    const map = new Map<string, ModuleEntry[]>();
    for (const mod of modules) {
      const list = map.get(mod.domainTitle) ?? [];
      list.push(mod);
      map.set(mod.domainTitle, list);
    }
    return [...map.entries()];
  }, [modules]);

  return (
    <div className="acongm-kb-panel workspace-panel">
      <div className="workspace-panel__head">
        <strong>知识目录</strong>
      </div>
      {loadingArticles ? (
        <p className="workspace-panel__hint">加载文章索引…</p>
      ) : null}
      <div className="acongm-kb-tree">
        {grouped.map(([domainTitle, items]) => (
          <section key={domainTitle} className="acongm-kb-domain">
            <h3 className="acongm-kb-domain__title">{domainTitle}</h3>
            <ul>
              {items.map((mod) => {
                const moduleId = `module:${mod.folder}`;
                const expanded = Boolean(openModules[mod.folder]);
                const moduleArticles = listArticlesForModule(articles, mod.folder);
                return (
                  <li key={`${mod.domainId}-${mod.folder}`} className="acongm-kb-module">
                    <div className="acongm-kb-module__row">
                      <button
                        type="button"
                        className="acongm-kb-module__expand"
                        aria-expanded={expanded}
                        onClick={() =>
                          setOpenModules((prev) => ({
                            ...prev,
                            [mod.folder]: !prev[mod.folder],
                          }))
                        }
                      >
                        {expanded ? '▾' : '▸'}
                      </button>
                      <button
                        type="button"
                        className={`acongm-kb-module__pick${isActive(chips, moduleId) ? ' is-active' : ''}`}
                        onClick={() =>
                          onToggle({
                            id: moduleId,
                            level: 'module',
                            moduleKey: mod.folder,
                            domainId: mod.domainId,
                            title: mod.title,
                            scope: 'module',
                          })
                        }
                      >
                        <span>{mod.title}</span>
                        <small>{moduleArticles.length} 篇</small>
                      </button>
                    </div>
                    {expanded ? (
                      <ul className="acongm-kb-articles">
                        {moduleArticles.length === 0 ? (
                          <li className="acongm-kb-articles__empty">暂无文章索引</li>
                        ) : (
                          moduleArticles.map((article) => {
                            const id = `article:${article.pagePath}`;
                            return (
                              <li key={article.pagePath}>
                                <button
                                  type="button"
                                  className={`acongm-kb-article${isActive(chips, id) ? ' is-active' : ''}`}
                                  onClick={() =>
                                    onToggle({
                                      id,
                                      level: 'article',
                                      moduleKey: article.moduleKey,
                                      pagePath: article.pagePath,
                                      title: article.title,
                                      domainId: mod.domainId,
                                      scope: 'article',
                                    })
                                  }
                                >
                                  {article.title}
                                </button>
                              </li>
                            );
                          })
                        )}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
