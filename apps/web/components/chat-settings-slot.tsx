'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * ChatGPT 侧栏底部外观切换。
 */
export function ChatSettingsSlot() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('acongm-chat-theme');
      if (stored === 'dark' || stored === 'light') {
        setTheme(stored);
        document.documentElement.dataset.theme = stored;
        document.documentElement.classList.toggle('dark', stored === 'dark');
        return;
      }
    } catch {
      // ignore
    }
    const dark = document.documentElement.classList.contains('dark');
    setTheme(dark ? 'dark' : 'light');
  }, []);

  return (
    <button
      type="button"
      className="acongm-chat-settings__btn"
      onClick={() => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        document.documentElement.dataset.theme = next;
        document.documentElement.classList.toggle('dark', next === 'dark');
        try {
          localStorage.setItem('acongm-chat-theme', next);
        } catch {
          // ignore
        }
      }}
      title="切换亮/暗外观"
    >
      {theme === 'dark' ? <Sun size={15} aria-hidden /> : <Moon size={15} aria-hidden />}
      <span>{theme === 'dark' ? '浅色模式' : '深色模式'}</span>
    </button>
  );
}
