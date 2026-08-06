export type DocModuleEntry = {
  folder: string;
  title: string;
  description?: string;
  icon?: string;
  accent?: string;
};

export type DocModuleCategory = {
  title: string;
  description?: string;
  modules: DocModuleEntry[];
};

export type NestedDocModule = {
  folder: string;
  title: string;
  description?: string;
  parent: string;
};

export type DocDomain = {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  accent?: string;
  /** 隐藏入口：不出现在导航 / 首页 / 侧栏领域 Tab */
  hidden?: boolean;
  categories: DocModuleCategory[];
  nestedModules?: NestedDocModule[];
};

export type DocModulesRegistry = {
  domains: DocDomain[];
};

export type IsolationFilter = {
  allowedDomains?: string[];
  allowedModules?: string[];
};

export type ModuleEntry = {
  domainId: string;
  domainTitle: string;
  folder: string;
  title: string;
  description?: string;
  accent?: string;
};

export type KnowledgeLevel = 'domain' | 'module' | 'article';

export type KnowledgeRef = {
  id: string;
  level: KnowledgeLevel;
  domainId?: string;
  moduleKey?: string;
  pagePath?: string;
  title: string;
  scope?: 'module' | 'article';
};
