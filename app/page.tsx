"use client";
/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import CoachFlow from "@/app/coach-flow";
import MindMapView from "@/app/mind-map-view";
import AnalyticsDashboard from "@/app/analytics-dashboard";
import {
  BUNDLED_DATASET_ID,
  createUserDatasetId,
  normalizeCsvToCards,
} from "@/lib/learning/card-normalizer";
import { createInitialProgress, scheduleReview } from "@/lib/learning/scheduler";
import { createCoachDraft } from "@/lib/learning/coach";
import type { CoachDraft, CoachEvidence } from "@/lib/learning/coach";
import { buildAnalyticsSnapshot } from "@/lib/learning/analytics";
import type { AnalyticsSnapshot, AnalyticsWindow } from "@/lib/learning/analytics";
import { completeNodeProgress, startNodeProgress } from "@/lib/learning/mind-map";
import { buildMistakeQueue, buildTodayQueue } from "@/lib/learning/today-queue";
import type { StudyMode, TodayQueueSummary } from "@/lib/learning/today-queue";
import type { LearnerOutput, LearnerProfile, LearningGoal, LearnerLevel, MindMapNode, NodeProgress, Rating, ReviewEvent, WordCard } from "@/lib/learning/types";
import {
  ACTIVE_DATASET_META_KEY,
  LearningRepository,
  STORE_NAMES,
  openLearningDatabase,
} from "@/lib/storage/database";
import {
  LEGACY_PROGRESS_KEY,
  migrateLegacyLocalProgress,
  parseLegacyProgress,
  readCurrentUiState,
  writeCurrentUiState,
} from "@/lib/storage/legacy-migration";
import { createDefaultProfile, readLearnerProfile, saveLearnerProfile } from "@/lib/storage/profile-storage";
import { readCoachDraft, removeCoachDraft, writeCoachDraft } from "@/lib/storage/coach-draft-storage";

type Counts = Record<Rating, number>;

const INITIAL_COUNTS: Counts = { again: 0, hard: 0, good: 0, easy: 0 };
const CATEGORY_IMAGES: Record<string, string> = {
  "營運管理": "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=82",
  "辦公日常": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=82",
  "一般專業": "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=82",
  "人力資源": "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1200&q=82",
  "旅遊與交通": "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=82",
  "法務合規與安全": "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=82",
  "金融與會計": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=82",
  "科技與技術支援": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=82",
  "溝通互動": "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=82",
};
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=82";

const Icon = ({ name, size = 20 }: { name: "sound" | "upload" | "info" | "spark" | "close" | "settings"; size?: number }) => {
  const paths = {
    sound: <><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18 6a8.5 8.5 0 0 1 0 12"/></>,
    upload: <><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M5 14v5h14v-5"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7.5h.01"/></>,
    spark: <><path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3Z"/><path d="m18.5 14 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z"/></>,
    close: <><path d="m6 6 12 12"/><path d="M18 6 6 18"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
};

export default function Home() {
  const [allCards, setAllCards] = useState<WordCard[]>([]); const [cards, setCards] = useState<WordCard[]>([]); const [index, setIndex] = useState(0); const [revealed, setRevealed] = useState(false);
  const [counts, setCounts] = useState<Counts>(INITIAL_COUNTS); const [helpOpen, setHelpOpen] = useState(false); const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(""); const [error, setError] = useState(""); const [ratingPending, setRatingPending] = useState(false);
  const [profile, setProfile] = useState<LearnerProfile | null>(null); const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [studyMode, setStudyMode] = useState<StudyMode>("today"); const [modeLoading, setModeLoading] = useState(false); const [sessionComplete, setSessionComplete] = useState(false);
  const [nodeProgress, setNodeProgress] = useState<NodeProgress[]>([]);
  const [analyticsSnapshot, setAnalyticsSnapshot] = useState<AnalyticsSnapshot | null>(null);
  const [coachActive, setCoachActive] = useState(false); const [coachDraft, setCoachDraft] = useState<CoachDraft | null>(null);
  const [queueSummary, setQueueSummary] = useState<TodayQueueSummary>({ due: 0, dueMistakes: 0, newCards: 0, total: 0, suggestedLimit: 10 });
  const uploadRef = useRef<HTMLInputElement>(null); const repositoryRef = useRef<LearningRepository | null>(null); const sessionIdRef = useRef<string | null>(null); const ratingPendingRef = useRef(false); const allModeIndexRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      const storedProfile = readLearnerProfile(localStorage);
      const activeProfile = storedProfile ?? createDefaultProfile();
      setProfile(activeProfile);
      setOnboardingOpen(!storedProfile?.onboardingCompleted);
      const currentUiState = readCurrentUiState(localStorage);
      const legacyFallback = parseLegacyProgress(localStorage.getItem(LEGACY_PROGRESS_KEY) ?? "");
      const restored = currentUiState ?? legacyFallback;
      if (restored) {
        allModeIndexRef.current = restored.index;
        setCounts(restored.counts);
      }

      let repository: LearningRepository | null = null;
      try {
        const database = await openLearningDatabase();
        if (cancelled) { database.close(); return; }
        repository = new LearningRepository(database);
        repositoryRef.current = repository;
        const migration = await migrateLegacyLocalProgress(repository, localStorage);
        if (!currentUiState && migration.progress) {
          allModeIndexRef.current = migration.progress.index;
          setCounts(migration.progress.counts);
        }
      } catch {
        if (!cancelled) setNotice("本機學習資料庫暫時無法使用；本次仍可使用單字卡");
      }

      try {
        let loadedCards: WordCard[] = [];
        if (repository) {
          const activeDataset = await repository.get(STORE_NAMES.meta, ACTIVE_DATASET_META_KEY);
          const activeDatasetId = typeof activeDataset?.value === "string" ? activeDataset.value : BUNDLED_DATASET_ID;
          loadedCards = await repository.getCardsByDataset(activeDatasetId);
        }

        if (!loadedCards.length) {
          const response = await fetch("/business_english_vocab.csv");
          if (!response.ok) throw new Error("字庫載入失敗");
          const imported = normalizeCsvToCards(await response.text(), {
            datasetId: BUNDLED_DATASET_ID,
            sourceType: "bundled-csv",
          });
          loadedCards = imported.cards;
          if (repository) await repository.replaceAndActivateDataset(BUNDLED_DATASET_ID, loadedCards);
        }

        const progressRecords = repository ? await repository.getAllCardProgress() : [];
        const savedNodeProgress = repository ? await repository.getAllNodeProgress() : [];
        const today = buildTodayQueue(loadedCards, progressRecords, new Date(), activeProfile.dailyMinutes);
        if (!cancelled) {
          setAllCards(loadedCards);
          setCards(today.cards);
          setQueueSummary(today.summary);
          setNodeProgress(savedNodeProgress);
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "字庫載入失敗");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void initialize();
    return () => {
      cancelled = true;
      repositoryRef.current?.close();
      repositoryRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!loading && allCards.length) writeCurrentUiState(localStorage, {
      index: studyMode === "all" ? index : allModeIndexRef.current,
      counts,
    });
  }, [index, counts, loading, allCards.length, studyMode]);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (helpOpen) { if (event.key === "Escape") setHelpOpen(false); return; }
      if (onboardingOpen || sessionComplete || coachActive || !cards.length) return;
      if (event.code === "Space") { event.preventDefault(); setRevealed((value) => !value); }
      if (revealed && ["1", "2", "3", "4"].includes(event.key)) {
        const rating = ({ "1": "again", "2": "hard", "3": "good", "4": "easy" } as const)[event.key as "1" | "2" | "3" | "4"]; void rate(rating);
      }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  });

  const safeIndex = cards.length ? index % cards.length : 0; const displayPosition = cards.length ? safeIndex + 1 : 0; const card = cards[safeIndex];
  const example = useMemo(() => ({ english: card?.exampleEn || "—", chinese: card?.exampleZh || "" }), [card]); const progress = cards.length ? ((safeIndex + 1) / cards.length) * 100 : 0;

  function speak(text: string, event?: { stopPropagation(): void }) {
    event?.stopPropagation(); if (!("speechSynthesis" in window) || !text) { setNotice("此瀏覽器不支援語音播放"); return; }
    window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.lang = "en-US"; utterance.rate = 0.85;
    const voices = window.speechSynthesis.getVoices(); utterance.voice = voices.find((voice) => voice.lang.startsWith("en")) || null; window.speechSynthesis.speak(utterance);
  }
  async function rate(rating: Rating, coachEvidence?: CoachEvidence): Promise<boolean> {
    if (ratingPendingRef.current || !card) return false;
    ratingPendingRef.current = true;
    setRatingPending(true);
    setError("");

    try {
      const repository = repositoryRef.current;
      if (coachEvidence && !repository) {
        setError("AI 教練證據需要本機學習資料庫；草稿已保留，請稍後再試");
        return false;
      }
      if (repository) {
        const reviewedAt = new Date();
        const current = await repository.get(STORE_NAMES.cardProgress, card.id)
          ?? createInitialProgress(card.id, reviewedAt);
        const decision = scheduleReview(current, rating, reviewedAt);
        const sessionId = getSessionId();
        const completedProgress = {
          ...decision.progress,
          hintCount: coachEvidence?.hintCount ?? 0,
          currentCoachStep: coachEvidence ? 7 as const : decision.progress.currentCoachStep,
        };
        const event: ReviewEvent = {
          id: createEventId(),
          cardId: card.id,
          sessionId,
          rating,
          reviewedAt: reviewedAt.toISOString(),
          previousIntervalDays: decision.previousIntervalDays,
          nextIntervalDays: decision.nextIntervalDays,
          nextDueAt: decision.nextDueAt,
          hintCount: coachEvidence?.hintCount ?? 0,
          recallWithoutHint: coachEvidence?.recallWithoutHint ?? false,
        };
        const outputs = coachEvidence ? createCoachOutputs(card.id, sessionId, coachEvidence, reviewedAt) : [];
        await repository.recordReview(completedProgress, event, outputs);
      }

      setCounts((current) => ({ ...current, [rating]: current[rating] + 1 }));
      setIndex((current) => {
        if (current + 1 >= cards.length) {
          setSessionComplete(true);
          return current;
        }
        if (studyMode === "all") allModeIndexRef.current = current + 1;
        return current + 1;
      });
      setRevealed(false);
      return true;
    } catch {
      setError("評分尚未儲存，請再試一次；目前卡片不會跳到下一張");
      return false;
    } finally {
      ratingPendingRef.current = false;
      setRatingPending(false);
    }
  }
  async function applyStudyMode(nextMode: StudyMode, sourceCards = allCards, activeProfile = profile) {
    if (!activeProfile) return;
    setModeLoading(true); setError("");
    try {
      const progressRecords = repositoryRef.current ? await repositoryRef.current.getAllCardProgress() : [];
      let nextCards: WordCard[];
      if (nextMode === "today") {
        const today = buildTodayQueue(sourceCards, progressRecords, new Date(), activeProfile.dailyMinutes);
        nextCards = today.cards;
        setQueueSummary(today.summary);
      } else if (nextMode === "mistakes") {
        nextCards = buildMistakeQueue(sourceCards, progressRecords);
      } else if (nextMode === "mind-map") {
        nextCards = [];
        if (repositoryRef.current) setNodeProgress(await repositoryRef.current.getAllNodeProgress());
      } else if (nextMode === "analytics") {
        nextCards = [];
        const records = repositoryRef.current
          ? await repositoryRef.current.getAnalyticsRecords()
          : { cardProgress: progressRecords, reviewEvents: [], learnerOutputs: [], nodeProgress };
        setAnalyticsSnapshot(buildAnalyticsSnapshot(sourceCards, records, new Date(), analyticsSnapshot?.window ?? 7));
      } else {
        nextCards = sourceCards;
      }
      const nextIndex = nextMode === "all" && nextCards.length ? allModeIndexRef.current % nextCards.length : 0;
      setStudyMode(nextMode); setCards(nextCards); setIndex(nextIndex); setRevealed(false); setSessionComplete(false); setCoachActive(false); setCoachDraft(null);
    } catch {
      setError("無法建立學習任務，請重新整理後再試一次");
    } finally {
      setModeLoading(false);
    }
  }
  async function refreshAnalytics(window: AnalyticsWindow) {
    setModeLoading(true); setError("");
    try {
      const records = repositoryRef.current
        ? await repositoryRef.current.getAnalyticsRecords()
        : { cardProgress: [], reviewEvents: [], learnerOutputs: [], nodeProgress };
      setAnalyticsSnapshot(buildAnalyticsSnapshot(allCards, records, new Date(), window));
    } catch {
      setError("無法更新學習分析，請重新整理後再試一次");
    } finally {
      setModeLoading(false);
    }
  }
  function handleProfileComplete(next: LearnerProfile) {
    saveLearnerProfile(localStorage, next);
    setProfile(next); setOnboardingOpen(false);
    void applyStudyMode("today", allCards, next);
  }
  async function handleNodeStart(node: MindMapNode) {
    try {
      const current = nodeProgress.find(({ nodeId }) => nodeId === node.id);
      const next = startNodeProgress(current, node.id, new Date());
      if (repositoryRef.current) await repositoryRef.current.put(STORE_NAMES.nodeProgress, next);
      setNodeProgress((records) => replaceNodeProgress(records, next));
    } catch {
      setError("節點進度尚未保存，請再試一次");
    }
  }
  async function handleNodeComplete(node: MindMapNode, output?: string) {
    try {
      const now = new Date();
      const current = nodeProgress.find(({ nodeId }) => nodeId === node.id);
      const next = completeNodeProgress(current, node.id, now);
      const taskCard = allCards.length ? allCards[(node.order - 1) % allCards.length] : undefined;
      const evidence: LearnerOutput | undefined = taskCard ? {
        id: `node-output:${node.id}:${createEventId()}`,
        cardId: taskCard.id,
        sessionId: getSessionId(),
        type: node.taskType === "repeat" ? "repeat-confirmation" : node.taskType === "reorder" ? "reorder" : node.taskType === "write" ? "sentence" : "prediction",
        text: output,
        completed: true,
        createdAt: now.toISOString(),
      } : undefined;
      if (repositoryRef.current) await repositoryRef.current.recordNodeCompletion(next, evidence);
      setNodeProgress((records) => replaceNodeProgress(records, next));
    } catch {
      setError("節點任務尚未保存，請再試一次");
    }
  }
  function openCoach() {
    if (!card) return;
    const draft = readCoachDraft(localStorage, card.id) ?? createCoachDraft(card.id);
    setCoachDraft(draft); setCoachActive(true); setRevealed(false);
  }
  function saveCoachDraft(draft: CoachDraft) {
    writeCoachDraft(localStorage, draft);
    setCoachDraft(draft);
  }
  async function handleCoachRate(rating: Rating, evidence: CoachEvidence): Promise<boolean> {
    if (!card) return false;
    const cardId = card.id;
    const succeeded = await rate(rating, evidence);
    if (succeeded) {
      removeCoachDraft(localStorage, cardId);
      setCoachActive(false); setCoachDraft(null);
    }
    return succeeded;
  }
  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget; const file = input.files?.[0]; if (!file) return; setError("");
    file.text().then(async (text) => {
      try {
        const datasetId = createUserDatasetId(file.name);
        const imported = normalizeCsvToCards(text, { datasetId, sourceType: "user-csv" });
        if (repositoryRef.current) await repositoryRef.current.replaceAndActivateDataset(datasetId, imported.cards);
        allModeIndexRef.current = 0; setAllCards(imported.cards); setCounts(INITIAL_COUNTS);
        await applyStudyMode("today", imported.cards, profile ?? createDefaultProfile());
        const ignored = imported.skippedRows.length + imported.duplicateRows.length;
        setNotice(`已匯入 ${imported.cards.length.toLocaleString("zh-TW")} 張單字卡${ignored ? `，略過 ${ignored.toLocaleString("zh-TW")} 列` : ""}`);
      } catch (importError) {
        setError(importError instanceof Error ? importError.message : "CSV 解析失敗");
      } finally {
        input.value = "";
      }
    });
  }
  function getSessionId() {
    if (!sessionIdRef.current) sessionIdRef.current = `session:${createEventId()}`;
    return sessionIdRef.current;
  }
  function cardKeyDown(event: KeyboardEvent<HTMLDivElement>) { if (event.key === "Enter") setRevealed((value) => !value); }

  if (loading) return <main className="center-state"><div className="loader"/><p>正在載入 AI 英語方法教練…</p></main>;
  if (error && !allCards.length) return <main className="center-state"><div className="error-mark">!</div><h1>無法載入單字卡</h1><p>{error}</p><button className="primary-button" onClick={() => location.reload()}>重新載入</button></main>;

  return <main className="study-shell">
    <section className="study-app" aria-label="AI 英語方法教練">
      <header className="study-header">
        <div className="brand-block"><span className="eyebrow">AI ENGLISH METHOD COACH</span><span className="brand-title">AI 英語方法教練</span></div>
        <div className="session-status">
          <div className="numbers" aria-label={`目前第 ${displayPosition} 張，共 ${cards.length} 張`}><strong>{displayPosition.toLocaleString("zh-TW")} <span>/</span> {cards.length.toLocaleString("zh-TW")}</strong><span className="count count-again" title="Again 次數">{counts.again}</span><span className="count count-hard" title="Hard 次數">{counts.hard}</span><span className="count count-good" title="Good 次數">{counts.good}</span><span className="count count-easy" title="Easy 次數">{counts.easy}</span></div>
          <div className="progress-track" role="progressbar" aria-label="字卡進度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><div className="progress-value" style={{ width: `${progress}%` }}/></div>
        </div>
        <div className="header-actions"><input ref={uploadRef} type="file" accept=".csv,text/csv" onChange={handleUpload} hidden/><button className="icon-button" onClick={() => uploadRef.current?.click()} aria-label="上傳 CSV 字庫" title="上傳 CSV 字庫"><Icon name="upload"/></button><button className="icon-button" onClick={() => setOnboardingOpen(true)} aria-label="學習設定" title="學習設定"><Icon name="settings"/></button><button className="icon-button" onClick={() => setHelpOpen(true)} aria-label="使用說明" title="使用說明"><Icon name="info"/></button></div>
      </header>

      <nav className="mode-toolbar" aria-label="學習模式">
        <div className="mode-tabs">
          <ModeButton active={studyMode === "today"} disabled={modeLoading} onClick={() => void applyStudyMode("today")}>今日任務</ModeButton>
          <ModeButton active={studyMode === "mistakes"} disabled={modeLoading} onClick={() => void applyStudyMode("mistakes")}>錯題複習</ModeButton>
          <ModeButton active={studyMode === "all"} disabled={modeLoading} onClick={() => void applyStudyMode("all")}>全部單字</ModeButton>
          <ModeButton active={studyMode === "mind-map"} disabled={modeLoading} onClick={() => void applyStudyMode("mind-map")}>AI 學習地圖</ModeButton>
          <ModeButton active={studyMode === "analytics"} disabled={modeLoading} onClick={() => void applyStudyMode("analytics")}>學習分析</ModeButton>
        </div>
        {studyMode === "today" && <div className="queue-summary" aria-label="今日任務摘要"><span>到期 <b>{queueSummary.due}</b></span><span>錯題 <b>{queueSummary.dueMistakes}</b></span><span>新卡 <b>{queueSummary.newCards}</b></span></div>}
      </nav>

      {modeLoading ? <section className="task-state" aria-live="polite"><div className="loader small"/><p>正在建立學習任務…</p></section>
        : studyMode === "mind-map" ? <MindMapView progressRecords={nodeProgress} cards={allCards} onStart={handleNodeStart} onComplete={handleNodeComplete}/>
        : studyMode === "analytics" && analyticsSnapshot ? <AnalyticsDashboard snapshot={analyticsSnapshot} onWindowChange={(window) => void refreshAnalytics(window)}/>
        : coachActive && coachDraft && card ? <CoachFlow card={card} initialDraft={coachDraft} onDraftChange={saveCoachDraft} onExit={() => setCoachActive(false)} onSpeak={(text) => speak(text)} onRate={handleCoachRate}/>
        : sessionComplete ? <SessionComplete mode={studyMode} onRefresh={() => void applyStudyMode(studyMode)} onMistakes={() => void applyStudyMode("mistakes")}/>
        : !card ? <EmptyStudyState mode={studyMode} onToday={() => void applyStudyMode("today")} onAll={() => void applyStudyMode("all")}/>
        : <div className={`flashcard-wrap ${revealed ? "is-revealed" : ""}`} role="button" tabIndex={0} onClick={() => setRevealed((value) => !value)} onKeyDown={cardKeyDown} aria-label={revealed ? "點擊返回單字正面" : "點擊顯示答案"}>
        {!revealed ? <article className="flashcard front-card">
          <div className="front-topline"><span className="category-pill">{card.category}</span><span className="score-pill">LEVEL {card.scoreRange || "—"}</span></div>
          <div className="word-lockup"><h1>{card.word}</h1><button className="sound-button large" onClick={(event) => speak(card.word, event)} aria-label={`播放 ${card.word} 發音`}><Icon name="sound" size={30}/></button></div>
          <button className="coach-entry-button" onClick={(event) => { event.stopPropagation(); openCoach(); }}><Icon name="spark" size={18}/> AI 教練 7 步</button><div className="front-hint"><span className="keycap">SPACE</span> 顯示答案</div>
        </article> : <article className="flashcard back-card">
          <div className="image-frame">{/* Remote category photography intentionally stays a native responsive image. */}<img src={CATEGORY_IMAGES[card.category || ""] || FALLBACK_IMAGE} alt={`${card.word}：${card.category || "一般專業"}情境圖片`}/><div className="image-word"><span>{card.word}</span><span>{"★".repeat(card.stars || 0)}</span></div></div>
          <div className="answer-body"><div className="definition-line"><strong>{card.word}</strong> <span className="pos">({card.partOfSpeech || "—"})</span> {card.definitionZh}</div><Detail label="詞性變化" text={card.wordForms?.join("；") || "—"}/><Detail label="常用搭配" text={card.collocations?.join("；") || "—"}/><div className="example-box"><button className="sound-button" onClick={(event) => speak(example.english, event)} aria-label="播放英文例句"><Icon name="sound" size={20}/></button><div><p>{example.english}</p>{example.chinese && <p className="translation">{example.chinese}</p>}</div></div></div>
          <div className="rating-bar" aria-busy={ratingPending} onClick={(event) => event.stopPropagation()}><RatingButton label="Again" keyHint="1" tone="again" disabled={ratingPending} onClick={() => void rate("again")}/><RatingButton label="Hard" keyHint="2" tone="hard" disabled={ratingPending} onClick={() => void rate("hard")}/><RatingButton label="Good" keyHint="3" tone="good" disabled={ratingPending} onClick={() => void rate("good")}/><RatingButton label="Easy" keyHint="4" tone="easy" disabled={ratingPending} onClick={() => void rate("easy")}/></div>
        </article>}
      </div>}
      <footer className="study-footer">{studyMode === "mind-map" ? <><span><Icon name="spark" size={17}/> 點選任一節點開始微任務</span><span>節點進度會自動儲存在此裝置</span></> : studyMode === "analytics" ? <><span><Icon name="spark" size={17}/> 指標由可驗證學習紀錄計算</span><span>分析資料只保留在此裝置</span></> : coachActive ? <><span><Icon name="spark" size={17}/> 依序完成理解、回想與輸出</span><span>暫停後可從原步驟繼續</span></> : <><span><Icon name="spark" size={17}/> 點卡片或按 <span className="keycap">SPACE</span> 翻面</span><span>進度會自動儲存在此裝置</span></>}</footer>
    </section>
    {notice && <div className="toast" role="status" onAnimationEnd={() => setNotice("")}>{notice}</div>}
    {error && allCards.length > 0 && <div className="toast error-toast" role="alert">{error}<button onClick={() => setError("")} aria-label="關閉">×</button></div>}
    {helpOpen && <div className="modal-backdrop" onMouseDown={() => setHelpOpen(false)}><section className="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><span className="eyebrow">QUICK GUIDE</span><h2 id="help-title">使用說明</h2></div><button className="icon-button" onClick={() => setHelpOpen(false)} aria-label="關閉說明"><Icon name="close"/></button></div><ol className="help-steps"><li><b>看單字、聽發音</b><span>點藍色喇叭播放美式英文發音。</span></li><li><b>翻面核對答案</b><span>點卡片或按 Space，查看中文、詞性、搭配詞與例句。</span></li><li><b>評估熟悉程度</b><span>按 Again、Hard、Good、Easy，或使用數字鍵 1–4。</span></li><li><b>更換自己的字庫</b><span>點右上角上傳按鈕；CSV 欄位需與原始字庫一致。</span></li></ol><button className="primary-button full" onClick={() => setHelpOpen(false)}>開始學習</button></section></div>}
    {onboardingOpen && profile && <OnboardingModal initialProfile={profile} onComplete={handleProfileComplete} onClose={profile.onboardingCompleted ? () => setOnboardingOpen(false) : undefined}/>}
  </main>;
}

function Detail({ label, text }: { label: string; text: string }) { return <div className="detail-line"><span>{label}</span><p>{text}</p></div>; }
function createEventId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function replaceNodeProgress(records: NodeProgress[], next: NodeProgress): NodeProgress[] {
  const existingIndex = records.findIndex(({ nodeId }) => nodeId === next.nodeId);
  if (existingIndex < 0) return [...records, next];
  return records.map((record, index) => index === existingIndex ? next : record);
}

function createCoachOutputs(cardId: string, sessionId: string, evidence: CoachEvidence, createdAt: Date): LearnerOutput[] {
  const timestamp = createdAt.toISOString();
  const output = (type: LearnerOutput["type"], text?: string): LearnerOutput => ({
    id: `coach-output:${type}:${createEventId()}`,
    cardId,
    sessionId,
    type,
    text,
    completed: true,
    createdAt: timestamp,
  });
  const outputs: LearnerOutput[] = [];
  if (evidence.prediction) outputs.push(output("prediction", evidence.prediction));
  if (evidence.sentenceAnalysis) outputs.push(output("analysis", evidence.sentenceAnalysis));
  outputs.push(output("sentence", evidence.sentence));
  if (evidence.repeatConfirmed) outputs.push(output("repeat-confirmation"));
  return outputs;
}

function ModeButton({ active, disabled, onClick, children }: { active: boolean; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button className={`mode-button ${active ? "active" : ""}`} aria-pressed={active} disabled={disabled} onClick={onClick}>{children}</button>;
}

function SessionComplete({ mode, onRefresh, onMistakes }: { mode: StudyMode; onRefresh: () => void; onMistakes: () => void }) {
  const title = mode === "today" ? "今日任務完成" : mode === "mistakes" ? "本輪錯題複習完成" : "本輪單字完成";
  return <section className="task-state completion-state"><div className="completion-icon"><Icon name="spark" size={28}/></div><span className="eyebrow">SESSION COMPLETE</span><h2>{title}</h2><p>評分已寫入學習排程；到期時間會依 Again、Hard、Good、Easy 自動更新。</p><div className="state-actions"><button className="primary-button" onClick={onRefresh}>重新整理任務</button>{mode !== "mistakes" && <button className="secondary-button" onClick={onMistakes}>查看錯題</button>}</div></section>;
}

function EmptyStudyState({ mode, onToday, onAll }: { mode: StudyMode; onToday: () => void; onAll: () => void }) {
  const content = mode === "mistakes"
    ? { title: "目前沒有待處理錯題", text: "答錯的單字會自動進入這裡，熟練後便會移出。" }
    : mode === "today"
      ? { title: "今天的任務已完成", text: "目前沒有到期複習或可加入的新卡，可以瀏覽全部單字。" }
      : { title: "目前沒有可用單字", text: "請上傳符合格式的 CSV 字庫。" };
  return <section className="task-state"><div className="completion-icon quiet"><Icon name="spark" size={26}/></div><h2>{content.title}</h2><p>{content.text}</p><div className="state-actions">{mode !== "today" && <button className="primary-button" onClick={onToday}>回到今日任務</button>}{mode !== "all" && <button className="secondary-button" onClick={onAll}>瀏覽全部單字</button>}</div></section>;
}

function OnboardingModal({ initialProfile, onComplete, onClose }: { initialProfile: LearnerProfile; onComplete: (profile: LearnerProfile) => void; onClose?: () => void }) {
  const [level, setLevel] = useState<LearnerLevel>(initialProfile.level);
  const [goal, setGoal] = useState<LearningGoal>(initialProfile.goal);
  const [dailyMinutes, setDailyMinutes] = useState<5 | 10 | 15 | 20>(initialProfile.dailyMinutes);

  function complete() {
    const now = new Date().toISOString();
    onComplete({ ...initialProfile, level, goal, dailyMinutes, onboardingCompleted: true, updatedAt: now });
  }

  return <div className="modal-backdrop"><section className="onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="onboarding-title"><div className="modal-heading"><div><span className="eyebrow">PERSONAL LEARNING PATH</span><h2 id="onboarding-title">設定您的每日學習任務</h2></div>{onClose && <button className="icon-button" onClick={onClose} aria-label="關閉設定"><Icon name="close"/></button>}</div><p className="modal-intro">三項設定只用於安排字卡，不代表正式語言能力測驗。</p><ChoiceGroup legend="目前程度" value={level} onChange={(value) => setLevel(value as LearnerLevel)} options={[['beginner','初學'],['elementary','基礎'],['intermediate','中階'],['advanced','進階']]}/><ChoiceGroup legend="學習目標" value={goal} onChange={(value) => setGoal(value as LearningGoal)} options={[['business','商務溝通'],['exam-prep','英語檢定準備'],['daily','日常英語'],['teacher-custom','教師自訂']]}/><ChoiceGroup legend="每日時間" value={String(dailyMinutes)} onChange={(value) => setDailyMinutes(Number(value) as 5 | 10 | 15 | 20)} options={[['5','5 分鐘'],['10','10 分鐘'],['15','15 分鐘'],['20','20 分鐘']]}/><div className="onboarding-actions"><button className="secondary-button" onClick={() => { setLevel("elementary"); setGoal("business"); setDailyMinutes(10); const now = new Date().toISOString(); onComplete({ ...initialProfile, level: "elementary", goal: "business", dailyMinutes: 10, onboardingCompleted: true, updatedAt: now }); }}>使用預設設定</button><button className="primary-button" onClick={complete}>建立今日任務</button></div></section></div>;
}

function ChoiceGroup({ legend, value, options, onChange }: { legend: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) {
  return <fieldset className="choice-group"><legend>{legend}</legend><div>{options.map(([optionValue, label]) => <label key={optionValue} className={value === optionValue ? "selected" : ""}><input type="radio" name={legend} value={optionValue} checked={value === optionValue} onChange={() => onChange(optionValue)}/><span>{label}</span></label>)}</div></fieldset>;
}

function RatingButton({ label, keyHint, tone, disabled, onClick }: { label: string; keyHint: string; tone: Rating; disabled: boolean; onClick: () => void }) { return <button className={`rating-button ${tone}`} disabled={disabled} onClick={onClick}><span>{label}</span><small>{keyHint}</small></button>; }
