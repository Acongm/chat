export type {
  DocModuleEntry,
  DocModuleCategory,
  NestedDocModule,
  DocDomain,
  DocModulesRegistry,
  IsolationFilter,
  ModuleEntry,
  KnowledgeLevel,
  KnowledgeRef,
} from './types';

export {
  listAllDomainModuleFolders,
  getDomainIdForLegacyFolder,
  listCatalogModules,
  findModuleEntry,
  isModuleAllowed,
  moduleFolderFromLegacyPath,
} from './catalog';

export {
  knowledgeId,
  createModuleRef,
  createArticleRef,
  createDomainRef,
  resolveKnowledgeFromUrl,
  knowledgeRefFromPagePath,
} from './knowledge-ref';

export {
  buildChatSiteUrl,
  legacyChatPathToQuery,
} from './url';

export { GENERAL_CONTEXT, resolveChatV1Context } from './resolve-context';
