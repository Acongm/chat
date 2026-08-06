import catalogJson from '@/config/doc-modules.json';
import {
  findModuleEntry as catalogFind,
  isModuleAllowed as catalogAllowed,
  listCatalogModules as catalogList,
  type DocModulesRegistry,
  type ModuleEntry,
} from '@acongm/kb-catalog';
import { loadChatConfig } from './chat-config';

export type { ModuleEntry };

const catalog = catalogJson as DocModulesRegistry;

function isolation() {
  const config = loadChatConfig();
  return {
    allowedDomains: config.isolation.allowedDomains,
    allowedModules: config.isolation.allowedModules,
  };
}

export function listCatalogModules(): ModuleEntry[] {
  return catalogList(catalog, isolation());
}

export function findModuleEntry(moduleKey: string): ModuleEntry | undefined {
  return catalogFind(catalog, moduleKey, isolation());
}

export function isModuleAllowed(moduleKey: string): boolean {
  return catalogAllowed(catalog, moduleKey, isolation());
}

export function getDocModulesRegistry(): DocModulesRegistry {
  return catalog;
}
