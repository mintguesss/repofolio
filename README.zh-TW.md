# repofolio

**你所有 GitHub 專案的自動推廣與管理系統。**

repofolio 是一個 GitHub Action，放在一個 repo 裡就能做三件事：

- **推廣**：新專案、新版本、星星里程碑、網站上線和每週摘要，都會自動寫成 LinkedIn、Threads、Bluesky、X、DEV、Hacker News、Reddit、PTT 等平台的貼文草稿。你在私人管理頁修改、核准，Action 用你自己的金鑰發出去。
- **管理**：所有 repo 一覽，包含私有的：部署在哪、還活著嗎、有哪些要修、哪些太久沒動、環境變數放哪、花多少錢，以及每個專案的競品分析和下一步建議。
- **展示**：能公開的部分變成有科技感的作品集網站、個人頁卡片和 `projects.json`，所有貼文也都連回這裡。

不需要伺服器或第三方服務：資料存在你 repo 的一個分支，含私有資料時會加密。Claude 是選用的：設了 `ANTHROPIC_API_KEY` 才會用它寫簡介、草稿和競品分析（Sonnet 5.5 每月約 1.5 美元，可設每月上限）；沒設就用模板和規則。

[English](README.md)

<p align="center"><img src="docs/screenshots/hero-simple.jpg" alt="簡潔模式（預設）" width="49%"> <img src="docs/screenshots/hero-cyber.jpg" alt="科技模式 cyber 主題" width="49%"></p>
<p align="center"><img src="docs/screenshots/projects-aurora.jpg" alt="專案列表" width="49%"> <img src="docs/screenshots/customizer-matrix.jpg" alt="即時自訂面板" width="49%"></p>
<p align="center"><img src="docs/screenshots/card-example.svg" alt="個人頁動態卡片"></p>

## 產出

| 檔案 | 給誰看 | 內容 |
|---|---|---|
| `CATALOG.md` | 你自己（放在私有的 hub repo） | 每個 repo 的摘要、狀態、技術、**部署位置與存活檢查**、外部服務、網域、環境變數名稱與存放位置、費用、下一步、健檢問題 |
| `site/index.html` | 所有人 | 有動畫、可換主題的作品集網站，只放公開專案。可以部署到 GitHub Pages，或直接推進你現有的網站 |
| `site/card.svg` | 所有人 | 個人頁用的動態霓虹統計卡片 |
| `site/projects.json` | 所有人 | 跟網站一樣的公開資料，讓你自己的網站讀取 |
| `profile.md` | 所有人 | 精選專案清單，自動寫進個人頁 README 的標記區塊 |
| 沉睡提醒 issue | 你自己 | 「119 天沒更新，要繼續、標記完成，還是封存？」 |

## 作品集網站

一個獨立的 `index.html`，不需要建置、不依賴框架。有兩種風格可以切換：

- **簡潔模式**（預設）：
  - 乾淨的字體排版，黑白配色加上一個強調色
  - 每個專案都有封面圖（README 截圖或 GitHub 預覽圖）
  - 淺色或深色跟隨系統，沒有特效
  - 看起來就像一個用心做的個人網站
- **科技模式**：
  - 10 種霓虹主題
  - 背景特效：粒子、合成波地平線、數位雨、星際穿梭、電路、極光
  - 光暈、3D 傾斜、游標光暈、打字動畫和終端機

頁面：

- **首頁**：自我介紹、最近更新的專案、精選作品、前往其他頁面的入口
- **專案**：
  - 搜尋、狀態篩選、可收合的技術篩選、排序
  - 兩種版面：卡片 grid、列表 list
  - 點卡片會開詳細視窗，可以直接分享連結（`#/p/名稱`）
- **統計**：
  - 專案數、上線數、進行中、星星、年提交、語言
  - 每週提交圖、最活躍的專案
  - 語言比例和技術雲
  - 專案狀態圓餅圖、部署平台、每年新開專案
  - 上線狀態看板
- **時間軸**：專案排在中央軸線兩側，會自己一直往下輪、無限循環，轉到中間的那個會亮起來；可以用滾輪、滑動、方向鍵或點擊切換，滑鼠移上去會暫停

其他功能：

- ⌘K 指令面板和鍵盤快捷鍵
- ⚙ 即時自訂面板：
  - 上方先選風格、配色、版面
  - 科技模式的特效全部收在一個「特效」群組裡
  - 調好後按「複製成設定檔」，貼進設定檔就好

### 客製化選項

| 項目 | 選項 |
|---|---|
| 風格 `mode` | simple（簡潔）、tech（科技） |
| 淺色或深色 `scheme`（簡潔模式） | auto、light、dark |
| 版面 `layout` | grid、list |
| 字型 `font` | sans、mono、display、system |
| 封面圖 `images` | 預設自動抓 README 截圖、repo 裡的截圖，再來是 GitHub 預覽圖；也可以在設定檔用 `images: { repo名稱: 圖片網址 }` 指定 |
| 其他 | 強調色 `accent`、背景顏色 `bgColor`（文字顏色會自動調整）、圓角、區塊順序與顯示、身分文字、頭像 |
| 科技模式的特效 | 主題 `preset`（10 種）、背景特效 `background`（7 種）、卡片樣式 `cardStyle`（5 種）、動畫 `animation`、光暈強度 `glow`、封面圖片、游標光暈、3D 傾斜、終端機 |

完整寫法請看[英文 README 的 Customization](README.md#customization)。只想調整外觀時，執行 `repofolio render`，會直接用 `out/inventory.json` 重新產生，不用重新掃描。

### 放進你現有的網站

```yaml
publish:
  repo: you/personal_web
  path: public/projects   # Next.js 靜態輸出的話放 public/ 底下
```

執行 `repofolio publish`，或讓 Action 自動處理：

- 只會提交 `index.html`、`card.svg`、`projects.json`
- 檔案沒變就不會產生 commit
- **永遠不會**推送 `inventory.json` 或 `CATALOG.md`

### 私有管理版

和公開網站長得一樣，但只有你看得到：包含私有 repo、每張卡片有健康分數、多一個「管理」頁列出要處理的事（最糟的在前面），專案詳情裡還有環境變數放在哪、下一步、費用。網站上沒有任何連結指向它，檔名由你自己取（`admin.page`）。

兩種保護方式：

- **加密、單一 repo**（推薦）：設定 `REPOFOLIO_ADMIN_PASSWORD` secret。管理頁會壓縮後用 AES-256-GCM 加密（金鑰由 PBKDF2-SHA256 跑 60 萬次推導），跟公開網站放在一起；你輸入密碼後由瀏覽器解密，可以記住推導出的金鑰（不會存密碼）。用 [`templates/site-workflow.yml`](templates/site-workflow.yml) 直接在你的網站 repo 裡跑，不需要另一個 repo，只要一把金鑰。密碼請用長一點的句子：加密檔是公開的，弱密碼可能被離線猜中，舊版本也會留在 git 歷史。
- **私有 repo**：沒設密碼時，會產生 `out/admin.html` 給私有 hub repo，公開的那一頁變成登入頁，用唯讀金鑰從 GitHub API 載入。

公開 repo 的執行紀錄是公開的，所以 Action 會遮蔽私有 repo 名稱、也不會印出來。不要管理版的話設 `admin: { enabled: false }`。

### 自動發文和競品分析

管理頁還有兩個分頁：

- **📣 發文**：新專案、新版本、星星里程碑、網站上線，以及每週「本週做了什麼」，都會自動寫成 LinkedIn、Bluesky、Threads、X、DEV、Mastodon、Discord、Telegram、Hacker News、Reddit、Facebook、PTT 的草稿（有 `ANTHROPIC_API_KEY` 就由 Claude 撰寫，否則用模板）。改好、勾選平台、按「核准並發布」，workflow 就用你自己的金鑰發出去。沒設金鑰的平台有複製按鈕和填好內容的分享連結。貼文連結指向每個專案的分享頁，預覽圖是專案封面。
- **🎯 競品**：每個專案在 GitHub 上的相似專案、你和它們的比較（星星、活躍度、demo、授權），以及下一步可以做什麼。

私有 repo 永遠不會出現在貼文裡。設定方式和各平台金鑰怎麼拿：[docs/PROMOTE.zh-TW.md](docs/PROMOTE.zh-TW.md)。

## 盤點功能

- **倉庫盤點**：你的所有 repo，加上指定的組織或額外 repo。從 `package.json`、`requirements.txt`、`pyproject.toml` 偵測技術
- **自動找出部署位置，完全不用設定**：
  - 來源包括 GitHub Deployments API、GitHub Pages、repo 的 Website 欄位、設定檔和 workflow 裡的部署步驟
  - 有正式網址時，自動排除每次部署產生的一次性網址
- **網址存活檢查**、**健檢**（缺 README、description、topics、LICENSE、網域快到期、密鑰誤貼）、**沉睡偵測**
- **AI 摘要（選用）**：用 Claude 幫每個 README 寫一句話摘要，依 README 的 hash 快取
- **隱私優先**：私有 repo 和私密欄位永遠不會出現在公開網站、卡片和 `projects.json`

## 十秒試用

需要 Node 20 以上，並且已經用 `gh` 登入 GitHub：

```bash
npx repofolio scan --lang zh-TW
```

> 還沒發佈到 npm。在那之前請先 `git clone`、`npm install`、`npm run build`，再執行 `node dist/cli.js scan`。

## 在你自己的 GitHub 上設定

**一步一步的教學：[docs/SETUP.zh-TW.md](docs/SETUP.zh-TW.md)**。內容包括建立 hub repo、兩個 token 怎麼設、網站要放哪裡、怎麼放到個人頁，以及常見問題。

`.project.yml` 的寫法、完整指令和比較表請看[英文版 README](README.md)。
