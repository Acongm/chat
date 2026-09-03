# Chat 仓库 Issue 状态

> 最后更新：2026-09-03  
> 跨仓统一跟踪：[`platform-issue-status.md`](https://github.com/Acongm/node-vercel-starter/blob/main/docs/platform-issue-status.md)

## 本仓 Issues（对照 `origin/main`）

| # | 标题 | 代码 | GitHub | 说明 |
|---|------|------|--------|------|
| **36** | Chat v2 consumer | ✅ | MERGED | |
| **41** | 用户菜单 + getUserInfo | ✅ | **CLOSED** 2026-08-19 | |
| **40** | 非阻塞启动 | 源码 + mock e2e ✅ | OPEN | 生产 cookie → `#37` |
| **26** | 可靠性收口 | v2 已覆盖主路径 | OPEN | 生产 5-round；P1 context chip 未做 |
| **39** | Chat 产品优化 | `#40`/`#41` 已交付 | OPEN | P1 rename/search 未做 |
| **1** | Chat v2 Epic | consumer 已切 `/api/chats` | OPEN | legacy `/api/chat/threads` BFF 仍在 |
| **33** | Chat Product Epic | — | OPEN | Stage 6，不抢主线 |
| **5** | KB Debug 面板 | — | OPEN | Stage 3，不抢主线 |

## 证据

- 非阻塞：`apps/web/components/chat-workspace-app.tsx`（`composerDisabled` 仅 restoring/error）
- tail-first：`packages/chat-ui/src/integration/use-chat-threads.ts` `loadOlderMessages`
- 合同：`tests/contracts/chat-nonblocking-startup.test.mjs`
- mock e2e：`e2e/quality-gate-smoke.spec.ts`
- live JWT chrome：`e2e/live-quality-gate.spec.ts` + `pnpm test:e2e:live`
- 无默认「返回文档站」：合同断言 workspace 不含 `portalHref=`

## 下一步

1. `#37` 生产 cookie / 真 LLM Send / Retry / Reload / Edit / Cancel
2. `#26` 正文改为「v2 已替代旧 threads 路径」；P1 chip 另开或降级
3. `#1` 等 `#37` + API `#35` 再删 legacy BFF
