import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';

export type ChatIsolationConfig = {
  enforceModuleBoundary: boolean;
  defaultScope: 'article' | 'module';
  allowedDomains: string[];
  allowedModules: string[];
};

export type ChatSiteConfig = {
  domains: {
    chat: string;
    portal: string;
    api: string;
  };
  kb: {
    summariesUrl: string;
    modulesCatalogPath: string;
  };
  isolation: ChatIsolationConfig;
  chat: {
    enableThinking: boolean;
    historyMode: 'short' | 'long';
    callSourcePrefix: string;
  };
};

const DEFAULT_CONFIG: ChatSiteConfig = {
  domains: {
    chat: 'https://chat.acongm.com',
    portal: 'https://www.acongm.com',
    api: 'https://api.acongm.com',
  },
  kb: {
    summariesUrl: 'https://www.acongm.com/summaries-v1.json',
    modulesCatalogPath: 'config/doc-modules.json',
  },
  isolation: {
    enforceModuleBoundary: true,
    defaultScope: 'article',
    allowedDomains: [],
    allowedModules: [],
  },
  chat: {
    enableThinking: true,
    historyMode: 'long',
    callSourcePrefix: 'chat-site',
  },
};

let cached: ChatSiteConfig | null = null;

export function loadChatConfig(): ChatSiteConfig {
  if (cached) return cached;

  const configPath = resolve(process.cwd(), '../../chat.config.yaml');
  try {
    const raw = parse(readFileSync(configPath, 'utf8')) as Partial<ChatSiteConfig>;
    cached = {
      ...DEFAULT_CONFIG,
      ...raw,
      domains: { ...DEFAULT_CONFIG.domains, ...raw.domains },
      kb: { ...DEFAULT_CONFIG.kb, ...raw.kb },
      isolation: { ...DEFAULT_CONFIG.isolation, ...raw.isolation },
      chat: { ...DEFAULT_CONFIG.chat, ...raw.chat },
    };
  } catch {
    cached = DEFAULT_CONFIG;
  }

  if (process.env.NEXT_PUBLIC_SUMMARIES_URL?.trim()) {
    cached.kb.summariesUrl = process.env.NEXT_PUBLIC_SUMMARIES_URL.trim();
  }

  return cached;
}

export function getSummariesUrl(): string {
  return loadChatConfig().kb.summariesUrl;
}
