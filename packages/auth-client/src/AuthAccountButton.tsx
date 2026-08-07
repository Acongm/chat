'use client';

import { useAuthActions, useSession } from './hooks';

export type AuthAccountButtonProps = {
  className?: string;
  /**
   * nav：顶栏文字+图标；sidebar：侧栏；icon：仅图标；avatar：首字圆标（logo 位）
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
}: AuthAccountButtonProps) {
  const { session, loading, configured } = useSession();
  const { login, logout } = useAuthActions();

  if (configured && loading) {
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

  const label = String(displayLabel(session));
  const mark = avatarChar(label);

  if (variant === 'avatar') {
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

  if (variant === 'icon') {
    return (
      <button
        type="button"
        className={className ?? 'acongm-auth-icon-btn'}
        title={`${label} · 点击退出`}
        aria-label={`${label}，点击退出登录`}
        onClick={() => {
          void logout();
        }}
      >
        <span className="acongm-auth-icon-btn__mark" aria-hidden>
          {mark}
        </span>
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
