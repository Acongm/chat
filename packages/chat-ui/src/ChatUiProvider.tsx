'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ChatLayoutMode = 'drawer' | 'fullscreen';

type ChatUiContextValue = {
  open: boolean;
  mode: ChatLayoutMode;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  setMode: (mode: ChatLayoutMode) => void;
};

const ChatUiContext = createContext<ChatUiContextValue | null>(null);

function syncOpenClass(open: boolean) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('acongm-chat-open', open);
}

export type ChatUiProviderProps = {
  children: ReactNode;
  defaultMode?: ChatLayoutMode;
};

export function ChatUiProvider({
  children,
  defaultMode = 'drawer',
}: ChatUiProviderProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ChatLayoutMode>(defaultMode);

  const openPanel = useCallback(() => setOpen(true), []);
  const closePanel = useCallback(() => setOpen(false), []);
  const togglePanel = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    syncOpenClass(open);
    // PC 分栏：给正文让出右侧宽度；遮罩/滚动锁交给 rc-drawer
    return () => syncOpenClass(false);
  }, [open]);

  useEffect(
    () => () => {
      syncOpenClass(false);
    },
    [],
  );

  const value = useMemo(
    () => ({
      open,
      mode,
      openPanel,
      closePanel,
      togglePanel,
      setMode,
    }),
    [open, mode, openPanel, closePanel, togglePanel],
  );

  return (
    <ChatUiContext.Provider value={value}>{children}</ChatUiContext.Provider>
  );
}

export function useChatUi(): ChatUiContextValue {
  const ctx = useContext(ChatUiContext);
  if (!ctx) {
    throw new Error('useChatUi must be used within ChatUiProvider');
  }
  return ctx;
}
