import type { MindMapNode, NodeProgress } from "./types";

export interface MindMapBranch {
  id: MindMapNode["branchId"];
  title: string;
  shortTitle: string;
  description: string;
}

export const MIND_MAP_BRANCHES: readonly MindMapBranch[] = [
  {
    id: "mindset",
    title: "環境營造與心態轉換",
    shortTitle: "心態與環境",
    description: "先把外語放進真實生活與工作情境，降低開口門檻。",
  },
  {
    id: "input",
    title: "深度理解與高效輸入",
    shortTitle: "理解與輸入",
    description: "用核心意象、語塊與適當難度，把單字連成可提取的知識。",
  },
  {
    id: "output",
    title: "實戰輸出與技術應用",
    shortTitle: "輸出與應用",
    description: "透過寫作、重組與模仿，把看得懂轉化為說得出、用得上。",
  },
] as const;

export const MIND_MAP_NODES: readonly MindMapNode[] = [
  {
    id: "context-switch", branchId: "mindset", title: "建立外語腦",
    summary: "短時間只用英文線索理解情境，練習切換語言模式。",
    whyItWorks: "先抓人物、動作與場景，可減少逐字翻譯造成的停頓。",
    taskType: "recognize", completionRule: { event: "context-recognized", minimumCount: 1 }, order: 1,
  },
  {
    id: "environment-loop", branchId: "mindset", title: "環境推動力",
    summary: "把單字放入會議、Email、電話或簡報等固定場景。",
    whyItWorks: "固定使用情境能建立清楚的提取線索，讓單字更容易被叫回來。",
    taskType: "select", completionRule: { event: "scene-selected", minimumCount: 1 }, order: 2,
  },
  {
    id: "task-learning", branchId: "mindset", title: "任務型學習",
    summary: "用完成一項小任務取代只計算閱讀時間。",
    whyItWorks: "可觀察的任務結果，比被動閱讀更能證明是否真正會用。",
    taskType: "write", completionRule: { event: "task-output-created", minimumCount: 1 }, order: 3,
  },
  {
    id: "simple-communication", branchId: "mindset", title: "接受精神年齡",
    summary: "先用簡單句把意思講清楚，再逐步增加精準度。",
    whyItWorks: "降低一開始就追求完美的壓力，能增加可持續的輸出次數。",
    taskType: "write", completionRule: { event: "simple-sentence-created", minimumCount: 1 }, order: 4,
  },
  {
    id: "core-image", branchId: "input", title: "核心意象",
    summary: "抓住單字背後最具體、最穩定的概念畫面。",
    whyItWorks: "意象是不同詞義之間的共同支點，能減少死背多條翻譯。",
    taskType: "reflect", completionRule: { event: "core-image-described", minimumCount: 1 }, order: 5,
  },
  {
    id: "language-chunks", branchId: "input", title: "語言組塊",
    summary: "把單字和經常一起出現的搭配詞視為一個單位。",
    whyItWorks: "直接提取完整語塊，比臨時逐字組句更自然、更快速。",
    taskType: "select", completionRule: { event: "chunk-reviewed", minimumCount: 1 }, order: 6,
  },
  {
    id: "nine-second-start", branchId: "input", title: "九秒記憶啟動",
    summary: "短暫預覽後遮住內容，立刻進行一次主動提取。",
    whyItWorks: "重點是提取練習與後續間隔複習，不宣稱九秒即可形成長期記憶。",
    taskType: "recognize", completionRule: { event: "quick-recall-attempted", minimumCount: 1 }, order: 7,
  },
  {
    id: "i-plus-one", branchId: "input", title: "i+1 選材",
    summary: "選擇比目前能力稍難、但仍有足夠線索理解的例句。",
    whyItWorks: "適量的新資訊能推動成長，又不會因負荷過高而放棄。",
    taskType: "recognize", completionRule: { event: "stretch-example-reviewed", minimumCount: 1 }, order: 8,
  },
  {
    id: "write-speak", branchId: "output", title: "寫作即高速口說",
    summary: "先寫出完整句子，再朗讀成為可重複使用的表達。",
    whyItWorks: "寫作讓結構可見，反覆朗讀則逐步縮短組句時間。",
    taskType: "write", completionRule: { event: "sentence-written", minimumCount: 1 }, order: 9,
  },
  {
    id: "block-building", branchId: "output", title: "區塊建築原則",
    summary: "以主詞、動作、對象與修飾語塊重組句子。",
    whyItWorks: "用積木式語塊建立句子，可避免中文逐字直譯。",
    taskType: "reorder", completionRule: { event: "blocks-reordered", minimumCount: 1 }, order: 10,
  },
  {
    id: "ai-pre-edit", branchId: "output", title: "AI 預編輯學習",
    summary: "翻譯前先整理想表達的角色、動作、對象與語氣。",
    whyItWorks: "先優化訊息結構，再轉換語言，可降低句意混亂。",
    taskType: "reflect", completionRule: { event: "message-structured", minimumCount: 1 }, order: 11,
  },
  {
    id: "imitation-speech", branchId: "output", title: "模仿與語音辨識",
    summary: "聽例句後跟讀，使用語音辨識是否能理解作為基本檢查。",
    whyItWorks: "模仿能同時練習節奏、連音與語塊；V1 不提供發音分數。",
    taskType: "repeat", completionRule: { event: "repeat-confirmed", minimumCount: 1 }, order: 12,
  },
] as const;

export function createAvailableNodeProgress(nodeId: string, now = new Date()): NodeProgress {
  const timestamp = validTimestamp(now);
  return { nodeId, state: "available", completionCount: 0, updatedAt: timestamp };
}

export function startNodeProgress(current: NodeProgress | undefined, nodeId: string, now = new Date()): NodeProgress {
  const timestamp = validTimestamp(now);
  if (current?.state === "completed") return { ...current, updatedAt: timestamp };
  return {
    ...(current ?? createAvailableNodeProgress(nodeId, now)),
    nodeId,
    state: "in_progress",
    updatedAt: timestamp,
  };
}

export function completeNodeProgress(current: NodeProgress | undefined, nodeId: string, now = new Date()): NodeProgress {
  const timestamp = validTimestamp(now);
  return {
    ...(current ?? createAvailableNodeProgress(nodeId, now)),
    nodeId,
    state: "completed",
    completionCount: (current?.completionCount ?? 0) + 1,
    lastCompletedAt: timestamp,
    updatedAt: timestamp,
  };
}

export function getMindMapCompletion(progressRecords: NodeProgress[]): { completed: number; total: number; percent: number } {
  const completedIds = new Set(progressRecords.filter(({ state }) => state === "completed").map(({ nodeId }) => nodeId));
  const completed = MIND_MAP_NODES.filter(({ id }) => completedIds.has(id)).length;
  const total = MIND_MAP_NODES.length;
  return { completed, total, percent: Math.round((completed / total) * 100) };
}

function validTimestamp(now: Date): string {
  if (Number.isNaN(now.getTime())) throw new RangeError("now must be a valid date");
  return now.toISOString();
}
