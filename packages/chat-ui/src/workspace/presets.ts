export type ChatLayoutPreset =
  | 'embed'
  | 'embedWithContext'
  | 'siteFull'
  | 'siteFocus'
  | 'siteKbBrowse'
  | 'mainOnly';

export type PanelSlotMode = false | true | 'auto';

export type ChatWorkspaceResolvedSlots = {
  threadSidebar: boolean;
  knowledgePanel: boolean;
};

const PRESET_SLOTS: Record<
  ChatLayoutPreset,
  { threadSidebar: PanelSlotMode; knowledgePanel: PanelSlotMode }
> = {
  embed: { threadSidebar: false, knowledgePanel: false },
  embedWithContext: { threadSidebar: false, knowledgePanel: 'auto' },
  siteFull: { threadSidebar: 'auto', knowledgePanel: 'auto' },
  // 桌面固定左栏；移动端 auto→sheet（由 ChatWorkspace 托管）
  siteFocus: { threadSidebar: 'auto', knowledgePanel: false },
  siteKbBrowse: { threadSidebar: false, knowledgePanel: true },
  mainOnly: { threadSidebar: false, knowledgePanel: false },
};

export function resolveWorkspaceSlots(options: {
  preset?: ChatLayoutPreset;
  threadSidebar?: PanelSlotMode;
  knowledgePanel?: PanelSlotMode;
  /** compact = mobile：auto → false（改由 sheet 打开） */
  compact?: boolean;
}): ChatWorkspaceResolvedSlots {
  const preset = options.preset ?? 'siteFull';
  const base = PRESET_SLOTS[preset];
  const threadMode = options.threadSidebar ?? base.threadSidebar;
  const knowledgeMode = options.knowledgePanel ?? base.knowledgePanel;

  const resolve = (mode: PanelSlotMode): boolean => {
    if (mode === false) return false;
    if (mode === true) return true;
    // auto
    return !options.compact;
  };

  return {
    threadSidebar: resolve(threadMode),
    knowledgePanel: resolve(knowledgeMode),
  };
}
