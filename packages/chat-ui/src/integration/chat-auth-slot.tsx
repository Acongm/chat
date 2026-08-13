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
  /** Called after signOut; useSession re-bootstraps anonymous identity. */
  onSignedOut?: () => void;
};

/**
 * Chat v2 identity bridge: Supabase session (including anonymous) is the only
 * principal. No legacy x-client-id / claimAnonymousThreads path.
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
