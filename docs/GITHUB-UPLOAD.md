# GitHub 上傳指南

Repository 名稱：`ai-english-method-coach`

## 方式一：GitHub CLI 建立並上傳

在專案根目錄執行：

```bash
git init -b main
git add .
git commit -m "feat: initial public release"
gh auth login
gh repo create draiagent/ai-english-method-coach \
  --public \
  --source=. \
  --remote=origin \
  --push
```

設定 Description 與 Topics：

```bash
gh repo edit draiagent/ai-english-method-coach \
  --description "Local-first AI English learning coach with an interactive mind map, seven-step active-recall workflow, spaced repetition, output evidence, and learning analytics." \
  --add-topic education \
  --add-topic edtech \
  --add-topic language-learning \
  --add-topic english-learning \
  --add-topic active-recall \
  --add-topic spaced-repetition \
  --add-topic mind-map \
  --add-topic indexeddb \
  --add-topic local-first \
  --add-topic typescript \
  --add-topic react \
  --add-topic traditional-chinese
```

## 方式二：上傳至已建立的空白 Repo

先在 GitHub 建立 Public Repository，名稱填入 `ai-english-method-coach`，不要預先新增 README、`.gitignore` 或 License。接著執行：

```bash
git init -b main
git add .
git commit -m "feat: initial public release"
git remote add origin https://github.com/draiagent/ai-english-method-coach.git
git push -u origin main
```

## 上傳前確認

```bash
npm ci
npm run verify
git status
```

確認 Git 追蹤內容不包含：

- `node_modules/`
- `dist/`、`.next/`、`.wrangler/`
- `.openai/`、`.sites-runtime/`
- `.env` 或任何憑證
- 未取得公開授權的完整字庫

## 建議首版 Release

```bash
gh release create v0.1.0 \
  --title "AI English Method Coach v0.1.0" \
  --notes-file CHANGELOG.md
```
