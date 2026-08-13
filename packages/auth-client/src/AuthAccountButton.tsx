'use client';

import { isAnonymousUser } from './client';
import { useAuthActions, useUserInfo } from './hooks';
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
  if (userInfo) {
    return {
      label: userInfo.displayName,
      photo: userInfo.avatarUrl,
      email: userInfo.email,
      isAnonymous: userInfo.isAnonymous,
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
    isAnonymous: isAnonymousUser(session.user),
  };
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

function UserAvatar({
  label,
  src,
  className,
}: {
  label: string;
  src: string | null;
  className?: string;
}) {
  const mark = avatarChar(label);
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- 第三方 OAuth 头像 URL
      <img
        className={className ?? 'acongm-auth-avatar'}
        src={src}
        alt=""
        width={28}
        height={28}
        referrerPolicy="no-referrer"
        decoding="async"
      />
    );
  }
  return (
    <span className={className ?? 'acongm-auth-avatar'} aria-hidden>
      {mark}
    </span>
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
}: AuthAccountButtonProps) {
  const { session, client, userInfo, loading, configured } = useUserInfo({
    baseUrl: userApiBaseUrl,
  });
  const { login, logout } = useAuthActions({ client });

  const handleLogout = () => {
    void (async () => {
      await logout();
      onSignedOut?.();
    })();
  };

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
  const title = email && email !== label ? `${label} · ${email}` : label;

  if (variant === 'avatar') {
    return (
      <button
        type="button"
        className={className ?? 'acongm-auth-avatar'}
        title={`${title} · 点击退出`}
        aria-label={`${title}，点击退出登录`}
        onClick={handleLogout}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt=""
            width={28}
            height={28}
            referrerPolicy="no-referrer"
            decoding="async"
          />
        ) : (
          avatarChar(label)
        )}
      </button>
    );
  }

  if (variant === 'icon') {
    return (
      <button
        type="button"
        className={className ?? 'acongm-auth-icon-btn'}
        title={`${title} · 点击退出`}
        aria-label={`${title}，点击退出登录`}
        onClick={handleLogout}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="acongm-auth-icon-btn__photo"
            src={photo}
            alt=""
            width={22}
            height={22}
            referrerPolicy="no-referrer"
            decoding="async"
          />
        ) : (
          <span className="acongm-auth-icon-btn__mark" aria-hidden>
            {avatarChar(label)}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="acongm-auth-user" data-variant={variant}>
      <div className="acongm-auth-user__identity">
        <UserAvatar label={label} src={photo} />
        <div className="acongm-auth-user__meta">
          <span className="acongm-auth-user__name" title={title}>
            {label}
          </span>
          {email && email !== label ? (
            <span className="acongm-auth-user__account" title={email}>
              {email}
            </span>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        className={className ?? 'acongm-auth-btn'}
        onClick={handleLogout}
      >
        退出
      </button>
    </div>
  );
}
