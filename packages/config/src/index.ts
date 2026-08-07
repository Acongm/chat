import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";

export interface SiteDomains {
  portal: string;
  dochub: string;
  chat: string;
  auth: string;
  api: string;
}

export interface SiteGitConfig {
  owner: string;
  repo: string;
  contentDir: string;
  defaultBranch: string;
  publishBranch: string;
}

export interface SiteLimits {
  anon: { chatPerDay: number };
  user: { chatPerDay: number };
}

export interface SiteOAuthConfig {
  providers: string[];
  claimThreads: boolean;
}

export interface SiteConfig {
  domains: SiteDomains;
  git: SiteGitConfig;
  limits: SiteLimits;
  oauth: SiteOAuthConfig;
}

const DEFAULT_CONFIG: SiteConfig = {
  domains: {
    portal: "https://www.acongm.com",
    dochub: "https://dochub.acongm.com",
    chat: "https://chat.acongm.com",
    auth: "https://auth.acongm.com",
    api: "https://api.acongm.com",
  },
  git: {
    owner: "Acongm",
    repo: "portal",
    contentDir: "content/docs",
    defaultBranch: "master",
    publishBranch: "master",
  },
  limits: {
    anon: { chatPerDay: 20 },
    user: { chatPerDay: 200 },
  },
  oauth: {
    providers: ["github", "google"],
    claimThreads: true,
  },
};

function applyEnvOverrides(config: SiteConfig): SiteConfig {
  const next: SiteConfig = structuredClone(config);

  const domainKeys: Array<keyof SiteDomains> = [
    "portal",
    "dochub",
    "chat",
    "auth",
    "api",
  ];

  for (const key of domainKeys) {
    const envKey = `SITE_DOMAIN_${key.toUpperCase()}`;
    const value = process.env[envKey];
    if (value) {
      next.domains[key] = value;
    }
  }

  if (process.env.SITE_GIT_PUBLISH_BRANCH) {
    next.git.publishBranch = process.env.SITE_GIT_PUBLISH_BRANCH;
  }

  if (process.env.SITE_LIMIT_ANON_CHAT_PER_DAY) {
    next.limits.anon.chatPerDay = Number(process.env.SITE_LIMIT_ANON_CHAT_PER_DAY);
  }

  if (process.env.SITE_LIMIT_USER_CHAT_PER_DAY) {
    next.limits.user.chatPerDay = Number(process.env.SITE_LIMIT_USER_CHAT_PER_DAY);
  }

  return next;
}

let cachedConfig: SiteConfig | null = null;

export function loadSiteConfig(configPath?: string): SiteConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const path =
    configPath ??
    process.env.SITE_CONFIG_PATH ??
    resolve(process.cwd(), "../../site.config.yaml");

  try {
    const raw = readFileSync(path, "utf8");
    const parsed = parse(raw) as Partial<SiteConfig>;
    cachedConfig = applyEnvOverrides({
      ...DEFAULT_CONFIG,
      ...parsed,
      domains: { ...DEFAULT_CONFIG.domains, ...parsed.domains },
      git: { ...DEFAULT_CONFIG.git, ...parsed.git },
      limits: {
        anon: { ...DEFAULT_CONFIG.limits.anon, ...parsed.limits?.anon },
        user: { ...DEFAULT_CONFIG.limits.user, ...parsed.limits?.user },
      },
      oauth: { ...DEFAULT_CONFIG.oauth, ...parsed.oauth },
    });
  } catch {
    cachedConfig = applyEnvOverrides(DEFAULT_CONFIG);
  }

  return cachedConfig;
}

export function getApiBase(config?: SiteConfig): string {
  return (config ?? loadSiteConfig()).domains.api;
}

export function getAuthBase(config?: SiteConfig): string {
  return (config ?? loadSiteConfig()).domains.auth;
}

export function getPublishBranch(config?: SiteConfig): string {
  return (config ?? loadSiteConfig()).git.publishBranch;
}

export function getOAuthLoginUrl(options?: {
  returnTo?: string;
  config?: SiteConfig;
}): string {
  const authBase = getAuthBase(options?.config);
  const url = new URL("/login", authBase);

  if (options?.returnTo) {
    url.searchParams.set("return_to", options.returnTo);
  }

  return url.toString();
}

export function resetSiteConfigCache(): void {
  cachedConfig = null;
}
