'use client';

/**
 * 侧栏底部轻量设置（无 next-themes 依赖）。
 */
export function ChatSettingsSlot() {
  return (
    <div className="acongm-chat-settings">
      <button
        type="button"
        className="acongm-chat-settings__btn"
        onClick={() => {
          const root = document.documentElement;
          const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
          root.dataset.theme = next;
          root.classList.toggle('dark', next === 'dark');
          try {
            localStorage.setItem('acongm-chat-theme', next);
          } catch {
            // ignore
          }
        }}
        title="切换亮/暗外观"
      >
        外观 · 切换
      </button>
    </div>
  );
}
