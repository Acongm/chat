export type DocModuleRef = {
  folder: string;
  title: string;
  description?: string;
  icon?: string;
  accent?: string;
};

export type DocModuleCategory = {
  title: string;
  description?: string;
  modules: DocModuleRef[];
};

export type DocModuleDomain = {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  accent?: string;
  categories?: DocModuleCategory[];
  nestedModules?: DocModuleRef[];
  hidden?: boolean;
};

export type DocModulesRegistry = {
  domains: DocModuleDomain[];
};
