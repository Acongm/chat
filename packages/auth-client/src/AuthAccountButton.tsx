'use client';

import { isAnonymousSession } from './client';
import { AuthAccountMenu } from './AuthAccountMenu';
import { useAuthActions, useUserInfo } from './hooks';
import type { ReactNode } from 'react';
import type { UserInfoView } from './profile';

export type AuthAccountButtonProps = {
  className?: string;
  /**
   * nav：顶栏文字+图标；sidebar：侧栏；icon：仅图标；avatar：首字/头像圆标（logo 位）
   */
  variant?: 'nav' | 'sidebar' | 'icon' | 'avatar';
  /** 退出登录后的本地清理（如清除会话草稿），在 signOut 之后调用 */
  onSignedOut?: () => void;
  /** Override User API base (defaults to same-origin /api/user) */
  userApiBaseUrl?: string;
  /** Chat/Portal embedded surfaces: bootstrap Supabase anonymous session. */
  ensureAnonymous?: boolean;
  /** Dropdown with account / settings / logout (Phase 2 user menu). */
  menu?: boolean;
  /** Rendered below menu actions (e.g. local theme toggle). */
  menuFooter?: ReactNode;
};

type AuthSession = NonNullable<ReturnType<typeof useUserInfo>['session']>;

function sessionFallbackLabel(session: AuthSession) {
  return (
    session.user.user_metadata?.display_name ||
    session.user.user_metadata?.full_name ||
    session.user.user_metadata?.name ||
    session.user.user_metadata?.user_name ||
    session.user.user_metadata?.preferred_username ||
    session.user.email ||
    '已登录'
  );
}

function sessionFallbackAvatar(session: AuthSession): string | null {
  const meta = session.user.user_metadata ?? {};
  const raw =
    meta.avatar_url || meta.picture || meta.avatar || meta.profile_image;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

function resolveDisplay(session: AuthSession, userInfo: UserInfoView | null) {
  const sessionAnonymous = isAnonymousSession(session);
  if (userInfo) {
    return {
      label: userInfo.displayName,
      photo: userInfo.avatarUrl,
      email: userInfo.email,
      isAnonymous: userInfo.isAnonymous && sessionAnonymous,
    };
  }
  const email =
    typeof session.user.email === 'string' && session.user.email.trim()
      ? session.user.email.trim()
      : null;
  return {
    label: String(sessionFallbackLabel(session)),
    photo: sessionFallbackAvatar(session),
    email,
    isAnonymous: isAnonymousSession(session),
  };
}

function LoginIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" x2="3" y1="12" y2="12" />
    </svg>
  );
}

function LoginControl({
  className,
  variant,
  onLogin,
}: {
  className?: string;
  variant: NonNullable<AuthAccountButtonProps['variant']>;
  onLogin: () => void;
}) {
  if (variant === 'avatar') return null;
  if (variant === 'icon') {
    return (
      <button
        type="button"
        className={className ?? 'acongm-auth-icon-btn'}
        title="登录"
        aria-label="登录"
        onClick={onLogin}
      >
        <LoginIcon />
      </button>
    );
  }
  return (
    <button
      type="button"
      className={className ?? 'acongm-auth-btn'}
      data-variant={variant}
      onClick={onLogin}
    >
      <LoginIcon />
      <span>登录</span>
    </button>
  );
}

export function AuthAccountButton({
  className,
  variant = 'nav',
  onSignedOut,
  userApiBaseUrl,
  ensureAnonymous,
  menuFooter,
}: AuthAccountButtonProps) {
  const {
    session,
    client,
    userInfo,
    loading,
    configured,
  } = useUserInfo({
    baseUrl: userApiBaseUrl,
    ensureAnonymous,
  });
  const { login, logout } = useAuthActions({ client, session });

  const handleLogout = () => {
    void (async () => {
      await logout();
      onSignedOut?.();
    })();
  };

  if (configured && loading && !session) {
    if (variant === 'avatar' || variant === 'icon') {
      return (
        <span
          className={className ?? 'acongm-auth-icon-btn is-loading'}
          data-variant={variant}
          aria-hidden
        >
          …
        </span>
      );
    }
    return (
      <span className={className ?? 'acongm-auth-btn is-loading'} data-variant={variant}>
        …
      </span>
    );
  }

  if (userInfo && !userInfo.isAnonymous) {
    return (
      <AuthAccountMenu
        label={userInfo.displayName}
        photo={userInfo.avatarUrl}
        email={userInfo.email}
        variant={variant}
        className={className}
        onLogout={handleLogout}
        menuFooter={menuFooter}
      />
    );
  }

  // 未配置 Supabase 时仍可跳转 SSO（login 带 return_to）
  if (!configured || !session) {
    return (
      <LoginControl
        className={className}
        variant={variant}
        onLogin={() => login()}
      />
    );
  }

  const display = resolveDisplay(session, userInfo);
  // Anonymous Supabase identities stay visually guest / login CTA.
  if (display.isAnonymous) {
    return (
      <LoginControl
        className={className}
        variant={variant}
        onLogin={() => login()}
      />
    );
  }

  const label = display.label;
  const photo = display.photo;
  const email = display.email;
  return (
    <AuthAccountMenu
      label={label}
      photo={photo}
      email={email}
      variant={variant}
      className={className}
      onLogout={handleLogout}
      menuFooter={menuFooter}
    />
  );
}
