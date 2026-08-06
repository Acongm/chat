'use client';

import { useEffect, useRef } from 'react';
import {
  AuthAccountButton,
  claimAnonymousThreads,
  useSession,
} from '@acongm/auth-client';
import { getClientId } from '@acongm/agent-session-sdk';

export type ChatAuthSlotProps = {
  apiBase: string;
  onAccessTokenChange?: (token: string | null) => void;
  onClaimed?: () => void;
};

/**
 * 会话侧栏登录区：展示账号 + 登录后认领匿名 threads。
 */
export function ChatAuthSlot({
  apiBase,
  onAccessTokenChange,
  onClaimed,
}: ChatAuthSlotProps) {
  const { session, loading, configured } = useSession();
  const claimedFor = useRef<string | null>(null);

  useEffect(() => {
    onAccessTokenChange?.(session?.access_token ?? null);
  }, [session?.access_token, onAccessTokenChange]);

  useEffect(() => {
    if (!session?.access_token) {
      claimedFor.current = null;
      return;
    }
    if (claimedFor.current === session.access_token) return;
    claimedFor.current = session.access_token;

    void claimAnonymousThreads({
      apiBase,
      clientId: getClientId(),
      accessToken: session.access_token,
    })
      .then((result) => {
        if ((result.claimedThreads ?? result.claimed) > 0) {
          onClaimed?.();
        }
      })
      .catch(() => {
        // 认领失败不阻断对话
      });
  }, [session?.access_token, apiBase, onClaimed]);

  if (!configured && !loading) {
    return (
      <p className="workspace-panel__hint">
        未配置 Supabase 环境变量，登录不可用。
      </p>
    );
  }

  return <AuthAccountButton variant="sidebar" />;
}
