# 系統架構

## 1. 設計原則

1. **Local-first**：核心學習功能不依賴登入、後端或網路。
2. **Deterministic**：相同進度、評分與時間輸入必須得到相同排程結果。
3. **Evidence-based UI**：分析只計算已保存的評分、回想與輸出證據。
4. **No fabrication**：CSV 沒有提供的詞義、例句或語言資料不得自動臆造。
5. **Safe migration**：舊資料只做可證明的轉換，不把彙總次數偽裝成逐卡歷史。

## 2. 模組邊界

```text
React Views
  ├─ Flashcards
  ├─ Seven-step Coach
  ├─ Interactive Mind Map
  └─ Analytics Dashboard
            │
            ▼
Learning Domain (pure functions)
  ├─ CSV Normalization / Stable Card ID
  ├─ SRS Scheduler
  ├─ Today / Mistake Queue
  ├─ Coach State Machine
  ├─ Mind Map Model
  └─ Analytics Aggregation
            │
            ▼
Local Persistence
  ├─ IndexedDB Repository
  ├─ Atomic Transactions
  ├─ localStorage UI / Draft State
  └─ Legacy Migration
```

## 3. IndexedDB Stores

| Store | 主鍵 | 用途 |
|---|---|---|
| `cards` | `id` | 正規化字卡與資料集來源 |
| `cardProgress` | `cardId` | 熟練狀態、到期時間、間隔與錯題次數 |
| `reviewEvents` | `id` | 每次評分的不可變事件 |
| `learningSessions` | `id` | 學習工作階段 |
| `nodeProgress` | `nodeId` | 心智圖節點狀態與完成次數 |
| `learnerOutputs` | `id` | 預測、分析、造句、重組與跟讀證據 |
| `meta` | `key` | 目前資料集與 Migration 標記 |

## 4. 交易一致性

- 字卡評分、複習事件與 AI 教練輸出證據在同一筆交易寫入。
- 心智圖節點完成與節點輸出證據在同一筆交易寫入。
- 資料集替換與啟用狀態在同一筆交易完成。

任何一步失敗都不會讓 UI 跳到下一張卡，避免畫面顯示成功但資料未保存。

## 5. 分析公式

- **熟練度**＝目前資料集中 `mastered` 字卡數 ÷ 總字卡數。
- **現在到期**＝未熟練且 `dueAt <= now` 的字卡數。
- **無提示回想率**＝AI 教練完成評分中 `recallWithoutHint=true` 次數 ÷ AI 教練回想次數。
- **輸出證據**＝所選期間內 `completed=true` 的 learner outputs。
- **心智圖進度**＝12 個正式節點中狀態為 `completed` 的節點數。

分析會以目前資料集的 Card ID 過濾資料，避免舊字庫紀錄污染目前結果。
