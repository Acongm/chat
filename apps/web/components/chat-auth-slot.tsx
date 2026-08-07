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
  const { session } = useSession();
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
      .then(() => {
        // 无论认领条数，登录后都刷新列表（用户历史会话）
        onClaimed?.();
      })
      .catch(() => {
        // 认领失败仍刷新，避免侧栏停在匿名列表
        onClaimed?.();
      });
  }, [session?.access_token, apiBase, onClaimed]);

  return <AuthAccountButton variant="sidebar" />;
}
