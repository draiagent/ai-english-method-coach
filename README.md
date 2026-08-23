# AI 英語方法教練

**AI English Method Coach**

[![CI](https://github.com/draiagent/ai-english-method-coach/actions/workflows/ci.yml/badge.svg)](https://github.com/draiagent/ai-english-method-coach/actions/workflows/ci.yml)
[![MIT License](https://img.shields.io/badge/License-MIT-2B6CB0.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.13.0-06B6D4.svg)](package.json)

AI 時代採 Codex Agent 生成的一套把「背單字」升級為「理解方法、主動回想、實際輸出與間隔複習」的開源英語學習工具。採 Local-first 架構，不需登入，也不依賴付費 AI API；學習紀錄保存在使用者自己的瀏覽器 IndexedDB。

> 產品核心：**看懂學習方法 → 完成七步教練流程 → 留下輸出證據 → 依表現安排複習。**

---

## 🔵 核心特色

- 三大學習主軸、12 個節點的響應式互動心智圖
- 每張字卡都有七步 AI 教練式流程
- 情境、結構、語意三層提示
- 答案揭露前的主動回想與預測
- 保存句型分析、造句、語塊重組與跟讀證據
- `Again`／`Hard`／`Good`／`Easy` 確定性間隔複習
- 首次程度、學習目標與每日時間設定
- 今日任務、到期複習、錯題複習與完整字庫模式
- 學習分析儀表板：熟練度、到期量、無提示回想率、輸出證據、心智圖進度
- CSV 字庫匯入、英文語音、鍵盤快捷鍵與響應式介面
- IndexedDB 本機保存與既有 `localStorage` 進度安全遷移

## 產品學習流程

```text
情境啟動
   ↓
回想與預測 ──→ 三層提示
   ↓
核心意象
   ↓
語言組塊
   ↓
例句拆解
   ↓
主動輸出 ──→ 保存學習證據
   ↓
自我評估 ──→ 間隔複習排程
```

## 三大方法主軸

| 主軸 | 節點 | 學習目的 |
|---|---|---|
| 環境營造與心態轉換 | 建立外語腦、環境推動力、任務型學習、接受精神年齡 | 降低切換與開口門檻 |
| 深度理解與高效輸入 | 核心意象、語言組塊、九秒記憶啟動、i+1 選材 | 建立可提取的理解線索 |
| 實戰輸出與技術應用 | 寫作即高速口說、區塊建築、AI 預編輯、模仿與語音辨識 | 把看得懂轉化為用得出 |

完整產品需求與驗收規格請見 [V1 PRD](docs/PRD.md)。

---

## 快速開始

### 環境需求

- Node.js `22.13.0` 或以上版本
- npm

### 安裝

```bash
git clone https://github.com/draiagent/ai-english-method-coach.git
cd ai-english-method-coach
npm install
npm run dev
```

依終端機顯示的本機網址開啟網站。

### 品質驗證

```bash
npm run verify
```

也可以分別執行：

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:smoke
```

### 正式建置與啟動

```bash
npm run build
npm start
```

---

## 使用方式

1. 首次進入設定程度、目標與每日學習時間。
2. 在「今日任務」完成到期卡與新卡。
3. 點選字卡上的「AI 教練 7 步」進行完整學習。
4. 使用三層提示，但盡量在提示前先主動回想。
5. 完成造句或其他輸出證據，再依實際表現評分。
6. 從「AI 學習地圖」練習 12 個方法節點。
7. 到「學習分析」檢查熟練度、到期量與真正的輸出紀錄。

### 快捷鍵

| 按鍵 | 功能 |
|---|---|
| `Space` | 翻開或關閉答案 |
| `1` | Again，需要重新學習 |
| `2` | Hard，仍不熟悉 |
| `3` | Good，基本掌握 |
| `4` | Easy，已經熟悉 |
| `Esc` | 關閉說明或對話框 |

---

## CSV 字庫

預設示範字庫位於 `public/business_english_vocab.csv`。第一列需包含：

```csv
單字,中文定義,星級,分數區間,分類,詞性,【詞性變化】,搭配詞,例句
```

必要欄位：`單字`、`中文定義`、`詞性`、`例句`。

```csv
inform,通知；告知,4,600-780,溝通互動,verb,"verb: inform, informs, informing, informed","inform someone of something","Please inform the manager if you are going to be late.
如果你會遲到，請通知經理。"
```

完整欄位規則與正規化說明請見 [CSV Schema](docs/CSV-SCHEMA.md)。

---

## 技術架構

```text
app/                    React UI 與互動流程
├── page.tsx            主頁、模式切換與整合
├── coach-flow.tsx      七步 AI 教練
├── mind-map-view.tsx   互動心智圖
└── analytics-dashboard.tsx

lib/learning/           純函式學習領域邏輯
lib/storage/            IndexedDB 與 localStorage
public/                 示範字庫與圖示
tests/                  單元、資料庫與 Smoke Tests
worker/                 Vinext 執行入口
docs/                   PRD、架構與資料規格
```

主要技術：TypeScript、React 19、Next.js 16 相容介面、Vinext、Vite、IndexedDB、Web Speech API、Vitest。

詳細說明請見 [系統架構](docs/ARCHITECTURE.md)。

## 資料與隱私

- 不要求登入或建立雲端帳號。
- 字庫、評分、排程、心智圖進度與輸出證據保存在目前裝置。
- 本專案不會主動把學習紀錄或匯入的 CSV 上傳到外部伺服器。
- 清除瀏覽器網站資料後，本機學習紀錄可能被移除。
- V1 不串接生成式 LLM，不會自動編造詞義、例句或批改結果。

## 測試範圍

- Card ID 與 CSV 正規化
- 間隔複習排程
- 今日任務與錯題佇列
- IndexedDB Schema、Migration 與原子交易
- `localStorage` 舊進度安全遷移
- 心智圖節點與完成進度
- 七步教練流程與草稿保存
- 學習分析指標
- 正式建置與首頁 Smoke Test

## GitHub 專案資訊

**Description**

```text
Local-first AI English learning coach with an interactive mind map, seven-step active-recall workflow, spaced repetition, output evidence, and learning analytics.
```

**建議 Topics**

```text
education edtech language-learning english-learning flashcards active-recall
spaced-repetition mind-map indexeddb local-first typescript react vitest
traditional-chinese
```

## 開源授權

程式碼與內附示範字庫採用 [MIT License](LICENSE)。使用者自行加入的資料不會自動取得相同授權，詳見 [DATA_NOTICE.md](DATA_NOTICE.md)。

本專案不收錄、重製或改寫任何第三方測驗機構的官方試題、答案、測驗說明、評分表、圖片或標誌，也不宣稱與任何測驗機構具有合作、授權、認證或背書關係。

## 參與專案

- 問題回報與功能建議：請建立 GitHub Issue。
- 程式貢獻：請閱讀 [CONTRIBUTING.md](CONTRIBUTING.md)。
- 安全性問題：請依 [SECURITY.md](SECURITY.md) 私下通報。

## 作者

**AI 教練益力康陳董**

- 企業 AI 導入與生成式 AI 教學
- 大學與產業業界講師
- 國家級高爾夫球教練
- CGM Coach 血糖教練
- GitHub：[@draiagent](https://github.com/draiagent)

## Roadmap

- 分數區間、分類與程度篩選
- 學習紀錄匯出、匯入與備份
- PWA 離線安裝
- 教師班級字庫與任務模板
- 可選用的雲端同步
- 經使用者明確授權後才啟用的生成式 AI 回饋
- 開源可公開教學與學習語言
