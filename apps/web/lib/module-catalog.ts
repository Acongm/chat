import catalogJson from '@/config/doc-modules.json';
import type { DocModulesRegistry } from '@/config/doc-modules.types';
import { loadChatConfig } from './chat-config';

const catalog = catalogJson as DocModulesRegistry;

export type ModuleEntry = {
  domainId: string;
  domainTitle: string;
  folder: string;
  title: string;
  description?: string;
  accent?: string;
};

function normalizeList(values: string[]): Set<string> {
  return new Set(values.map((v) => v.trim().toLowerCase()).filter(Boolean));
}

export function listCatalogModules(): ModuleEntry[] {
  const config = loadChatConfig();
  const allowedDomains = normalizeList(config.isolation.allowedDomains);
  const allowedModules = normalizeList(config.isolation.allowedModules);

  const entries: ModuleEntry[] = [];

  for (const domain of catalog.domains) {
    if (allowedDomains.size > 0 && !allowedDomains.has(domain.id.toLowerCase())) {
      continue;
    }

    const modules = [
      ...(domain.categories ?? []).flatMap((category) => category.modules),
      ...(domain.nestedModules ?? []),
    ];

    for (const mod of modules) {
      const folder = mod.folder;
      if (
        allowedModules.size > 0 &&
        !allowedModules.has(folder.toLowerCase())
      ) {
        continue;
      }
      entries.push({
        domainId: domain.id,
        domainTitle: domain.title,
        folder,
        title: mod.title,
        description: mod.description,
        accent: mod.accent,
      });
    }
  }

  return entries.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
}

export function findModuleEntry(moduleKey: string): ModuleEntry | undefined {
  const key = moduleKey.trim().toLowerCase();
  return listCatalogModules().find((entry) => entry.folder.toLowerCase() === key);
}

export function isModuleAllowed(moduleKey: string): boolean {
  return Boolean(findModuleEntry(moduleKey));
}
