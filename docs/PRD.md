# AI English Method Coach V1

## 互動心智圖＋學習流程 PRD＋資料結構設計

| 欄位 | 內容 |
|---|---|
| 專案 | AI English Method Coach |
| 中文名稱 | AI 英語方法教練 |
| 文件版本 | V1.0 |
| 日期 | 2026-08-23 |
| 階段 | V1 規格基線；Step 2–7 已完成實作 |
| 文件目的 | 作為 Codex／Claude Code／開發者實作與驗收的唯一基準 |

---

## 實作狀態

| 階段 | 狀態 | 主要成果 |
|---|---|---|
| Step 1 | 完成 | 互動心智圖、學習流程 PRD 與資料結構 |
| Step 2 | 完成 | IndexedDB Schema、排程核心與單元測試 |
| Step 3 | 完成 | 穩定 Card ID、CSV 正規化與舊進度安全遷移 |
| Step 4 | 完成 | 程度／目標設定、今日任務、到期複習與錯題模式 |
| Step 5 | 完成 | 三大主軸、12 節點的響應式互動心智圖 |
| Step 6 | 完成 | 七步教練、三層提示、主動回想與輸出證據 |
| Step 7 | 完成 | 熟練度、到期量、回想率、輸出證據與心智圖儀表板 |

> 本文件保留原始需求與實作順序，作為設計決策紀錄；目前程式碼及自動化測試為實際行為的最終依據。

---

## 1. 執行摘要

現有產品已具備 CSV 字庫載入、單字翻卡、英文發音、中文定義、詞性變化、搭配詞、中英例句、四級熟悉度評估、鍵盤快捷鍵、學習進度保存與響應式介面。

V1 的目標不是再增加一張靜態心智圖，而是把「多語學習三大核心策略」轉化為可點擊、可執行、可記錄、可驗收的學習導航。每個單字都進入同一條學習循環：

> 情境啟動 → 理解意象 → 連結語塊 → 拆解例句 → 主動輸出 → 自我評估 → 間隔複習

V1 採本機優先（local-first）架構，不依賴帳號、後端或付費 AI API。系統提供規則式教練流程、分層提示及確定性複習排程；若字庫沒有某項內容，介面隱藏或明確標示「尚未提供」，不得臆造資料。

---

## 2. 問題定義

### 2.1 現況問題

傳統單字卡容易形成「看答案的熟悉感」，但不能證明學習者能在真實情境中辨認、回想與使用單字。現有 Again／Hard／Good／Easy 評分可記錄主觀熟悉度，但尚未形成：

- 可理解的學習方法地圖。
- 從輸入到輸出的固定流程。
- 依表現安排的複習時程。
- 心智圖節點與單字練習之間的連動。
- 可追蹤的節點完成度與能力證據。

### 2.2 核心假設

若學習者能看見「為何學、現在學哪一步、下一步做什麼」，並在看到答案前先完成回想與輸出，則能降低被動翻卡，增加實際使用與長期記憶。

### 2.3 產品一句話

> 將 AI 的語言學習思路視覺化，帶領學習者逐步理解、連結、輸出與複習商務英語。

---

## 3. V1 目標與非目標

### 3.1 產品目標

1. 將三大策略、十二個節點做成互動心智圖。
2. 讓心智圖成為學習路由器，而非裝飾性圖片。
3. 將每張單字卡串接七步教練式學習循環。
4. 將四級評分升級為可預測、可重現的間隔複習排程。
5. 保留現有 CSV 相容性及裝置端進度。
6. 讓使用者可依程度、目標與每日時間建立今日任務。
7. 在桌機與手機上提供一致且可及的操作。

### 3.2 成功指標

| 指標 | V1 驗收門檻 |
|---|---:|
| 新使用者完成首次引導 | 無需說明文件即可完成 |
| 心智圖節點可操作率 | 12/12 節點可開啟、收合與進入任務 |
| 七步學習循環完整率 | 100% 有效單字可完成 |
| 評分後排程正確率 | 100% 符合規則表 |
| 重新整理後進度保存 | 100% 保存有效紀錄 |
| 鍵盤可操作核心流程 | 100% 核心功能可完成 |
| 阻斷性錯誤 | 0 |

### 3.3 V1 非目標

- 不串接生成式 LLM 或付費 API。
- 不做自由對話型 AI 聊天室。
- 不做發音分數或音素級診斷。
- 不做帳號、跨裝置同步、班級或教師後台。
- 不自動生成未經確認的詞義、例句、翻譯或學習內容。
- 不改變既有 CSV 必填欄位，不強迫使用者重做字庫。

---

## 4. 目標使用者與工作任務

### 4.1 主要使用者

| 使用者 | 需求 | 成功狀態 |
|---|---|---|
| 商務英語自學者 | 每天用有限時間有效記憶 | 知道今天學什麼並完成到期複習 |
| 英語檢定準備者 | 依難度與分類累積字彙 | 能篩選分數區間並看見掌握度 |
| 大學教師與學生 | 使用同一套流程教學與自學 | 可匯入字庫並以任務練習 |
| 初學者 | 不知道如何開始或怎麼使用單字 | 能依分層提示完成第一個輸出 |

### 4.2 Jobs to Be Done

- 當我打開網站時，我想立即知道今天應學與應複習的內容。
- 當我看見陌生單字時，我想先理解具體畫面與常用語塊，而非只背翻譯。
- 當我不會回答時，我想逐層取得提示，而非立即看到答案。
- 當我完成評分時，我想讓系統安排合理的下次複習。
- 當我回到網站時，我想接續原本進度，而非重新開始。

---

## 5. 資訊架構

### 5.1 主導覽

| 頁面 | 用途 |
|---|---|
| 今日任務 | 顯示新學、到期複習、預估時間及開始按鈕 |
| 單字卡 | 保留原有翻卡模式，加入 AI 教練入口 |
| AI 學習地圖 | 顯示三大策略、十二節點、狀態與進度 |
| 錯題複習 | 集中 Again、連續答錯及逾期項目 |
| 學習分析 | 顯示完成量、到期量、熟練度與策略節點進度 |
| 設定 | 程度、目標、每日時間、語音及資料管理 |

### 5.2 首次引導

首次使用只要求三項設定，均可略過並使用預設值：

1. 程度：初學／基礎／中階／進階。
2. 目標：商務溝通／英語檢定準備／日常英語／教師自訂。
3. 每日時間：5／10／15／20 分鐘。

預設值為「基礎、商務溝通、10 分鐘」。設定只影響內容篩選及每日卡數，不宣稱等同正式語言能力測驗。

---

## 6. 互動心智圖規格

### 6.1 根節點

**多語學習三大核心策略**

### 6.2 三大主軸與十二節點

| 主軸 | 節點 ID | 顯示名稱 | V1 互動任務 |
|---|---|---|---|
| 環境營造與心態轉換 | `context-switch` | 建立外語腦 | 進入全英文微情境，先辨認關鍵資訊 |
| 環境營造與心態轉換 | `environment-loop` | 環境推動力 | 選擇會議、Email、電話、簡報等使用場景 |
| 環境營造與心態轉換 | `task-learning` | 任務型學習 | 用指定單字完成一個可判定的小任務 |
| 環境營造與心態轉換 | `simple-communication` | 接受精神年齡 | 先用簡單句完成意思，再逐步精煉 |
| 深度理解與高效輸入 | `core-image` | 核心意象 | 先看概念提示，再連結中文定義與例句 |
| 深度理解與高效輸入 | `language-chunks` | 語言組塊 | 選出或補完常用搭配詞 |
| 深度理解與高效輸入 | `nine-second-start` | 九秒記憶啟動 | 九秒預覽後遮住內容，立即提取；不宣稱九秒即可形成長期記憶 |
| 深度理解與高效輸入 | `i-plus-one` | i+1 選材 | 顯示比目前程度高一級、但有足夠線索的例句 |
| 實戰輸出與技術應用 | `write-speak` | 寫作即高速口說 | 先寫一句，再朗讀或播放示範音 |
| 實戰輸出與技術應用 | `block-building` | 區塊建築原則 | 使用語塊重組完整句，不逐字翻譯 |
| 實戰輸出與技術應用 | `ai-pre-edit` | AI 預編輯學習 | 先整理主詞、動作、對象與語氣，再進入英文表達 |
| 實戰輸出與技術應用 | `imitation-speech` | 模仿與語音辨識 | 聽例句、跟讀並自行確認是否完成；V1 不提供發音分數 |

### 6.3 節點狀態

每個節點只能處於下列其中一種狀態：

```text
locked → available → in_progress → completed
                         ↘ available（重新練習不會抹除歷史）
```

- V1 預設所有節點皆為 `available`，不以強制鎖定阻礙學習。
- 首次進入節點後為 `in_progress`。
- 完成該節點最低任務條件後為 `completed`。
- 完成後仍可重做，保留累積完成次數與最近完成時間。

### 6.4 節點卡內容

每個節點必須包含：

- 一句白話解釋。
- 為什麼有效。
- 30–120 秒可完成的操作任務。
- 完成條件。
- 返回地圖及繼續下一節點。
- 完成狀態、完成次數、最近完成日期。

### 6.5 互動行為

- 桌機：點擊節點展開側邊任務面板；再次點擊或按 `Esc` 關閉。
- 手機：點擊節點開啟底部抽屜，不依賴滑鼠懸停。
- 鍵盤：`Tab` 依可視順序移動，`Enter/Space` 開啟，`Esc` 關閉。
- 支援展開／收合三大主軸。
- 節點須顯示圖示、文字及狀態，不得只靠顏色辨識。
- 地圖縮放後仍能使用；手機可改用垂直樹狀清單呈現，不強制縮小整張圖。

---

## 7. 七步 AI 教練式學習流程

### 7.1 標準流程

| 步驟 | 名稱 | 使用者行為 | 系統行為 | 完成條件 |
|---:|---|---|---|---|
| 1 | 情境啟動 | 選擇或閱讀使用情境 | 顯示分類、任務與學習目標 | 點擊開始 |
| 2 | 回想與預測 | 在答案揭露前說出或輸入猜測 | 提供最多三層提示 | 提交猜測或選擇跳過 |
| 3 | 核心意象 | 閱讀核心概念及中文定義 | 顯示可靠資料；缺少時不生成 | 確認理解 |
| 4 | 語言組塊 | 選擇、配對或重組搭配詞 | 顯示搭配詞與結果 | 完成一題 |
| 5 | 例句拆解 | 辨認主詞、動作、對象、修飾 | 顯示句型區塊及雙語例句 | 完成拆解或查看解析 |
| 6 | 主動輸出 | 自己造句、重組句子或跟讀 | 本機保存輸入；V1 不做生成式批改 | 產生一項輸出證據 |
| 7 | 自我評估 | 選 Again／Hard／Good／Easy | 更新進度並排定下次複習 | 排程寫入成功 |

### 7.2 分層提示

答案揭露前提供最多三層提示：

1. **情境提示**：這個字常出現在哪種工作場景。
2. **結構提示**：詞性、字首字尾或句中位置。
3. **語意提示**：中文概念範圍或首字母。

每層提示都記錄使用次數；揭露完整答案後仍可完成學習，但不計為「無提示回想成功」。

### 7.3 退出與續學

- 使用者可在任一步驟退出。
- 系統保存目前單字、步驟及已完成的輸入。
- 下次進入可選擇「繼續」或「重新開始此卡」。
- 重新開始不刪除歷史評分或複習紀錄。

---

## 8. 今日任務與複習排程

### 8.1 今日任務組成

依序排列：

1. 已到期複習卡。
2. Again 錯題。
3. 尚未學習的新卡。

每日卡數預設換算：

| 每日時間 | 建議卡數 |
|---:|---:|
| 5 分鐘 | 5 張 |
| 10 分鐘 | 10 張 |
| 15 分鐘 | 15 張 |
| 20 分鐘 | 20 張 |

到期複習數高於建議卡數時，優先完成到期卡；介面顯示實際數量，不偷偷刪減。

### 8.2 V1 確定性排程規則

| 評分 | 新卡首次間隔 | 複習卡計算 | 其他變化 |
|---|---:|---:|---|
| Again | 10 分鐘 | 10 分鐘 | `streak=0`，錯題次數 +1 |
| Hard | 1 天 | `max(1 天, 原間隔 × 1.2)` | 熟練係數 -0.15 |
| Good | 3 天 | `max(3 天, 原間隔 × 2.2)` | 連續成功 +1 |
| Easy | 7 天 | `max(7 天, 原間隔 × 3.2)` | 連續成功 +1，熟練係數 +0.10 |

共同規則：

- 間隔以整數天保存，10 分鐘例外。
- 熟練係數範圍為 1.30–3.00，初始值 2.00。
- 同一裝置、同一時間輸入相同紀錄，必須產生相同結果。
- 連續三次 Good／Easy 且目前間隔至少 21 天，卡片狀態為 `mastered`。
- Again 後狀態回到 `learning`，但不刪除曾經 mastered 的歷史。
- 使用者裝置時間明顯倒退時，不產生負間隔；顯示時間異常提示。

### 8.3 卡片狀態

```text
new → learning → review → mastered
          ↑          ↓
          └─ Again ──┘
```

---

## 9. 功能需求清單

| ID | 功能 | 優先級 | 規格摘要 |
|---|---|---|---|
| FR-01 | 首次引導 | Must | 程度、目標、每日時間，可略過 |
| FR-02 | 今日任務 | Must | 到期、錯題、新卡排序及數量 |
| FR-03 | 互動心智圖 | Must | 三主軸、十二節點、展開收合 |
| FR-04 | 節點任務面板 | Must | 說明、任務、完成條件與狀態 |
| FR-05 | 七步教練流程 | Must | 每張有效單字皆可完成 |
| FR-06 | 三層提示 | Must | 揭露前逐層提示並記錄 |
| FR-07 | 間隔複習 | Must | 四級評分轉換為到期時間 |
| FR-08 | 錯題複習 | Must | Again 與連續答錯卡片清單 |
| FR-09 | 學習分析 | Must | 今日、累積、熟練、到期、節點進度 |
| FR-10 | CSV 向下相容 | Must | 舊 CSV 無需修改即可使用 |
| FR-11 | 本機續學 | Must | 重整及關閉後保留進度 |
| FR-12 | 資料匯出／重設 | Should | JSON 備份；重設需二次確認 |
| FR-13 | 分類與難度篩選 | Should | 使用現有分類、星級、分數區間 |
| FR-14 | 無障礙操作 | Must | 鍵盤、焦點、ARIA、非顏色單一提示 |
| FR-15 | 錯誤恢復 | Must | CSV 或儲存錯誤不可造成白畫面 |

---

## 10. 資料結構設計

### 10.1 儲存策略

V1 使用瀏覽器 `IndexedDB` 儲存大型字庫、學習進度、事件與輸出草稿；只將輕量介面設定保存在 `localStorage`。所有資料預設留在使用者裝置。

建議資料庫名稱：`ai-english-thinking-coach-v1`

建議物件儲存區：

| Store | Primary key | 用途 |
|---|---|---|
| `cards` | `id` | 正規化單字資料 |
| `cardProgress` | `cardId` | 每張卡目前狀態與排程 |
| `reviewEvents` | `id` | 不可變評分事件 |
| `learningSessions` | `id` | 學習工作階段及中斷續學 |
| `nodeProgress` | `nodeId` | 心智圖節點進度 |
| `learnerOutputs` | `id` | 造句、重組及跟讀完成證據 |
| `meta` | `key` | schema 版本與 migration 狀態 |

### 10.2 TypeScript 領域模型

```ts
type LearnerLevel = 'beginner' | 'elementary' | 'intermediate' | 'advanced';
type LearningGoal = 'business' | 'exam-prep' | 'daily' | 'teacher-custom';
type CardState = 'new' | 'learning' | 'review' | 'mastered';
type Rating = 'again' | 'hard' | 'good' | 'easy';
type NodeState = 'locked' | 'available' | 'in_progress' | 'completed';
type SessionStatus = 'active' | 'paused' | 'completed' | 'abandoned';

interface LearnerProfile {
  id: 'local-user';
  level: LearnerLevel;
  goal: LearningGoal;
  dailyMinutes: 5 | 10 | 15 | 20;
  preferredVoice?: string;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface WordCard {
  id: string;                    // normalized word + stable hash
  word: string;
  definitionZh: string;
  stars?: number;
  scoreRange?: string;
  category?: string;
  partOfSpeech?: string;
  wordForms?: string[];
  collocations?: string[];
  exampleEn?: string;
  exampleZh?: string;
  imageUrl?: string;

  // V1 optional enrichment; absent values must not be fabricated.
  coreImageZh?: string;
  sentencePattern?: string;
  taskPromptZh?: string;
  level?: LearnerLevel;

  source: {
    type: 'bundled-csv' | 'user-csv';
    datasetId: string;
    importedAt: string;
  };
}

interface CardProgress {
  cardId: string;
  state: CardState;
  dueAt?: string;
  intervalDays: number;
  easeFactor: number;
  streak: number;
  lapseCount: number;
  totalReviews: number;
  lastRating?: Rating;
  lastReviewedAt?: string;
  currentCoachStep?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  hintCount: number;
  wasEverMastered: boolean;
  updatedAt: string;
}

interface ReviewEvent {
  id: string;
  cardId: string;
  sessionId: string;
  rating: Rating;
  reviewedAt: string;
  previousIntervalDays: number;
  nextIntervalDays: number;
  nextDueAt: string;
  hintCount: number;
  recallWithoutHint: boolean;
}

interface MindMapNode {
  id: string;
  branchId: 'mindset' | 'input' | 'output';
  title: string;
  summary: string;
  whyItWorks: string;
  taskType: 'recognize' | 'select' | 'reorder' | 'write' | 'repeat' | 'reflect';
  completionRule: {
    event: string;
    minimumCount: number;
  };
  order: number;
}

interface NodeProgress {
  nodeId: string;
  state: NodeState;
  completionCount: number;
  lastCompletedAt?: string;
  updatedAt: string;
}

interface LearningSession {
  id: string;
  status: SessionStatus;
  mode: 'today' | 'deck' | 'mistakes' | 'mind-map';
  plannedCardIds: string[];
  currentIndex: number;
  currentCardId?: string;
  currentStep?: number;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
}

interface LearnerOutput {
  id: string;
  cardId: string;
  sessionId: string;
  type: 'prediction' | 'sentence' | 'reorder' | 'repeat-confirmation';
  text?: string;
  completed: boolean;
  createdAt: string;
}
```

### 10.3 舊 CSV 對應

| 既有欄位 | `WordCard` 欄位 | 規則 |
|---|---|---|
| 單字 | `word` | 必填；trim 後不得為空 |
| 中文定義 | `definitionZh` | 必填 |
| 星級 | `stars` | 可選；解析失敗設為 undefined |
| 分數區間 | `scoreRange` | 可選，保留原文字 |
| 分類 | `category` | 可選 |
| 詞性 | `partOfSpeech` | 可選 |
| 【詞性變化】 | `wordForms` | 可選；依安全分隔規則拆分 |
| 搭配詞 | `collocations` | 可選；依安全分隔規則拆分 |
| 例句 | `exampleEn`、`exampleZh` | 優先依換行分離；無法判定則保留原文，不猜譯 |

### 10.4 新增的可選 CSV 欄位

```csv
核心意象,句型模板,情境任務,學習程度
```

- 舊 CSV 不需要新增這些欄位。
- 欄位缺少時，對應步驟採既有定義、搭配詞及例句呈現。
- 無可靠內容時顯示「此字卡尚未提供這項學習內容」或略過該子任務。
- V1 不以規則拼湊假例句或假翻譯。

### 10.5 資料版本與遷移

- `schemaVersion = 1`。
- 每次啟動先檢查版本，再執行冪等 migration。
- 遷移前不得清除既有學習進度。
- 匯入相同 `datasetId` 時更新字卡內容，但保留相同 `cardId` 的進度。
- 若同字但資料來源不同，使用 `datasetId + normalizedWord` 產生穩定識別，避免互相覆寫。

---

## 11. 狀態、空值與錯誤處理

| 情境 | 預期行為 |
|---|---|
| CSV 缺少必要欄位 | 拒絕匯入並列出實際缺少欄位 |
| 個別資料列損壞 | 跳過該列並回報列號與原因，其餘資料仍可使用 |
| 沒有到期卡 | 顯示完成狀態，提供新卡或地圖練習入口 |
| 沒有搭配詞或雙語例句 | 清楚標示缺少，不生成替代內容 |
| 語音 API 不可用 | 隱藏／停用播放並顯示文字提示，不阻斷學習 |
| IndexedDB 寫入失敗 | 顯示可恢復錯誤，保留畫面資料並提供匯出 |
| 儲存資料版本較新 | 不嘗試降版覆寫，提示使用者更新應用程式 |
| 裝置時間倒退 | 不產生負間隔，顯示時間設定提示 |
| 所有卡片被篩除 | 顯示清除篩選按鈕，不呈現空白頁 |

---

## 12. 非功能需求

### 12.1 效能

- 需支援約 3 MB、28,000 筆等級的 CSV 字庫。
- CSV 解析不得凍結主執行緒超過 200 ms；大量解析應使用分批處理或 Web Worker。
- 心智圖展開、收合及切換的可感知反應時間應低於 100 ms。
- 清單採虛擬化或分頁，不一次渲染全部字卡。
- 初次匯入後使用 IndexedDB 快取；後續啟動不得每次重解析完整 CSV。

### 12.2 可及性

- 符合 WCAG 2.2 AA 的核心要求。
- 焦點可見、順序合理、按鈕具可讀名稱。
- 文字與背景對比至少 4.5:1。
- 狀態不得只用顏色表達。
- 支援 `prefers-reduced-motion`。
- 心智圖需提供等價的樹狀清單語意。

### 12.3 隱私與安全

- V1 不上傳 CSV、學習紀錄或造句內容。
- 不執行 CSV 內的 HTML 或 JavaScript。
- 顯示使用者內容時進行文字轉義。
- 匯出檔不包含瀏覽器或裝置識別資訊。
- 清除全部資料需顯示範圍與不可復原警告，並要求二次確認。

### 12.4 相容性

- 最新兩個主要版本的 Chrome、Edge、Safari、Firefox。
- 手機最小寬度 360 px。
- 沒有 Web Speech API 時仍可完成除發音外的全部流程。

---

## 13. 驗收標準

### 13.1 互動心智圖

**AC-01** Given 使用者進入 AI 學習地圖，When 頁面完成載入，Then 必須看見三大主軸及十二個節點。

**AC-02** Given 任一可用節點，When 使用者以滑鼠、觸控或鍵盤開啟，Then 顯示同一份說明、任務、完成條件與進度。

**AC-03** Given 使用者完成節點最低任務，When 系統寫入成功，Then 節點狀態改為 completed，完成次數加一並顯示最近完成時間。

**AC-04** Given 手機寬度 360 px，When 開啟地圖，Then 不得要求閱讀縮小到不可辨識的橫向全圖，必須提供可操作的垂直樹狀介面。

### 13.2 教練式學習流程

**AC-05** Given 一張有效單字卡，When 進入 AI 教練模式，Then 可依序完成七步流程，並能看見目前步驟及總步驟。

**AC-06** Given 尚未揭露答案，When 使用者要求提示，Then 依情境、結構、語意順序逐層顯示，且不提前顯示完整答案。

**AC-07** Given 字卡缺少核心意象、搭配詞或例句，When 進入相應步驟，Then 系統不得生成內容；必須明確標示缺少或安全略過。

**AC-08** Given 使用者在第 4 步離開，When 再次進入同一學習工作階段，Then 可從第 4 步繼續或選擇重新開始該卡。

**AC-09** Given 使用者完成主動輸出，When 進入評分步驟，Then 輸出證據已保存，且不以是否文法正確作為 V1 阻擋條件。

### 13.3 排程與進度

**AC-10** Given 新卡評為 Again，When 評分完成，Then `dueAt` 為評分時間後 10 分鐘、`streak=0`、`lapseCount+1`。

**AC-11** Given 新卡依序評為 Hard／Good／Easy，When 評分完成，Then首次間隔分別為 1／3／7 天。

**AC-12** Given 複習卡評分，When 計算新間隔，Then 結果完全符合第 8.2 節的倍率與下限規則。

**AC-13** Given 卡片連續三次 Good／Easy 且間隔至少 21 天，When 第三次評分完成，Then 狀態改為 mastered。

**AC-14** Given 有到期卡與新卡，When 建立今日任務，Then 到期卡排序在新卡之前。

**AC-15** Given 使用者重新整理或關閉後再開啟，When 本機儲存可用，Then 學習進度、到期日、節點狀態及未完成工作階段皆保留。

### 13.4 CSV 與錯誤恢復

**AC-16** Given 現有格式 CSV，When 匯入成功，Then 不要求新增 V1 可選欄位即可學習。

**AC-17** Given CSV 缺少「單字」或「中文定義」，When 匯入，Then 顯示缺少的欄位名稱且不覆寫目前可用字庫。

**AC-18** Given 部分資料列格式錯誤，When 匯入，Then 有效資料仍可載入，錯誤摘要包含列號與原因。

**AC-19** Given IndexedDB 或語音功能失敗，When 錯誤發生，Then 應用程式不得白畫面，使用者仍可閱讀現有卡片並看見處理方式。

### 13.5 可及性與效能

**AC-20** Given 只使用鍵盤，When 操作首頁、地圖、教練流程及評分，Then 所有核心任務皆可完成，焦點始終可見。

**AC-21** Given `prefers-reduced-motion: reduce`，When 使用介面，Then 翻卡與地圖動畫被關閉或顯著簡化。

**AC-22** Given 28,000 筆字庫，When 瀏覽、搜尋與切換卡片，Then 不一次渲染全部資料，互動期間無持續性卡頓。

### 13.6 資料控制

**AC-23** Given 使用者匯出資料，When 匯出成功，Then JSON 包含 schema 版本、設定、卡片進度、評分事件及節點進度，不包含裝置識別資訊。

**AC-24** Given 使用者選擇清除全部資料，When 尚未完成二次確認，Then 不得刪除任何資料。

---

## 14. 測試矩陣

| 測試層級 | 必測內容 |
|---|---|
| 單元測試 | 排程倍率、狀態轉換、CSV 欄位解析、穩定 ID、今日任務排序 |
| 元件測試 | 節點開關、提示層級、七步流程、四級評分、錯誤狀態 |
| 整合測試 | CSV → IndexedDB → 學習 → 評分 → 重整 → 續學 |
| 端對端測試 | 首次引導、今日任務、心智圖任務、錯題複習、匯出與重設 |
| 無障礙測試 | 鍵盤、焦點、螢幕閱讀器名稱、對比、減少動態效果 |
| 響應式測試 | 360、390、768、1024、1440 px |
| 大型資料測試 | 3 MB／28,000 筆 CSV 匯入、搜尋與切換 |

---

## 15. Definition of Done

V1 只有在以下條件全部成立時才視為完成：

- FR-01 至 FR-11、FR-14、FR-15 全部完成。
- AC-01 至 AC-24 全部通過並留有測試證據。
- 既有單字卡、語音、翻卡、CSV 匯入及快捷鍵沒有回歸錯誤。
- 桌機與手機皆完成實機或等價瀏覽器驗證。
- 大型字庫測試無阻斷性效能問題。
- 沒有把規則式功能誤稱為生成式 AI。
- README 更新功能、隱私、資料格式、限制及 V2 路線。
- 所有錯誤狀態均有使用者可理解的訊息，不出現白畫面。

---

## 16. 已確定的 V1 決策

| 決策 | 結論 | 理由 |
|---|---|---|
| 心智圖角色 | 學習路由器 | 避免只展示漂亮圖片而沒有學習行為 |
| AI 定義 | AI 學習思維與規則式教練 | 不依賴 API，功能可重現、可驗收 |
| 儲存方式 | IndexedDB＋少量 localStorage | 能承載大型字庫並保持本機隱私 |
| 複習方式 | 確定性間隔排程 | 能直接測試四級評分結果 |
| 舊資料相容 | 必須相容 | 不要求重建現有 28,000 筆字庫 |
| 缺少內容 | 隱藏或明確標示 | 絕不自行生成或腦補 |
| 手機心智圖 | 垂直樹狀版 | 保持可讀性與可操作性 |
| 帳號與雲端 | 不納入 V1 | 降低複雜度與隱私風險 |

---

## 17. Step 2 實作順序建議

1. 建立資料正規化、IndexedDB schema 與 migration。
2. 實作排程純函式及單元測試。
3. 建立首次引導與今日任務。
4. 建立響應式互動心智圖及十二節點內容。
5. 將七步教練流程接入既有單字卡。
6. 完成錯題複習與學習分析。
7. 補齊資料匯出、重設、錯誤恢復及可及性。
8. 執行回歸、端對端、大型資料與手機驗收。

Step 2 開始 Coding 前，開發者應先確認實際 Repo 技術棧、現有檔案結構及測試框架；若現況與本文件不同，先提出差異，不得自行替換框架或破壞既有功能。
