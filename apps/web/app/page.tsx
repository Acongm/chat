import Link from 'next/link';
import { listCatalogModules } from '@/lib/module-catalog';
import { getIsolationLabel } from '@/lib/chat-context';
import { loadChatConfig } from '@/lib/chat-config';

export default function HomePage() {
  const modules = listCatalogModules();
  const config = loadChatConfig();

  const grouped = modules.reduce<Record<string, typeof modules>>((acc, mod) => {
    (acc[mod.domainTitle] ||= []).push(mod);
    return acc;
  }, {});

  return (
    <div className="chat-site-layout">
      <header className="chat-site-header">
        <div>
          <h1 style={{ margin: 0, fontSize: '1.1rem' }}>Acongm Chat</h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', opacity: 0.75 }}>
            选择模块开始对话 · {getIsolationLabel()}
          </p>
        </div>
        <a href={config.domains.portal}>返回文档站</a>
      </header>
      <main>
        {Object.entries(grouped).map(([domainTitle, items]) => (
          <section key={domainTitle} style={{ padding: '1rem 1.25rem 0' }}>
            <h2 style={{ fontSize: '0.95rem', opacity: 0.8 }}>{domainTitle}</h2>
            <div className="module-grid">
              {items.map((mod) => (
                <Link
                  key={`${mod.domainId}-${mod.folder}`}
                  href={`/c/${encodeURIComponent(mod.folder)}`}
                  className="module-card"
                  style={{ borderColor: mod.accent ? `${mod.accent}55` : undefined }}
                >
                  <strong>{mod.title}</strong>
                  {mod.description ? (
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', opacity: 0.75 }}>
                      {mod.description}
                    </p>
                  ) : null}
                </Link>
              ))}
            </div>
          </section>
        ))}
        {modules.length === 0 ? (
          <p style={{ padding: '2rem', opacity: 0.7 }}>
            当前白名单下没有可用模块。请检查 chat.config.yaml 的 allowedDomains / allowedModules。
          </p>
        ) : null}
      </main>
    </div>
  );
}
