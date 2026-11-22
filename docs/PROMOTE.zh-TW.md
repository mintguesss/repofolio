# 自動發文與競品分析

[English](PROMOTE.md)

repofolio 每晚掃描你的 repo 時，會把「發生了什麼」寫成各平台的貼文草稿。你在加密管理頁的 **📣 發文** 分頁修改、核准，Action 就用你自己的平台金鑰發出去。不需要伺服器，也不需要第三方服務。

每個專案另外會有一份 **🎯 競品分析**：GitHub 上的相似專案、你和它們的比較，以及下一步可以做什麼。這份分析只出現在管理頁。

## 運作方式

```
每晚掃描 ─→ 偵測事件 ─→ 產生草稿（Claude 或模板）─→ 存在 repofolio-data 分支
                                                      │
                     管理頁 📣 分頁：修改、勾選平台、按「核准並發布」
                                                      │
              workflow_dispatch（posts 輸入）─→ Action 發布 ─→ 結果寫回管理頁
```

**會產生草稿的事件**（只看公開、且顯示在作品集上的 repo）：

| 事件 | 什麼時候 |
|---|---|
| 作品集介紹 | 第一次執行時，一篇介紹整個作品集的貼文 |
| 新專案 | 出現新的公開 repo |
| 新版本 | 有新的 GitHub Release |
| 星星里程碑 | 跨過 10、25、50、100、250、500、1000… |
| 上線 | 專案第一次有可以連上的網站 |
| 每週摘要 | 每週一（可設定），整理上週的 commit、release、新星星 |
| 手動介紹 | 在管理頁的專案視窗按「📣 幫這個專案寫一篇」 |

貼文連結指向 `作品集/p/<專案>/`。這個分享頁有專案封面當預覽圖，點進去會直接打開作品集裡的那個專案。

## 設定

```yaml
promote:
  enabled: true
  platforms: [linkedin, threads, bluesky, x, devto, ptt, hn, reddit]
  hashtags: [buildinpublic]
  # events: { weekly: mon, stars: [10, 50, 100, 500, 1000], newProject: true, release: true, live: true, intro: true }
  # language: zh-TW        # 預設跟 language 一樣
  # llm: auto              # 有 ANTHROPIC_API_KEY 就用 Claude 寫草稿，否則用模板
  # mentionPrivate: false  # 每週摘要可以寫「另外有 N 個私人專案有進度」（只有數字）
competitors:
  enabled: true            # 預設就開
  # count: 5  refreshDays: 14  perRun: 8  includePrivate: true  llm: auto
```

Workflow 需要：

- `permissions: contents: write`：寫入 `repofolio-data` 分支。
- `workflow_dispatch` 加上 `posts` 輸入，並傳給 Action：`posts: ${{ inputs.posts }}`。
- `concurrency.cancel-in-progress: false`：避免發到一半被取消。

[`templates/site-workflow.yml`](../templates/site-workflow.yml) 已經都設好了。

## 核准用的 GitHub 金鑰

管理頁按「核准」時，會用你的金鑰觸發 workflow。第一次使用時在 📣 分頁貼上：

1. 到 <https://github.com/settings/personal-access-tokens/new> 建立 fine-grained token。
2. Repository access 選 **Only select repositories**，只選放 workflow 的那個 repo。
3. Permissions → **Actions: Read and write**，其他都不用。

金鑰只存在你的瀏覽器（而且只在解鎖後的管理頁裡）。

## 各平台金鑰

沒設定金鑰的平台不會自動發，但草稿一樣會有，旁邊有「複製」和「開啟發文頁」按鈕，發完勾「我已手動發了」就會記錄。

金鑰都放在 repo 的 **Settings → Secrets and variables → Actions**，名稱照下表。

| 平台 | 自動發布 | Secrets | 怎麼拿 |
|---|---|---|---|
| LinkedIn | ✓ | `LINKEDIN_TOKEN` | 見下方 |
| Bluesky | ✓ | `BLUESKY_HANDLE`、`BLUESKY_APP_PASSWORD` | Bluesky → Settings → Privacy and security → App passwords → Add。Handle 像 `you.bsky.social` |
| Threads | ✓ | `THREADS_TOKEN` | 見下方 |
| DEV（dev.to） | ✓ | `DEVTO_API_KEY` | dev.to → Settings → Extensions → DEV Community API Keys → Generate |
| Mastodon | ✓ | `MASTODON_URL`、`MASTODON_TOKEN` | 你的站台 → Preferences → Development → New application，權限勾 `write:statuses` 和 `read:accounts`。URL 像 `https://mastodon.social` |
| X | ✓（付費） | `X_API_KEY`、`X_API_SECRET`、`X_ACCESS_TOKEN`、`X_ACCESS_SECRET` | developer.x.com 建 App，User authentication 設 Read and write，產生 Access Token。X 從 2026-02 起按量計費，含連結的貼文一篇約 0.2 美元 |
| Discord | ✓ | `DISCORD_WEBHOOK` | 頻道設定 → Integrations → Webhooks → New → Copy URL |
| Telegram | ✓ | `TELEGRAM_BOT_TOKEN`、`TELEGRAM_CHAT_ID` | @BotFather 建 bot，把 bot 加進頻道當管理員，chat id 用 `@頻道名稱` |
| Hacker News | 手動 | — | 沒有 API；給你填好的 Show HN 送出連結 |
| Reddit | 手動 | — | 2025-11 起新 App 都要審核；給你填好的送出連結 |
| Facebook | 手動 | — | 個人頁沒有發文 API；給你分享連結 |
| PTT | 手動 | — | 草稿是 PTT 格式（[分享] 標題、純文字），複製貼上 |

### LinkedIn

1. 到 <https://www.linkedin.com/developers/apps> 建立 App。LinkedIn 要求 App 綁一個 LinkedIn 粉專，沒有的話先建一個。
2. App 的 **Products** 分頁加上 **Share on LinkedIn** 和 **Sign In with LinkedIn using OpenID Connect**（都是自助開通）。
3. 到 <https://www.linkedin.com/developers/tools/oauth/token-generator>，選你的 App，勾 `openid`、`profile`、`w_member_social`，產生 token。
4. 存成 secret `LINKEDIN_TOKEN`。

token 60 天後到期，自助 App 沒有 refresh token。到期後管理頁的 LinkedIn 會變紅色「錯誤」，重做第 3、4 步就好。

### Threads

1. 到 <https://developers.facebook.com/apps> 建立 App，用途選 **Access the Threads API**。
2. App roles 把自己的 Threads 帳號加成 **Threads Tester**，到 Threads App 的設定裡接受邀請。
3. 在 App 的 Threads API 設定裡用 User Token Generator 產生 token，權限要有 `threads_basic` 和 `threads_content_publish`，再換成長效 token（60 天）。
4. 存成 secret `THREADS_TOKEN`。發到自己的帳號不用送審。

## 用 Claude 寫草稿和分析

設定 secret `ANTHROPIC_API_KEY` 之後：

- **草稿**：每個事件呼叫一次 Claude，依各平台風格寫（LinkedIn 寫成果和學到什麼、X 和 Bluesky 短、DEV 長文、PTT 用 PTT 格式），不會編造資料以外的功能或數字。超過字數限制的平台會改用模板。
- **競品**：先用 GitHub 搜尋找出最多 12 個候選，Claude 挑出真正同類的專案，再寫定位、優勢、差距和下一步。

沒有金鑰也能用：草稿用模板，競品用規則比對（共同 topic 和關鍵字），比較星星、活躍度、demo、授權。

## 隱私

- 私有 repo **永遠不會**出現在貼文裡，連「手動介紹」也會拒絕。
- 每週摘要預設不提私有專案；開了 `mentionPrivate` 也只會寫數量。
- 有設 `REPOFOLIO_ADMIN_PASSWORD` 時，`repofolio-data` 分支裡的檔案是加密的（`state.enc`），所以公開 repo 也可以放私有專案的競品分析。
- 沒設密碼、而且 repo 是公開的話，資料分支是明文，只會存公開專案的資料。
- 競品搜尋用的是 GitHub 搜尋 API；用 Claude 時，專案的 README 摘錄會送給 Anthropic（跟 `llm.enabled` 的 README 摘要一樣）。
