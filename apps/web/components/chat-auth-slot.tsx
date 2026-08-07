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
 * 会话侧栏登录区：登录后先认领匿名 threads，再下发 accessToken 触发列表刷新，
 * 避免「带 token 的 list」抢跑在 claim 之前导致侧栏短暂为空。
 */
export function ChatAuthSlot({
  apiBase,
  onAccessTokenChange,
  onClaimed,
}: ChatAuthSlotProps) {
  const { session } = useSession();
  const readyFor = useRef<string | null>(null);

  useEffect(() => {
    if (!session?.access_token) {
      readyFor.current = null;
      onAccessTokenChange?.(null);
      return;
    }

    const token = session.access_token;
    if (readyFor.current === token) {
      onAccessTokenChange?.(token);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        await claimAnonymousThreads({
          apiBase,
          clientId: getClientId(),
          accessToken: token,
        });
      } catch {
        // 认领失败不阻断对话；仍下发 token 以便加载用户已有会话
      }
      if (cancelled) return;
      readyFor.current = token;
      onAccessTokenChange?.(token);
      onClaimed?.();
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.access_token, apiBase, onAccessTokenChange, onClaimed]);

  return <AuthAccountButton variant="sidebar" />;
}
