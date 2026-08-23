"use client";

import { useMemo, useState } from "react";
import {
  COACH_STEP_COUNT,
  buildCoachEvidence,
  canAdvanceCoachStep,
  getCoachHints,
  normalizeCoachStep,
} from "@/lib/learning/coach";
import type { CoachDraft, CoachEvidence } from "@/lib/learning/coach";
import type { Rating, WordCard } from "@/lib/learning/types";

interface CoachFlowProps {
  card: WordCard;
  initialDraft: CoachDraft;
  onDraftChange(draft: CoachDraft): void;
  onExit(): void;
  onSpeak(text: string): void;
  onRate(rating: Rating, evidence: CoachEvidence): Promise<boolean>;
}

const STEP_LABELS = ["情境啟動", "主動回想", "核心意象", "語言組塊", "例句拆解", "主動輸出", "自我評估"] as const;

export default function CoachFlow({ card, initialDraft, onDraftChange, onExit, onSpeak, onRate }: CoachFlowProps) {
  const [draft, setDraft] = useState(initialDraft);
  const [ratingPending, setRatingPending] = useState(false);
  const [localError, setLocalError] = useState("");
  const hints = useMemo(() => getCoachHints(card), [card]);
  const progress = (draft.step / COACH_STEP_COUNT) * 100;

  function update(patch: Partial<CoachDraft>) {
    const next = { ...draft, ...patch, updatedAt: new Date().toISOString() };
    setDraft(next);
    onDraftChange(next);
  }

  function nextStep() {
    if (!canAdvanceCoachStep(draft, card)) return;
    update({ step: normalizeCoachStep(draft.step + 1) });
  }

  function previousStep() {
    update({ step: normalizeCoachStep(draft.step - 1) });
  }

  async function submitRating(rating: Rating) {
    setLocalError("");
    setRatingPending(true);
    try {
      const succeeded = await onRate(rating, buildCoachEvidence(draft));
      if (!succeeded) setLocalError("評分尚未保存，您的教練草稿仍然保留。");
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "無法完成教練流程");
    } finally {
      setRatingPending(false);
    }
  }

  return <section className="coach-flow" aria-labelledby="coach-title">
    <header className="coach-header"><div><span className="eyebrow">AI COACH · STEP {draft.step} / {COACH_STEP_COUNT}</span><h2 id="coach-title">{STEP_LABELS[draft.step - 1]}</h2></div><button className="secondary-button compact" onClick={onExit}>暫停並返回</button><div className="coach-progress" role="progressbar" aria-label="AI 教練進度" aria-valuemin={1} aria-valuemax={7} aria-valuenow={draft.step}><i style={{ width: `${progress}%` }}/></div></header>

    <div className="coach-stage">
      {draft.step === 1 && <StepContext card={card}/>} 
      {draft.step === 2 && <StepRecall draft={draft} hints={hints} update={update}/>} 
      {draft.step === 3 && <StepCoreImage card={card}/>} 
      {draft.step === 4 && <StepChunks card={card} selected={draft.selectedChunk} onSelect={(selectedChunk) => update({ selectedChunk })}/>} 
      {draft.step === 5 && <StepAnalysis card={card} value={draft.sentenceAnalysis} onChange={(sentenceAnalysis) => update({ sentenceAnalysis })}/>} 
      {draft.step === 6 && <StepOutput card={card} sentence={draft.sentence} repeatConfirmed={draft.repeatConfirmed} onSentence={(sentence) => update({ sentence })} onRepeat={(repeatConfirmed) => update({ repeatConfirmed })} onSpeak={onSpeak}/>} 
      {draft.step === 7 && <StepRating card={card} draft={draft} pending={ratingPending} onRate={(rating) => void submitRating(rating)}/>} 
    </div>

    {localError && <p className="coach-error" role="alert">{localError}</p>}
    {draft.step < 7 && <footer className="coach-actions">{draft.step > 1 ? <button className="secondary-button" onClick={previousStep}>上一步</button> : <span/>}<button className="primary-button" disabled={!canAdvanceCoachStep(draft, card)} onClick={nextStep}>{draft.step === 6 ? "前往自我評估" : "下一步"}</button></footer>}
  </section>;
}

function StepContext({ card }: { card: WordCard }) {
  return <div className="coach-content"><span className="coach-kicker">先建立情境，不急著背答案</span><h3>{card.category || "一般專業"}</h3><p>想像您正在真實工作中遇到這張字卡。先找出人物、動作與場景，再開始回想。</p><div className="coach-fact-row"><span>學習目標</span><strong>辨認這個字會在哪裡被使用</strong></div></div>;
}

function StepRecall({ draft, hints, update }: { draft: CoachDraft; hints: [string, string, string]; update: (patch: Partial<CoachDraft>) => void }) {
  return <div className="coach-content"><span className="coach-kicker">答案揭露前，先留下一次回想證據</span><h3>剛才的英文單字是什麼？</h3><label className="coach-field"><span>輸入您的猜測</span><input value={draft.prediction} disabled={draft.predictionSkipped} onChange={(event) => update({ prediction: event.target.value, predictionSkipped: false })} autoComplete="off"/></label><div className="coach-hints">{hints.slice(0, draft.hintCount).map((hint) => <p key={hint}>{hint}</p>)}</div><div className="coach-inline-actions">{draft.hintCount < 3 && <button className="secondary-button" onClick={() => update({ hintCount: Math.min(3, draft.hintCount + 1) as CoachDraft["hintCount"] })}>顯示第 {draft.hintCount + 1} 層提示</button>}<button className="text-button" onClick={() => update({ prediction: "", predictionSkipped: !draft.predictionSkipped })}>{draft.predictionSkipped ? "改為自行輸入" : "不知道，先跳過"}</button></div>{draft.predictionSkipped && <p className="coach-note">跳過不會中斷學習，但不計為無提示回想成功。</p>}</div>;
}

function StepCoreImage({ card }: { card: WordCard }) {
  return <div className="coach-content reveal-content"><span className="coach-kicker">現在揭露答案並建立概念支點</span><h3>{card.word}</h3><p className="coach-definition">{card.definitionZh}</p><div className="core-image-box"><span>核心意象</span><strong>{card.coreImageZh || "這張字卡尚未提供核心意象"}</strong><small>{card.coreImageZh ? "把這個畫面和單字連在一起。" : "保留缺值，不以系統規則臆造內容。"}</small></div></div>;
}

function StepChunks({ card, selected, onSelect }: { card: WordCard; selected: string; onSelect: (value: string) => void }) {
  const chunks = card.collocations ?? [];
  return <div className="coach-content"><span className="coach-kicker">把單字和常用搭配視為一個單位</span><h3>選一組最想先學會的語塊</h3>{chunks.length ? <div className="chunk-options">{chunks.map((chunk) => <button key={chunk} className={selected === chunk ? "selected" : ""} aria-pressed={selected === chunk} onClick={() => onSelect(chunk)}>{chunk}</button>)}</div> : <div className="missing-content"><strong>尚未提供搭配詞</strong><span>本步驟可安全略過，不會自動拼湊內容。</span></div>}</div>;
}

function StepAnalysis({ card, value, onChange }: { card: WordCard; value: string; onChange: (value: string) => void }) {
  return <div className="coach-content"><span className="coach-kicker">看見句子的積木，而不是逐字翻譯</span><h3>主詞｜動作｜對象｜補充</h3>{card.exampleEn ? <><blockquote>{card.exampleEn}</blockquote><label className="coach-field"><span>用直線「｜」拆解您看到的句子結構</span><textarea rows={4} value={value} onChange={(event) => onChange(event.target.value)} placeholder="例如：主詞｜動作｜對象｜時間或地點"/></label><p className="coach-note">V1 保存您的拆解，不生成未經確認的文法答案。</p></> : <div className="missing-content"><strong>尚未提供英文例句</strong><span>本步驟可安全略過。</span></div>}</div>;
}

function StepOutput({ card, sentence, repeatConfirmed, onSentence, onRepeat, onSpeak }: { card: WordCard; sentence: string; repeatConfirmed: boolean; onSentence: (value: string) => void; onRepeat: (value: boolean) => void; onSpeak: (text: string) => void }) {
  return <div className="coach-content"><span className="coach-kicker">真正的掌握，要留下自己的輸出</span><h3>使用 {card.word} 寫一句話</h3><label className="coach-field"><span>您的英文句子</span><textarea rows={5} value={sentence} onChange={(event) => onSentence(event.target.value)} placeholder={`Write one sentence using “${card.word}”.`}/></label>{card.exampleEn && <div className="repeat-row"><button className="secondary-button" onClick={() => onSpeak(card.exampleEn || card.word)}>播放示範例句</button><label><input type="checkbox" checked={repeatConfirmed} onChange={(event) => onRepeat(event.target.checked)}/><span>我已完成一次跟讀</span></label></div>}</div>;
}

function StepRating({ card, draft, pending, onRate }: { card: WordCard; draft: CoachDraft; pending: boolean; onRate: (rating: Rating) => void }) {
  return <div className="coach-content rating-step"><span className="coach-kicker">根據實際回想難度評分，不是根據熟悉感</span><h3>{card.word}</h3><div className="evidence-summary"><span>提示使用 <strong>{draft.hintCount}</strong> 層</span><span>主動回想 <strong>{draft.predictionSkipped ? "跳過" : draft.prediction ? "完成" : "未完成"}</strong></span><span>造句 <strong>{draft.sentence ? "完成" : "未完成"}</strong></span><span>跟讀 <strong>{draft.repeatConfirmed ? "完成" : "未勾選"}</strong></span></div><div className="coach-rating-grid"><CoachRating label="Again" detail="需要重學" tone="again" disabled={pending} onClick={() => onRate("again")}/><CoachRating label="Hard" detail="仍不熟悉" tone="hard" disabled={pending} onClick={() => onRate("hard")}/><CoachRating label="Good" detail="基本掌握" tone="good" disabled={pending} onClick={() => onRate("good")}/><CoachRating label="Easy" detail="能自然使用" tone="easy" disabled={pending} onClick={() => onRate("easy")}/></div></div>;
}

function CoachRating({ label, detail, tone, disabled, onClick }: { label: string; detail: string; tone: Rating; disabled: boolean; onClick: () => void }) {
  return <button className={`coach-rating ${tone}`} disabled={disabled} onClick={onClick}><strong>{label}</strong><span>{detail}</span></button>;
}
