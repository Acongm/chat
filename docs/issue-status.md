# Chat 仓库 Issue 状态

> 跨仓统一跟踪见：[`Acongm/node-vercel-starter/docs/platform-issue-status.md`](https://github.com/Acongm/node-vercel-starter/blob/main/docs/platform-issue-status.md)

## 本仓 Issues

| # | 标题 | 状态 | 说明 |
|---|------|------|------|
| **36** | Chat v2 consumer | **已完成 ✅** | merged `edb980e` |
| **41** | 用户菜单 + getUserInfo | **进行中** | AuthAccountMenu ✅；补 `/api/user` BFF |
| **40** | 非阻塞启动 | **Phase 2 进行中** | tail-first + composer disabled + User BFF |
| **39** | Chat 产品优化 | OPEN | 父 Epic，执行入口 #40 |
| **1** | Chat v2 Epic | OPEN | #36 代码完成；剩 #40/#37 |

## 下一步（chat 仓）

1. **#37** — browser E2E smoke（API path 已在 node-vercel-starter `platform-v2-quality-gate.e2e-spec.ts`）
2. **#41 Phase 2** — theme 入口细化（menuFooter 已接 ChatSettingsSlot）
