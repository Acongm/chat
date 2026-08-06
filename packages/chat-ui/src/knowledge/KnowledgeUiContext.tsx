'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { KnowledgeRef } from '@acongm/kb-catalog';

export type KnowledgePickerSource = 'at' | 'plus';

export type MentionState = {
  open: boolean;
  query: string;
  source: KnowledgePickerSource;
};

export type KnowledgeUiProviderProps = {
  children: ReactNode;
  chips?: KnowledgeRef[];
  onChipsChange?: (chips: KnowledgeRef[]) => void;
};

export type KnowledgeUiContextValue = {
  chips: KnowledgeRef[];
  toggleChip: (ref: KnowledgeRef) => void;
  removeChip: (id: string) => void;
  mention: MentionState;
  openMention: (query?: string) => void;
  openAttachPicker: () => void;
  setMentionQuery: (query: string) => void;
  closeMention: () => void;
};

const EMPTY_CHIPS: KnowledgeRef[] = [];

const CLOSED_MENTION: MentionState = {
  open: false,
  query: '',
  source: 'at',
};

const KnowledgeUiContext = createContext<KnowledgeUiContextValue | null>(null);

export function KnowledgeUiProvider({
  children,
  chips,
  onChipsChange,
}: KnowledgeUiProviderProps) {
  const [localChips, setLocalChips] = useState<KnowledgeRef[]>([]);
  const [mention, setMention] = useState<MentionState>({
    open: false,
    query: '',
    source: 'at',
  });

  const activeChips = chips ?? localChips;

  const commitChips = useCallback(
    (nextChips: KnowledgeRef[]) => {
      onChipsChange?.(nextChips);
      if (chips === undefined) {
        setLocalChips(nextChips);
      }
    },
    [chips, onChipsChange],
  );

  const toggleChip = useCallback(
    (ref: KnowledgeRef) => {
      const exists = activeChips.some((chip) => chip.id === ref.id);
      commitChips(
        exists
          ? activeChips.filter((chip) => chip.id !== ref.id)
          : [...activeChips, ref],
      );
    },
    [activeChips, commitChips],
  );

  const removeChip = useCallback(
    (id: string) => {
      commitChips(activeChips.filter((chip) => chip.id !== id));
    },
    [activeChips, commitChips],
  );

  const openMention = useCallback((query = '') => {
    setMention({ open: true, query, source: 'at' });
  }, []);

  const openAttachPicker = useCallback(() => {
    setMention({ open: true, query: '', source: 'plus' });
  }, []);

  const setMentionQuery = useCallback((query: string) => {
    setMention({ open: true, query, source: 'at' });
  }, []);

  const closeMention = useCallback(() => {
    setMention(CLOSED_MENTION);
  }, []);

  const value = useMemo(
    () => ({
      chips: activeChips,
      toggleChip,
      removeChip,
      mention,
      openMention,
      openAttachPicker,
      setMentionQuery,
      closeMention,
    }),
    [
      activeChips,
      toggleChip,
      removeChip,
      mention,
      openMention,
      openAttachPicker,
      setMentionQuery,
      closeMention,
    ],
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
      chips: EMPTY_CHIPS,
      toggleChip: () => undefined,
      removeChip: () => undefined,
      mention: CLOSED_MENTION,
      openMention: () => undefined,
      openAttachPicker: () => undefined,
      setMentionQuery: () => undefined,
      closeMention: () => undefined,
    };
  }
  return ctx;
}
