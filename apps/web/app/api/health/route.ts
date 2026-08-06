import { NextRequest, NextResponse } from 'next/server';
import { loadChatConfig } from '@/lib/chat-config';
import { getIsolationLabel } from '@/lib/chat-context';
import { listCatalogModules } from '@/lib/module-catalog';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  const config = loadChatConfig();
  return NextResponse.json({
    ok: true,
    service: 'chat',
    isolation: config.isolation,
    isolationLabel: getIsolationLabel(),
    moduleCount: listCatalogModules().length,
    summariesUrl: config.kb.summariesUrl,
    domains: config.domains,
  });
}
