'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import {
  AuthAccountButton,
  useSession,
  type AuthSessionStatus,
} from '@acongm/auth-client';

export type ChatAuthIdentity = {
  userId: string;
  accessToken: string;
  anonymous: boolean;
};

export type ChatAuthSlotProps = {
  onIdentityChange?: (identity: ChatAuthIdentity | null) => void;
  onStatusChange?: (status: AuthSessionStatus) => void;
  /** Called after signOut; useSession re-bootstraps anonymous identity. */
  onSignedOut?: () => void;
  menuFooter?: ReactNode;
};

/**
 * Chat v2 identity bridge: Supabase session (including anonymous) is the only
 * principal. No legacy x-client-id / claimAnonymousThreads path.
 */
export function ChatAuthSlot({
  onIdentityChange,
  onStatusChange,
  onSignedOut,
  menuFooter,
}: ChatAuthSlotProps) {
  const { status, error, retry, accessToken, userId, isAnonymous } =
    useSession({ ensureAnonymous: true });
  const onIdentityRef = useRef(onIdentityChange);
  const onStatusRef = useRef(onStatusChange);
  onIdentityRef.current = onIdentityChange;
  onStatusRef.current = onStatusChange;

  useEffect(() => {
    onStatusRef.current?.(status);
  }, [status]);

  useEffect(() => {
    if (!accessToken || !userId) {
      onIdentityRef.current?.(null);
      return;
    }

    onIdentityRef.current?.({
      userId,
      accessToken,
      anonymous: isAnonymous,
    });
  }, [accessToken, userId, isAnonymous]);

  if (status === 'error') {
    return (
      <div className="acongm-chat-auth-error">
        <p>{error || '无法准备访客会话'}</p>
        <button type="button" onClick={retry}>
          重试
        </button>
      </div>
    );
  }

  return (
    <AuthAccountButton
      variant="sidebar"
      ensureAnonymous
      menu
      menuFooter={menuFooter}
      onSignedOut={onSignedOut}
    />
  );
}
