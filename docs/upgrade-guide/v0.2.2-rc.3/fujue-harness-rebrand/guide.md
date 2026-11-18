---
kind: upgrade-guide
description: "The product, its Desktop user data directory, released artifact names, and default endpoints move to FuJue Harness and platform.nguyenphuquyet.online."
---

# FuJue Harness replaces the DeepSeek Harness brand, data directory, artifact names, and endpoints

English | [中文](guide.zh.md)

## Change

The application calls itself **FuJue Harness** and reaches `https://platform.nguyenphuquyet.online` by default.

- Desktop: the packaged product name, About panel, tray and quit labels, installer copy, and `dsh` handler name read FuJue Harness. Electron derives `userData` from that name, so a packaged install now reads settings, shortcuts, update channel, background-close marker, and logs from `%APPDATA%\FuJue Harness` on Windows, `~/Library/Application Support/FuJue Harness` on macOS (logs in `~/Library/Logs/FuJue Harness`), and `~/.config/FuJue Harness` on Linux instead of the `DeepSeek Harness` directories.
- Artifacts: `deepseek-harness-<version>-<os>-<arch>…` becomes `fujue-harness-<version>-<os>-<arch>…`.
- Endpoints: `PUBLIC_BASE_URL` (`…/anthropic`), the model listing (`…/models`), `DEEPSEEK_DEFAULT_BASE_URL` (`…/anthropic/v1`), the web search and fetch base (`…/v1/tools`), and the account `platformOrigin`, `harnessOrigin`, and `inferenceOrigin` defaults all move to the new origin.
- Provider: the `deepseek-official` route lists as **FuJue**. Its id, the `llm-deepseek-api-key` settings namespace, `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, the `dsh` scheme, and `appId` keep their names.

## Migration

1. Packaged Desktop: quit the app, then move the old user data directory to the new name, for example `mv "$HOME/Library/Application Support/DeepSeek Harness" "$HOME/Library/Application Support/FuJue Harness"` (`%APPDATA%\DeepSeek Harness` → `%APPDATA%\FuJue Harness` on Windows). Confirm the relaunched app shows the previous sessions, settings, and sign-in state.
2. Deployments that pin another origin: set `platformOrigin`, `harnessOrigin`, and `inferenceOrigin` on `deepseek-account`, `baseURL` on `llm-deepseek` or `DEEPSEEK_BASE_URL`, and `searchBaseURL`/`fetchBaseURL` on `web-deepseek-api` to the deployment you run. Confirm one signed-in model request and one search reach that origin.
3. Republish download links and update manifests under the `fujue-harness-*` names. Confirm the new installer replaces the previous installation and the app opens with its existing sessions.
