'use client';

import { ThemeToggle } from '@/components/ui/theme-toggle';

/** Chat 侧栏底部外观切换：light / dark / system 与 portal/auth 共用协议。 */
export function ChatSettingsSlot() {
  return (
    <ThemeToggle
      showLabel
      className="w-full justify-start text-muted-foreground hover:text-accent-foreground"
    />
  );
}
