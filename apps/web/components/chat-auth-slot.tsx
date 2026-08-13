'use client';

import { useEffect, useRef } from 'react';
import { AuthAccountButton, useSession } from '@acongm/auth-client';

export type ChatAuthIdentity = {
  userId: string;
  accessToken: string;
  anonymous: boolean;
};

export type ChatAuthSlotProps = {
  onIdentityChange?: (identity: ChatAuthIdentity | null) => void;
  /** 退出登录后：清当前会话；useSession 会建立新的 Supabase anonymous identity。 */
  onSignedOut?: () => void;
};

/**
 * Chat v2 直接使用 Supabase session（包括 anonymous session）作为唯一身份。
 * 不再调用 legacy x-client-id -> claimAnonymousThreads 迁移路径。
 */
export function ChatAuthSlot({
  onIdentityChange,
  onSignedOut,
}: ChatAuthSlotProps) {
  const { session } = useSession({ ensureAnonymous: true });
  const onIdentityRef = useRef(onIdentityChange);
  onIdentityRef.current = onIdentityChange;

  useEffect(() => {
    if (!session?.access_token || !session.user.id) {
      onIdentityRef.current?.(null);
      return;
    }

    onIdentityRef.current?.({
      userId: session.user.id,
      accessToken: session.access_token,
      anonymous: Boolean(session.user.is_anonymous),
    });
  }, [session?.access_token, session?.user.id, session?.user.is_anonymous]);

  return (
    <AuthAccountButton
      variant="sidebar"
      ensureAnonymous
      onSignedOut={onSignedOut}
    />
  );
}
