# Chat 仓库 Issue 状态

> 跨仓统一跟踪见：[`Acongm/node-vercel-starter/docs/platform-issue-status.md`](https://github.com/Acongm/node-vercel-starter/blob/main/docs/platform-issue-status.md)

## 本仓 Issues

| # | 标题 | 状态 | 说明 |
|---|------|------|------|
| **36** | Chat v2 consumer | **已完成 ✅** | merged `edb980e` |
| **41** | 用户菜单 + getUserInfo | OPEN Phase 2 | Phase 1：侧栏 userInfo ✅ `d7cf211` |
| **40** | 非阻塞启动 | **P0 OPEN** | 当前最高优先级前端体验 |
| **39** | Chat 产品优化 | OPEN | 父 Epic，执行入口 #40 |
| **1** | Chat v2 Epic | OPEN | #36 代码完成；剩 #40/#37 |

## 下一步（chat 仓）

1. **#40** — 移除 `authIdentity` / `seedStatus` 整页阻塞；history 首屏 + lazy load
2. **#41 Phase 2** — 用户菜单（账号/设置链接）+ theme 入口
3. **#37** — browser E2E smoke
