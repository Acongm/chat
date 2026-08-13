'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { AuthAccountButton, useSession } from '@acongm/auth-client';

export type ChatAuthIdentity = {
  userId: string;
  accessToken: string;
  anonymous: boolean;
};

export type ChatAuthSlotProps = {
  onIdentityChange?: (identity: ChatAuthIdentity | null) => void;
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
  onSignedOut,
  menuFooter,
}: ChatAuthSlotProps) {
  const { session, status, error, retry } = useSession({ ensureAnonymous: true });
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
