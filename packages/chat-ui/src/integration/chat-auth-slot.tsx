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

export type EnsureGuestAuth = () => Promise<ChatAuthIdentity | null>;

export type ChatAuthSlotProps = {
  onIdentityChange?: (identity: ChatAuthIdentity | null) => void;
  onStatusChange?: (status: AuthSessionStatus) => void;
  /** Called after signOut. Guest auth is created later on first send. */
  onSignedOut?: () => void;
  /** GA-style: create the anonymous auth user only when a real action needs it. */
  onEnsureGuestAuth?: (ensure: EnsureGuestAuth) => void;
  menuFooter?: ReactNode;
};

/**
 * Chat v2 identity bridge: Supabase session is the principal when it exists.
 * Browsing only keeps a Client ID cookie; first send calls ensureGuestAuth().
 */
export function ChatAuthSlot({
  onIdentityChange,
  onStatusChange,
  onSignedOut,
  onEnsureGuestAuth,
  menuFooter,
}: ChatAuthSlotProps) {
  const { status, error, retry, accessToken, userId, isAnonymous, ensureGuestAuth } =
    useSession();
  const onIdentityRef = useRef(onIdentityChange);
  const onStatusRef = useRef(onStatusChange);
  const onEnsureRef = useRef(onEnsureGuestAuth);
  onIdentityRef.current = onIdentityChange;
  onStatusRef.current = onStatusChange;
  onEnsureRef.current = onEnsureGuestAuth;

  useEffect(() => {
    onStatusRef.current?.(status);
  }, [status]);

  useEffect(() => {
    onEnsureRef.current?.(async () => {
      const session = await ensureGuestAuth();
      if (!session?.user?.id || !session.access_token) return null;
      const identity: ChatAuthIdentity = {
        userId: session.user.id,
        accessToken: session.access_token,
        anonymous: Boolean(session.user.is_anonymous),
      };
      onIdentityRef.current?.(identity);
      return identity;
    });
  }, [ensureGuestAuth]);

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
      menu
      menuFooter={menuFooter}
      onSignedOut={onSignedOut}
    />
  );
}
