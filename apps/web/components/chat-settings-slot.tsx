'use client';

import { getAuthBaseUrl } from '@acongm/auth-client';
import { ThemeToggle } from '@/components/ui/theme-toggle';

/** Chat 侧栏：本地 theme + 跳转 Auth Account 管理 model/prompt。 */
export function ChatSettingsSlot() {
  const settingsHref = `${getAuthBaseUrl().replace(/\/$/, '')}/account#settings`;

  return (
    <div className="space-y-2">
      <ThemeToggle
        showLabel
        className="w-full justify-start text-muted-foreground hover:text-accent-foreground"
      />
      <a
        href={settingsHref}
        className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      >
        模型与 Prompt
      </a>
    </div>
  );
}
