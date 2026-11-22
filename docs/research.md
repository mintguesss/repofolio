# 競品調查與受歡迎策略（2026-11）

調查方式：`gh search repos` 依星數排序搜尋相關關鍵字，加上網路搜尋。星數為 2026-11-19 的數字。

## 1. 同類工具與星數

| 類別 | 專案 | ⭐ | 做什麼 | 跟 repofolio 的關係 |
|---|---|---|---|---|
| 個人頁統計卡 | anuraghazra/github-readme-stats | ~79.8k | 動態 SVG 統計卡，貼在 profile README | **病毒式成長的典範**：每張卡片都是廣告 |
| 個人頁統計卡 | lowlighter/metrics | ~17.5k | 30+ 外掛的資訊圖表產生器（Action） | 同樣走 Action + 輸出貼在 profile |
| 個人頁統計卡 | DenverCoder1/github-readme-streak-stats | ~7.2k | 連續貢獻天數卡 | 同上 |
| 個人頁趣味 | Platane/snk | ~6.2k | 把貢獻圖變成貪食蛇動畫 | 「好玩、好看、想分享」也能拿星星 |
| 個人頁產生器 | rahuldkjain/github-profile-readme-generator | ~24.5k | 網頁表單產生 profile README | 一次性工具，但需求量證明很大 |
| Profile 自動更新 | gautamkrishnar/blog-post-workflow | ~3.5k | Action：把最新部落格文章寫進 README | **最接近的模式**：Action + 標記區塊自動更新 |
| Profile 自動更新 | jamesgeorge007/github-activity-readme | ~1k | Action：把最近活動寫進 README | 同上 |
| 作品集網站 | arifszn/gitprofile | ~2.3k | 用 GitHub 帳號產生作品集網站 | 只有展示，沒有盤點和部署管理 |
| 開發者入口網站 | backstage/backstage | ~34.9k | 企業內部軟體型錄 | 概念最接近（software catalog），但是給公司用、很重 |
| 作品集產生器（小型） | isradeleon/github-portfolio、svandragt/toolhub 等 | 0–32 | 從 repo 產生作品集 | 很多人做，但都沒紅 |
| Repo 儀表板（小型） | camptocamp/github-repositories-dashboard 等 | 0–8 | 列出 repo 狀態 | 同上 |
| Repo 健檢 | dogweather/repo-health-check | ~86 | 分析專案維護狀況 | 單一 repo、偏開源維護者 |

付費或商業產品：DevReplay（跨 repo 的變更回顧，AI 摘要要付費）、Uptagen（部署紀錄要自己打 API）。

## 2. 結論：缺口在哪

- **沒有人把「個人專案盤點」做好**：網路搜尋的結論也是「沒有工具涵蓋每個專案的上線網址清冊，只能自己做試算表」。
- 現有工具都只做其中一塊：
  - 展示：gitprofile、統計卡
  - 部署：Backstage、github-deploy
  - 活動：DevReplay
- repofolio 的差異化是 **一份設定檔 → 盤點、部署、網址存活、沉睡提醒、作品集、個人頁一次搞定**，而且：
  - 私有資訊（環境變數放哪、費用、網域到期）和公開展示**分開**，這點別人都沒做
  - 自動抓 GitHub Deployments 和 Vercel 網址、過濾掉一次性網址，對有很多 Vercel 專案的人特別有感

## 3. 受歡迎的共同特徵

1. **輸出會被別人看到，而且帶連結回來**（病毒迴圈）：統計卡、profile README 區塊。前三名都是這種
2. **零設定或一行設定**：貼一個 URL 或一個 workflow 就能用
3. **看得到的成果**：README 第一屏有截圖或 GIF
4. **解決一個說得出口的痛點**：「專案太多忘記哪個是幹嘛的」「Vercel 網址一堆不知道哪個還活著」
5. **持續有人維護**：前幾名最後推送時間都在近一個月內

## 4. 建議做法（已反映在 ROADMAP）

| 優先 | 做什麼 | 為什麼 |
|---|---|---|
| ★★★ | Profile README 區塊和 SVG 卡片，附「Built with repofolio」連結 | 走 github-readme-stats 和 blog-post-workflow 的病毒迴圈 |
| ★★★ | README 第一屏放作品集網站截圖和 CATALOG.md 截圖 | 第一印象 |
| ★★★ | 一行指令試用：`npx repofolio scan` 用 `gh` 的登入就能跑 | 降低門檻，不用先設 token（已實作） |
| ★★ | 線上 demo：用作者自己的帳號產生的作品集網站 | 拿自己當範例 |
| ★★ | 上架 GitHub Marketplace（Action）和 npm | 曝光管道 |
| ★★ | 投稿 awesome-actions、awesome-github-profile-readme 等清單 | 長期流量 |
| ★ | 作品集網站提供多種主題 | gitprofile 受歡迎的原因之一 |
| ★ | 「本週做了什麼」摘要和 LinkedIn 草稿（接原本的行銷規劃） | 跟第 1、2 項串起來 |

## 5. 推廣時機

等以下都完成再一次集中發文（Show HN、Reddit r/github r/SideProject、dev.to、PTT Soft_Job、Threads）：

- [ ] dist 打包並發 v0.1.0 tag，Action 可以直接 `uses:`
- [ ] 發佈到 npm，`npx repofolio scan` 可用
- [ ] README 有截圖和線上 demo
- [ ] 自己的 profile README 已經在用

## 6. 第二輪調查（2026-11-20）：作品集類工具

| 專案 | ⭐ | 最後推送 | 觀察 |
|---|---|---|---|
| imfunniee/gitfolio | ~6.9k | 2022-02 | 「用 GitHub 帳號產生個人網站」的始祖，**已停更近 4 年**，需求還在但沒人接手 |
| saadpasta/developerFolio | ~6.7k | 2024-12 | 模板型，要 fork 後手改程式碼；星星來自「好看」+「可客製」 |
| ashutosh1919/masterPortfolio | ~4.2k | 2026-01 | 同上，標語就是 “Complete Customizable” |
| arifszn/gitprofile | ~2.3k | 2026-11 | 自動同步 GitHub，但主題少、沒有盤點和部署 |
| magicuidesign/magicui | ~23k | 2026-11 | 動畫元件庫，證明「科技感動畫」本身就很吸引人 |
| seanwevans/braggard、svandragt/toolhub、MehdiRtal/Gitfolio | 0–1 | 2025–2026 | 最接近的新專案，功能陽春、沒有推廣 |

結論：

- **「自動同步」和「好看、可客製」兩種需求，目前沒有工具同時做好**：
  - 模板派（developerFolio、masterPortfolio）好看，但要手改程式碼，也不會自動更新
  - 產生器派（gitfolio、gitprofile）會自動更新，但外觀選擇少，gitfolio 還停更了
- repofolio 已經把兩邊合在一起：
  - 每晚自動同步
  - 10 個主題 × 7 種背景 × 5 種卡片 × 4 種版面，還有即時 ⚙ 面板和「複製成設定檔」
  - 再加上別人都沒有的盤點、部署和隱私分層

## 7. 已套用的改進（v0.2 雛形）

| 改進 | 對應的受歡迎因素 |
|---|---|
| 科技感作品集：粒子／合成波／數位雨／星際／電路／極光背景，3D 傾斜卡片，游標光框，打字動畫，終端機動畫，數字跑動，標題解碼效果 | 「看得到的成果」：截圖和 demo 一眼就吸引人 |
| 即時自訂面板 + 「複製成設定檔」 | 「可客製」是 developerFolio、masterPortfolio 拿星星的主因 |
| README 第一張截圖自動變成卡片封面 | 不用額外設定就很好看 |
| ⌘K 指令面板、鍵盤快捷鍵、隱藏彩蛋 | 開發者喜歡、會想分享 |
| 動態霓虹個人頁卡片（附 repofolio 字樣） | github-readme-stats 的病毒迴圈 |
| `projects.json` + `publish` 推進現有網站 | 降低採用門檻：不用換掉原本的個人網站 |
| `render` 指令：調外觀不用重掃 | 降低試用成本 |

## 8. 接下來還能做的

- 線上 demo：用作者自己的帳號部署一份，README 放連結和 GIF
- 主題投稿：開放社群送 PR 新增主題（gitprofile、metrics 都靠這個長期成長）
- 個人頁卡片多款式：語言、上線看板、精選專案
- 每週成果摘要 → LinkedIn、Dev.to 草稿（原本的行銷規劃）

## 9. 第三輪調查（2026-11-22）：自動發文

### 9.1 現有工具

| 工具 | 類型 | 做什麼 | 缺什麼 |
|---|---|---|---|
| [tgagor/action-crosspost](https://github.com/tgagor/action-crosspost) | 開源 Action | 部落格 RSS/sitemap → Bluesky、Mastodon、X、LinkedIn、Discord、Telegram、Dev.to | 只吃部落格，不懂 repo；沒有 LLM、沒有審核 |
| [publora-action](https://github.com/publora-team/publora-action) | Action + 付費 SaaS | release notes 直接變貼文，10 個平台 | 要 Publora 帳號，免費版每月 15 篇、不含 X |
| [humanwhocodes/social-changelog](https://github.com/humanwhocodes/social-changelog) | 開源 CLI | 用 LLM 把 release changelog 摘要成貼文 | 只產文字，不發布；只看單一 release |
| [Postiz](https://github.com/gitroomhq/postiz-app) | 開源排程器（~41k ⭐，AGPL） | 30+ 平台排程發文 | 要自架 Docker 服務；不是 GitHub 原生，不知道你的 repo 發生什麼 |
| [openpost](https://github.com/getopenpost/openpost) | 開源排程器 | release、RSS → 草稿 → 排程 | 同上，要架服務 |
| GitSocial、Makrly、Postezi、CodeToContent | 商業 SaaS | commit → build-in-public 貼文 | 付費、要把 repo 權限交給第三方 |

### 9.2 平台評估

| 平台 | 自動發布難度 | 成本 | 適合誰看 | 結論 |
|---|---|---|---|---|
| LinkedIn 個人頁 | 中：自建 App 加 Share on LinkedIn（自助開通，`w_member_social`）；token 60 天、自助 App 沒有 refresh token | 免費 | 招募、主管 | ★★★ 自動發，附到期提醒 |
| Bluesky | 低：app password | 免費 | 開發者 | ★★★ 自動發 |
| Mastodon | 低：個人 access token | 免費 | 開源圈 | ★★ 自動發 |
| Dev.to / Hashnode | 低：API key；可設 canonical_url 指回作品集 | 免費 | 開發者、SEO | ★★★ 長文，適合每週摘要和專案介紹 |
| Threads | 中：Meta App、`threads_content_publish`；發到自己帳號不用審核 | 免費 | 台灣使用者多 | ★★ 自動發 |
| Discord / Telegram | 極低：webhook / bot token | 免費 | 自己的社群 | ★ 自動發 |
| X | 中：2026-02 起免費層關閉，改按量計費，含連結的貼文每篇約 $0.20 | 付費 | 國外開發者 | ★ 預設只產草稿 + 預填發文連結，有 key 才自動發 |
| Reddit | 高：2025-11 起新 App 都要審核，個人腳本基本不會過 | 免費 | r/SideProject 等 | 只產草稿 + 預填 submit 連結 |
| Hacker News | 無 API | — | Show HN | 只產草稿 + 預填 submit 連結 |
| Medium | 2025 起不再發新 token | — | — | 不做；改用 Dev.to 的 canonical 轉載 |
| Facebook 個人頁、PTT | 無公開發文 API | — | 台灣 | 只產草稿，複製貼上 |

### 9.3 缺口和 repofolio 的做法

別人都只看「一個來源」：一篇部落格、一個 release。沒有工具知道你**所有 repo** 發生了什麼，也沒有工具把貼文和作品集接起來。

| 差異 | 做法 |
|---|---|
| 觸發來源最多 | 新專案出現、release、星星里程碑、新部署上線、每週「本週做了什麼」摘要。盤點層已經有這些資料 |
| 隱私安全 | 私有 repo 絕不進公開貼文；摘要裡只能寫「另外在 N 個私人專案上有進度」，而且要設定開啟 |
| 不用伺服器、不用 SaaS | 全部在 GitHub Action 裡跑，token 放 repo secret |
| 人工審核在 GitHub 裡 | 草稿開成 Issue，每個平台一段；直接改 Issue 內容就是改稿，留言 `/approve`（全部）或 `/approve linkedin bluesky`（部分）、`/skip` |
| 每個平台不同寫法 | LinkedIn 偏成果與學到什麼、Bluesky/X 短、Dev.to 長文、Threads 口語；中英文都能出。沒設 LLM key 就用模板 |
| 連結落地頁 | 每篇都連到作品集 `#/p/專案`，配專案封面圖當預覽圖，不是 README |
| 防重複、可回溯 | 已發過的事件記在 `data` 分支；同一件事不會發兩次 |
| 成效回饋（接 v0.4） | 記錄每篇貼文時間，和星星、流量變化對照，顯示在加密管理頁 |
| 平台限制透明 | X、Reddit、HN、PTT 這種不能免費自動發的，給「預填好的發文連結」，點一下就能送出 |
| token 維運 | LinkedIn token 到期前 7 天開 Issue 提醒，附重新授權步驟 |
