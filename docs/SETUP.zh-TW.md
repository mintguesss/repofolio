# 在你自己的 GitHub 上設定 repofolio

設定完成後，GitHub 每天晚上會自動：

1. 掃描你所有的 repo
2. 更新私有總覽 `CATALOG.md`
3. 重新產生作品集網站和個人頁卡片
4. 把網站推到你指定的位置

[English](SETUP.md)

---

## 0. 先在本機試試看（選用，約 2 分鐘）

需要 Node 20 以上，並且已經用 `gh auth login` 登入。

```bash
git clone https://github.com/mintguesss/repofolio
cd repofolio
npm install
npm run build
node dist/cli.js scan --lang zh-TW
```

跑完後打開 `out/site/index.html` 看網站，`out/CATALOG.md` 是完整的私有總覽。

調整外觀時不用重新掃描。改好 `repofolio.config.yml` 之後執行：

```bash
node dist/cli.js render
```

也可以直接在網站右上角的 ⚙ 調整，調好後按「複製成設定檔」。

---

## 1. 建立 hub repo

hub repo 是放設定檔、總覽和自動排程的地方。

1. 到 https://github.com/new 建一個 repo，例如 `projects`
2. 建議設成 **Private**，因為 `CATALOG.md` 會有私有專案的資料
   - 如果設成 Public，repofolio 會自動移除所有私有內容，只留下公開資訊
3. 在 hub repo 裡新增兩個檔案：

**`repofolio.config.yml`**：最小範例如下，完整選項見 [examples/repofolio.config.yml](../examples/repofolio.config.yml)

```yaml
language: zh-TW
site:
  hero:
    roles: [全端工程師, 喜歡做小工具]
  links:
    - { label: LinkedIn, url: https://www.linkedin.com/in/你的帳號 }
  theme:
    mode: simple         # 簡潔模式；想要科技感改成 tech
```

**`.github/workflows/repofolio.yml`**：直接下載範本

```bash
mkdir -p .github/workflows
curl -o .github/workflows/repofolio.yml https://raw.githubusercontent.com/mintguesss/repofolio/main/templates/hub-workflow.yml
```

---

## 2. 建立讀取用的 token（必要）

1. 打開 https://github.com/settings/personal-access-tokens/new
2. 依下表設定：

   | 欄位 | 設定 |
   |---|---|
   | Token name | `repofolio-read` |
   | Expiration | 選久一點，例如 1 年；到期前 GitHub 會寄信提醒 |
   | Repository access | **All repositories** |
   | Permissions → Repository | **Contents**、**Metadata**、**Deployments**、**Pages** 全部選 **Read-only** |

3. 產生 token 並複製
4. 到 hub repo 的 **Settings → Secrets and variables → Actions → New repository secret**
   - Name 填 `REPOFOLIO_TOKEN`
   - Value 貼上 token

---

## 3. 選擇網站要放在哪裡

### 做法 A：推進你現有的個人網站（推薦）

適合已經有 `你/你.github.io` 或其他已經開好 Pages 的**公開** repo。

1. 在 `repofolio.config.yml` 加上：

   ```yaml
   publish:
     repo: 你的帳號/你的網站repo     # 例如 mintguesss/personal_web
     path: public/repofolio         # Next.js 放 public/ 底下；純靜態網站可以直接寫 projects
     # branch: main                 # 不寫就用該 repo 的預設分支
   site:
     url: https://你的帳號.github.io/你的網站repo/repofolio/
   ```

2. 再建一個**只能寫入那個 repo** 的 token。跟讀取 token 分開，萬一外洩，影響範圍也只有那個 repo：
   - Repository access：**Only select repositories**，只選你的網站 repo
   - Permissions：**Contents** 選 **Read and write**
   - 存成 hub repo 的 secret，名稱 `REPOFOLIO_PUBLISH_TOKEN`

3. 每次更新只會提交 `index.html`、`card.svg`、`projects.json` 三個檔案：
   - 內容沒變就不會產生 commit
   - 你的網站原本的部署流程會接著把它發佈出去

### 做法 B：用 hub repo 自己的 GitHub Pages

1. hub repo 的 **Settings → Pages → Source** 選 **GitHub Actions**
2. **Settings → Secrets and variables → Actions → Variables** 新增 `REPOFOLIO_PAGES`，值填 `true`
3. 注意：私有 repo 要開 Pages 需要 GitHub Pro

---

## 4. 第一次執行

1. 到 hub repo 的 **Actions → repofolio → Run workflow**
2. 跑完後檢查：
   - hub repo 多了 `CATALOG.md`
   - 用做法 A 的話，網站 repo 多了一個 commit；等網站自己部署完，就能打開 `site.url`

之後每天台灣時間早上 10:17（UTC 02:17）會自動跑一次。要改時間的話，修改 workflow 裡的 `cron`。

---

## 5. 放到 GitHub 個人頁

在你的個人頁 repo（跟帳號同名的 repo，例如 `mintguesss/mintguesss`）的 `README.md` 加上：

```markdown
[![My projects](https://你的網站網址/repofolio/card.svg)](https://你的網站網址/repofolio/)
```

卡片會每天自動更新，上面有專案數、上線數、星星、提交數、語言比例，還有動畫。

---

## 6. 在各個專案補充資料（選用，但很有用）

在任何 repo 的根目錄放一個 `.project.yml`，記錄 GitHub 不知道的事。產生範本的方法：

```bash
node /path/to/repofolio/dist/cli.js init      # 在專案資料夾執行，會讀 .env.example 等檔案預先填好
```

常用欄位：

```yaml
summary: 一句話介紹
featured: true                 # 放進精選
image: https://…/screenshot.png  # 卡片封面；不寫就用 README 第一張圖
deployments:
  - { name: production, provider: vercel, url: https://…, dashboard: https://vercel.com/… }
env:
  location: "Vercel env + 1Password › Dev"
  vars: [SUPABASE_URL]         # 只寫名稱，不要寫值
```

`env`、`services`、`domains`、`cost` 只會出現在私有的 `CATALOG.md`，**永遠不會**出現在公開網站。

---

## 常見問題

- **網站上看不到某個專案**：
  - 私有 repo 預設不會公開
  - fork、跟帳號同名的個人頁 repo、名稱結尾是 `-backup`、`_old` 的 repo 也會被排除
  - 要強制顯示，在那個 repo 的 `.project.yml` 寫 `showcase: true`
- **某個專案不想公開**：在 `.project.yml` 寫 `showcase: false`，或在設定檔的 `exclude` 加上 repo 名稱
- **publish 失敗，出現 403**：發佈 token 沒有那個 repo 的 Contents 寫入權限
- **活動圖是空的**：GitHub 第一次計算統計資料需要時間，隔天通常就會出現
