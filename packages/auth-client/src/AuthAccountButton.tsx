'use client';

import { useAuthActions, useSession } from './hooks';

export type AuthAccountButtonProps = {
  className?: string;
  /** compact：侧栏；nav：顶栏 */
  variant?: 'nav' | 'sidebar';
};

export function AuthAccountButton({
  className,
  variant = 'nav',
}: AuthAccountButtonProps) {
  const { session, loading, configured } = useSession();
  const { login, logout } = useAuthActions();

  if (!configured) {
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
    return (
      <span className={className ?? 'acongm-auth-btn is-loading'} data-variant={variant}>
        …
      </span>
    );
  }

  if (!session) {
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

  const label =
    session.user.user_metadata?.user_name ||
    session.user.user_metadata?.preferred_username ||
    session.user.email ||
    '已登录';

  return (
    <div className="acongm-auth-user" data-variant={variant}>
      <span className="acongm-auth-user__name" title={session.user.email ?? undefined}>
        {String(label)}
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
