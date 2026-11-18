# repofolio

**把你所有的 GitHub 專案整理好、展示出來、推廣出去。**

專案一多就會忘記：哪些還在線上？每個部署在哪？一堆 Vercel 網址哪個才是正式的？環境變數放在哪？`asa` 到底是做什麼的？repofolio 每天晚上掃描你所有的倉庫，把這些整理在同一個地方，再把能公開的部分變成作品集網站和個人頁區塊。

[English](README.md)

## 產出

| 檔案 | 給誰看 | 內容 |
|---|---|---|
| `CATALOG.md` | 你自己（放在私有的 hub repo） | 每個 repo 的摘要、狀態、技術、**部署位置與存活檢查**、外部服務、網域、環境變數名稱與存放位置、費用、下一步、健檢問題 |
| `site/index.html` | 所有人 | 可搜尋的作品集網站，只放公開專案，可部署到 GitHub Pages |
| `site/card.svg` | 所有人 | 個人頁的統計卡片 |
| `profile.md` | 所有人 | 精選專案清單，自動寫進個人頁 README 的標記區塊 |
| 沉睡提醒 issue | 你自己 | 「119 天沒更新，要繼續、標記完成，還是封存？」 |

## 功能

- **倉庫盤點**：你的所有 repo，加上指定的組織或額外 repo。從 `package.json`、`requirements.txt`、`pyproject.toml` 偵測技術
- **自動找出部署位置，完全不用設定**：
  - 來源包括 GitHub Deployments API（Vercel、Netlify 等會回報到這裡）、GitHub Pages、repo 的 Website 欄位、設定檔（`vercel.json`、`fly.toml`、`wrangler.toml`、`Dockerfile`…）和 workflow 裡的部署步驟
  - 有正式網址時，**自動排除每次部署產生的一次性網址**（例如 `app-3k2j9x8h1-team.vercel.app`）
- **網址存活檢查**：每個部署網址都會實際連一次，連不上就列為錯誤
- **健檢**：
  - 缺 README、description、topics、LICENSE
  - 有部署但沒填 Website 欄位
  - 網域快到期
  - **不小心把密鑰值貼進 metadata**
- **沉睡偵測**：超過 N 天沒推送、也沒標記完成或暫停，就會列出來，可以設定自動開 issue
- **AI 摘要（選用）**：用 Claude 幫每個 README 寫一句話摘要。以 README 的 hash 快取，只有 README 有改才會重新呼叫
- **隱私優先**：
  - 私有 repo 和私密欄位（env、services、domains、cost）永遠不會出現在公開網站
  - 如果 hub repo 是公開的，總覽裡也會一併移除
- 支援英文和繁體中文輸出

## 十秒試用

需要 Node 20 以上，並且已經用 `gh` 登入 GitHub：

```bash
npx repofolio scan --lang zh-TW
```

> 還沒發佈到 npm。在那之前請先 `git clone`、`npm install`、`npm run build`，再執行 `node dist/cli.js scan`。

## 每晚自動執行

1. 建一個**私有**的 hub repo，例如 `you/projects`
2. 在裡面執行：

   ```bash
   npx repofolio init-hub
   ```

3. 建立 fine-grained PAT：
   - 存取範圍選所有 repo
   - 權限全部唯讀：Contents、Metadata、Deployments、Pages
   - 存成 hub repo 的 `REPOFOLIO_TOKEN` secret
4. Settings → Pages → Source 選 GitHub Actions

`.project.yml` 的寫法、完整指令和比較表請看[英文版 README](README.md)。
