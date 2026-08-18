# Chat 仓库 Issue 状态

> 跨仓统一跟踪见：[`Acongm/node-vercel-starter/docs/platform-issue-status.md`](https://github.com/Acongm/node-vercel-starter/blob/main/docs/platform-issue-status.md)

## 本仓 Issues

| # | 标题 | 状态 | 说明 |
|---|------|------|------|
| **36** | Chat v2 consumer | **已完成 ✅** | merged `edb980e` |
| **41** | 用户菜单 + getUserInfo | **源码完成 ✅** | BFF + AuthAccountMenu + `/account#settings` |
| **40** | 非阻塞启动 | **源码完成 ✅** | tail-first + 失败不清空；剩 browser smoke → #37 |
| **39** | Chat 产品优化 | OPEN | 父 Epic；执行入口改为 #37 |
| **1** | Chat v2 Epic | OPEN | #36/#40/#41 代码完成；剩 #37 |

## 下一步（chat 仓）

1. **#37** mock browser smoke — ✅ `e2e/quality-gate-smoke.spec.ts`（Send / Retry / Reload / Edit / Cancel + 会话列表持久化）
2. **#37** 生产 JWT browser — 仍缺 Runtime Secret
