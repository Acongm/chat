import type { DocDomain, DocModulesRegistry, IsolationFilter, ModuleEntry } from './types';

function normalizeList(values: string[] | undefined): Set<string> {
  return new Set((values ?? []).map((v) => v.trim().toLowerCase()).filter(Boolean));
}

function modulesOfDomain(domain: DocDomain) {
  return [
    ...(domain.categories ?? []).flatMap((category) => category.modules),
    ...(domain.nestedModules ?? []),
  ];
}

export function listAllDomainModuleFolders(
  registry: DocModulesRegistry,
): Array<{ domainId: string; folder: string }> {
  const result: Array<{ domainId: string; folder: string }> = [];
  for (const domain of registry.domains) {
    for (const mod of modulesOfDomain(domain)) {
      result.push({ domainId: domain.id, folder: mod.folder });
    }
  }
  return result;
}

export function getDomainIdForLegacyFolder(
  registry: DocModulesRegistry,
  folder: string,
): string | undefined {
  for (const domain of registry.domains) {
    if (modulesOfDomain(domain).some((m) => m.folder === folder)) {
      return domain.id;
    }
  }
  return undefined;
}

export function listCatalogModules(
  registry: DocModulesRegistry,
  isolation: IsolationFilter = {},
): ModuleEntry[] {
  const allowedDomains = normalizeList(isolation.allowedDomains);
  const allowedModules = normalizeList(isolation.allowedModules);
  const entries: ModuleEntry[] = [];

  for (const domain of registry.domains) {
    if (allowedDomains.size > 0 && !allowedDomains.has(domain.id.toLowerCase())) {
      continue;
    }
    for (const mod of modulesOfDomain(domain)) {
      if (
        allowedModules.size > 0 &&
        !allowedModules.has(mod.folder.toLowerCase())
      ) {
        continue;
      }
      entries.push({
        domainId: domain.id,
        domainTitle: domain.title,
        folder: mod.folder,
        title: mod.title,
        description: mod.description,
        accent: 'accent' in mod ? mod.accent : undefined,
      });
    }
  }

  return entries.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
}

export function findModuleEntry(
  registry: DocModulesRegistry,
  moduleKey: string,
  isolation: IsolationFilter = {},
): ModuleEntry | undefined {
  const key = moduleKey.trim().toLowerCase();
  return listCatalogModules(registry, isolation).find(
    (entry) => entry.folder.toLowerCase() === key,
  );
}

export function isModuleAllowed(
  registry: DocModulesRegistry,
  moduleKey: string,
  isolation: IsolationFilter = {},
): boolean {
  return Boolean(findModuleEntry(registry, moduleKey, isolation));
}

/** legacy pagePath → chat module folder + article slug parts */
export function moduleFolderFromLegacyPath(
  registry: DocModulesRegistry,
  pagePath: string,
): { folder: string; slugParts: string[] } {
  const segments = pagePath
    .replace(/^\//, '')
    .split('/')
    .filter(Boolean)
    .map((part) => part.replace(/\.mdx?$/i, ''))
    .filter((part) => !/^readme$/i.test(part) && !/^index$/i.test(part));

  if (!segments.length) return { folder: '', slugParts: [] };

  const knownFolders = new Set(
    listAllDomainModuleFolders(registry).map((entry) => entry.folder),
  );

  let folder = '';
  let folderIndex = -1;
  for (let i = 0; i < segments.length; i += 1) {
    if (knownFolders.has(segments[i])) {
      folder = segments[i];
      folderIndex = i;
    }
  }

  if (!folder) {
    return { folder: segments[0], slugParts: segments.slice(1) };
  }

  return {
    folder,
    slugParts: segments.slice(folderIndex + 1),
  };
}
