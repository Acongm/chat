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
  /** 退出登录后：清草稿、回访客模式 */
  onSignedOut?: () => void;
};

/**
 * 会话侧栏登录区：登录后先认领匿名 threads，再下发 accessToken。
 * 列表刷新由 accessToken 变更触发（useChatThreads），避免在 setState 提交前
 * 用旧的 null token 刷新，导致历史被覆盖、发消息 Forbidden。
 */
export function ChatAuthSlot({
  apiBase,
  onAccessTokenChange,
  onSignedOut,
}: ChatAuthSlotProps) {
  const { session } = useSession();
  const readyFor = useRef<string | null>(null);
  const onTokenRef = useRef(onAccessTokenChange);
  onTokenRef.current = onAccessTokenChange;

  useEffect(() => {
    if (!session?.access_token) {
      readyFor.current = null;
      onTokenRef.current?.(null);
      return;
    }

    const token = session.access_token;
    if (readyFor.current === token) {
      onTokenRef.current?.(token);
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
        // 认领失败不阻断：仍下发 token，用户可看到已有账号会话 / 新建对话
      }
      if (cancelled) return;
      readyFor.current = token;
      // 仅下发 token；refresh 等 React 提交 accessToken 后再跑，避免竞态
      onTokenRef.current?.(token);
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.access_token, apiBase]);

  return (
    <AuthAccountButton variant="sidebar" onSignedOut={onSignedOut} />
  );
}
