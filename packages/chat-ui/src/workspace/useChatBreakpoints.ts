'use client';

import { useEffect, useState } from 'react';

export type ChatBreakpoint = 'compact' | 'medium' | 'wide';

function widthToBreakpoint(width: number): ChatBreakpoint {
  if (width < 768) return 'compact';
  if (width < 1180) return 'medium';
  return 'wide';
}

/**
 * 统一断点：compact <768 / medium <1180 / wide ≥1180
 * 供 ChatWorkspace 与移动 PanelHost 共用。
 */
export function useChatBreakpoints(): ChatBreakpoint {
  const [bp, setBp] = useState<ChatBreakpoint>(() => {
    if (typeof window === 'undefined') return 'wide';
    return widthToBreakpoint(window.innerWidth);
  });

  useEffect(() => {
    const sync = () => setBp(widthToBreakpoint(window.innerWidth));
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  return bp;
}
