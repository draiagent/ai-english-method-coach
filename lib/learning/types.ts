export type LearnerLevel = "beginner" | "elementary" | "intermediate" | "advanced";
export type LearningGoal = "business" | "exam-prep" | "daily" | "teacher-custom";
export type CardState = "new" | "learning" | "review" | "mastered";
export type Rating = "again" | "hard" | "good" | "easy";
export type NodeState = "locked" | "available" | "in_progress" | "completed";
export type SessionStatus = "active" | "paused" | "completed" | "abandoned";

export interface LearnerProfile {
  id: "local-user";
  level: LearnerLevel;
  goal: LearningGoal;
  dailyMinutes: 5 | 10 | 15 | 20;
  preferredVoice?: string;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WordCard {
  id: string;
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
  coreImageZh?: string;
  sentencePattern?: string;
  taskPromptZh?: string;
  level?: LearnerLevel;
  source: {
    type: "bundled-csv" | "user-csv";
    datasetId: string;
    importedAt: string;
  };
}

export interface CardProgress {
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

export interface ReviewEvent {
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

export interface MindMapNode {
  id: string;
  branchId: "mindset" | "input" | "output";
  title: string;
  summary: string;
  whyItWorks: string;
  taskType: "recognize" | "select" | "reorder" | "write" | "repeat" | "reflect";
  completionRule: {
    event: string;
    minimumCount: number;
  };
  order: number;
}

export interface NodeProgress {
  nodeId: string;
  state: NodeState;
  completionCount: number;
  lastCompletedAt?: string;
  updatedAt: string;
}

export interface LearningSession {
  id: string;
  status: SessionStatus;
  mode: "today" | "deck" | "mistakes" | "mind-map";
  plannedCardIds: string[];
  currentIndex: number;
  currentCardId?: string;
  currentStep?: number;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface LearnerOutput {
  id: string;
  cardId: string;
  sessionId: string;
  type: "prediction" | "analysis" | "sentence" | "reorder" | "repeat-confirmation";
  text?: string;
  completed: boolean;
  createdAt: string;
}

export interface MetaRecord {
  key: string;
  value: unknown;
  updatedAt: string;
}
