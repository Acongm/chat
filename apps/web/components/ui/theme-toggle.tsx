'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import {
  applyTheme,
  readTheme,
  setTheme,
  watchSystemTheme,
  type AcongmTheme,
} from '@/lib/theme';

const THEME_ORDER: AcongmTheme[] = ['system', 'light', 'dark'];

const THEME_META: Record<
  AcongmTheme,
  { label: string; nextLabel: string; icon: typeof Sun }
> = {
  system: { label: '跟随系统', nextLabel: '切换到浅色模式', icon: Monitor },
  light: { label: '浅色模式', nextLabel: '切换到深色模式', icon: Sun },
  dark: { label: '深色模式', nextLabel: '切换到跟随系统', icon: Moon },
};

export type ThemeToggleProps = Omit<ButtonProps, 'children' | 'onClick'> & {
  showLabel?: boolean;
};

export function ThemeToggle({ showLabel = true, ...buttonProps }: ThemeToggleProps) {
  const [theme, setCurrentTheme] = useState<AcongmTheme>('system');

  useEffect(() => {
    const initial = readTheme();
    setCurrentTheme(initial);
    applyTheme(initial);
  }, []);

  useEffect(
    () => watchSystemTheme(theme, () => setCurrentTheme((value) => value)),
    [theme],
  );

  const meta = THEME_META[theme];
  const Icon = meta.icon;
  const nextTheme = useMemo(() => {
    const index = THEME_ORDER.indexOf(theme);
    return THEME_ORDER[(index + 1) % THEME_ORDER.length] ?? 'system';
  }, [theme]);

  return (
    <Button
      variant="ghost"
      size={showLabel ? 'default' : 'icon'}
      title={meta.nextLabel}
      aria-label={`${meta.label}，${meta.nextLabel}`}
      {...buttonProps}
      onClick={() => {
        setTheme(nextTheme);
        setCurrentTheme(nextTheme);
      }}
    >
      <Icon className="size-4" aria-hidden />
      {showLabel ? <span>{meta.label}</span> : null}
    </Button>
  );
}
