'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type MentionState = {
  open: boolean;
  query: string;
};

type KnowledgeUiContextValue = {
  mention: MentionState;
  openMention: (query?: string) => void;
  setMentionQuery: (query: string) => void;
  closeMention: () => void;
};

const KnowledgeUiContext = createContext<KnowledgeUiContextValue | null>(null);

export function KnowledgeUiProvider({ children }: { children: ReactNode }) {
  const [mention, setMention] = useState<MentionState>({
    open: false,
    query: '',
  });

  const openMention = useCallback((query = '') => {
    setMention({ open: true, query });
  }, []);

  const setMentionQuery = useCallback((query: string) => {
    setMention((prev) => ({ ...prev, open: true, query }));
  }, []);

  const closeMention = useCallback(() => {
    setMention({ open: false, query: '' });
  }, []);

  const value = useMemo(
    () => ({ mention, openMention, setMentionQuery, closeMention }),
    [mention, openMention, setMentionQuery, closeMention],
  );

  return (
    <KnowledgeUiContext.Provider value={value}>
      {children}
    </KnowledgeUiContext.Provider>
  );
}

export function useKnowledgeUi(): KnowledgeUiContextValue {
  const ctx = useContext(KnowledgeUiContext);
  if (!ctx) {
    return {
      mention: { open: false, query: '' },
      openMention: () => undefined,
      setMentionQuery: () => undefined,
      closeMention: () => undefined,
    };
  }
  return ctx;
}
