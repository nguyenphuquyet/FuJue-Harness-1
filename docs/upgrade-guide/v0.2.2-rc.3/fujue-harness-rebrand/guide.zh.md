---
kind: upgrade-guide
description: "产品、Desktop 用户数据目录、发布产物名称和默认端点都改为 FuJue Harness 与 platform.nguyenphuquyet.online。"
---

# FuJue Harness 取代 DeepSeek Harness 的品牌、用户数据目录、产物名称和端点

[English](guide.md) | 中文

## 变更

应用改称 **FuJue Harness**，并默认访问 `https://platform.nguyenphuquyet.online`。

- Desktop：打包产品的名称、关于面板、托盘与退出文案、安装程序文案以及 `dsh` 处理器名称都改为 FuJue Harness。Electron 依据该名称推导 `userData`，因此打包安装现在从 `%APPDATA%\FuJue Harness`（Windows）、`~/Library/Application Support/FuJue Harness`（macOS，日志在 `~/Library/Logs/FuJue Harness`）、`~/.config/FuJue Harness`（Linux）读取设置、快捷键、更新通道、后台关闭标记和日志，不再使用 `DeepSeek Harness` 目录。
- 产物：`deepseek-harness-<version>-<os>-<arch>…` 改为 `fujue-harness-<version>-<os>-<arch>…`。
- 端点：`PUBLIC_BASE_URL`（`…/anthropic`）、模型列表（`…/models`）、`DEEPSEEK_DEFAULT_BASE_URL`（`…/anthropic/v1`）、网页搜索与抓取基址（`…/v1/tools`），以及账号的 `platformOrigin`、`harnessOrigin`、`inferenceOrigin` 默认值全部改到新来源。
- 提供方：`deepseek-official` 路由显示为 **FuJue**。其 id、`llm-deepseek-api-key` 设置命名空间、`DEEPSEEK_API_KEY`、`DEEPSEEK_BASE_URL`、`dsh` scheme 和 `appId` 保持原名。

## 迁移

1. 打包 Desktop：退出应用，然后把旧的用户数据目录改名或移动到新名称，例如 `mv "$HOME/Library/Application Support/DeepSeek Harness" "$HOME/Library/Application Support/FuJue Harness"`（Windows 为 `%APPDATA%\DeepSeek Harness` → `%APPDATA%\FuJue Harness`）。确认重启后仍能看到原有会话、设置和登录状态。
2. 固定了其他来源的部署：在 `deepseek-account` 上设置 `platformOrigin`、`harnessOrigin`、`inferenceOrigin`，在 `llm-deepseek` 上设置 `baseURL`（或 `DEEPSEEK_BASE_URL`），在 `web-deepseek-api` 上设置 `searchBaseURL`/`fetchBaseURL`，指向实际运行的部署。确认一次已登录的模型请求和一次搜索都到达该来源。
3. 用 `fujue-harness-*` 名称重新发布下载链接和更新清单。确认新安装程序覆盖原安装，且应用启动后仍保留原有会话。
