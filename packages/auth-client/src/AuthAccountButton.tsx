'use client';

import { useAuthActions, useSession } from './hooks';

export type AuthAccountButtonProps = {
  className?: string;
  /**
   * nav：顶栏文字；sidebar：侧栏；icon：仅图标；avatar：首字圆标（logo 位）
   */
  variant?: 'nav' | 'sidebar' | 'icon' | 'avatar';
};

function displayLabel(session: NonNullable<ReturnType<typeof useSession>['session']>) {
  return (
    session.user.user_metadata?.display_name ||
    session.user.user_metadata?.full_name ||
    session.user.user_metadata?.user_name ||
    session.user.user_metadata?.preferred_username ||
    session.user.email ||
    '已登录'
  );
}

function avatarChar(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return 'U';
  const local = trimmed.includes('@') ? trimmed.split('@')[0] : trimmed;
  return Array.from(local)[0]?.toUpperCase() || 'U';
}

export function AuthAccountButton({
  className,
  variant = 'nav',
}: AuthAccountButtonProps) {
  const { session, loading, configured } = useSession();
  const { login, logout } = useAuthActions();

  if (!configured) {
    if (variant === 'avatar') return null;
    if (variant === 'icon') {
      return (
        <a
          className={className ?? 'acongm-auth-icon-btn'}
          href="https://auth.acongm.com/login"
          title="登录"
          aria-label="登录"
        >
          登录
        </a>
      );
    }
    return (
      <a
        className={className ?? 'acongm-auth-btn'}
        href="https://auth.acongm.com/login"
        data-variant={variant}
      >
        登录
      </a>
    );
  }

  if (loading) {
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

  if (!session) {
    if (variant === 'avatar') return null;
    if (variant === 'icon') {
      return (
        <button
          type="button"
          className={className ?? 'acongm-auth-icon-btn'}
          title="登录"
          aria-label="登录"
          onClick={() => login()}
        >
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
        </button>
      );
    }
    return (
      <button
        type="button"
        className={className ?? 'acongm-auth-btn'}
        data-variant={variant}
        onClick={() => login()}
      >
        登录
      </button>
    );
  }

  const label = String(displayLabel(session));
  const mark = avatarChar(label);

  if (variant === 'avatar' || variant === 'icon') {
    return (
      <button
        type="button"
        className={className ?? 'acongm-auth-avatar'}
        title={`${label} · 点击退出`}
        aria-label={`${label}，点击退出登录`}
        onClick={() => {
          void logout();
        }}
      >
        {mark}
      </button>
    );
  }

  return (
    <div className="acongm-auth-user" data-variant={variant}>
      <span className="acongm-auth-avatar" aria-hidden>
        {mark}
      </span>
      <span className="acongm-auth-user__name" title={session.user.email ?? undefined}>
        {label}
      </span>
      <button
        type="button"
        className={className ?? 'acongm-auth-btn'}
        onClick={() => {
          void logout();
        }}
      >
        退出
      </button>
    </div>
  );
}
