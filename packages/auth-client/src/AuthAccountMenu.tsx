'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getAuthBaseUrl } from './client';

function avatarChar(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return 'U';
  const local = trimmed.includes('@') ? trimmed.split('@')[0] : trimmed;
  return Array.from(local)[0]?.toUpperCase() || 'U';
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
      // eslint-disable-next-line @next/next/no-img-element -- OAuth avatar URL
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

export type AuthAccountMenuProps = {
  label: string;
  photo: string | null;
  email: string | null;
  variant: 'nav' | 'sidebar' | 'icon' | 'avatar';
  className?: string;
  onLogout: () => void;
  /** e.g. theme toggle below menu actions */
  menuFooter?: ReactNode;
};

export function AuthAccountMenu({
  label,
  photo,
  email,
  variant,
  className,
  onLogout,
  menuFooter,
}: AuthAccountMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const title =
    email && email !== label ? `${label} · ${email}` : label;
  const accountBase = `${getAuthBaseUrl().replace(/\/$/, '')}/account`;

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const triggerClass =
    variant === 'icon' || variant === 'avatar'
      ? className ?? 'acongm-auth-icon-btn'
      : className ?? 'acongm-auth-menu-trigger';

  return (
    <div
      ref={rootRef}
      className="acongm-auth-menu"
      data-variant={variant}
      data-open={open ? 'true' : 'false'}
    >
      <button
        type="button"
        className={triggerClass}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        title={title}
        onClick={() => setOpen((value) => !value)}
      >
        {variant === 'icon' || variant === 'avatar' ? (
          photo ? (
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
          )
        ) : (
          <>
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
            <span className="acongm-auth-menu-trigger__chevron" aria-hidden>
              ▾
            </span>
          </>
        )}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="acongm-auth-menu__panel"
          aria-label="账号菜单"
        >
          <div className="acongm-auth-menu__header">
            <span className="acongm-auth-menu__header-name">{label}</span>
            {email ? (
              <span className="acongm-auth-menu__header-email">{email}</span>
            ) : null}
          </div>
          <a
            role="menuitem"
            className="acongm-auth-menu__item"
            href={accountBase}
            onClick={() => setOpen(false)}
          >
            账号
          </a>
          <a
            role="menuitem"
            className="acongm-auth-menu__item"
            href={`${accountBase}#settings`}
            onClick={() => setOpen(false)}
          >
            设置
          </a>
          <button
            type="button"
            role="menuitem"
            className="acongm-auth-menu__item is-danger"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            退出登录
          </button>
          {menuFooter ? (
            <div className="acongm-auth-menu__footer">{menuFooter}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
