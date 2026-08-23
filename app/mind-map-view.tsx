"use client";

import { useMemo, useState } from "react";
import { MIND_MAP_BRANCHES, MIND_MAP_NODES, getMindMapCompletion } from "@/lib/learning/mind-map";
import type { MindMapNode, NodeProgress, WordCard } from "@/lib/learning/types";

interface MindMapViewProps {
  progressRecords: NodeProgress[];
  cards: WordCard[];
  onStart(node: MindMapNode): Promise<void>;
  onComplete(node: MindMapNode, output?: string): Promise<void>;
}

export default function MindMapView({ progressRecords, cards, onStart, onComplete }: MindMapViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [output, setOutput] = useState("");
  const [repeatConfirmed, setRepeatConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const progressByNode = useMemo(() => new Map(progressRecords.map((progress) => [progress.nodeId, progress])), [progressRecords]);
  const completion = getMindMapCompletion(progressRecords);
  const selectedNode = MIND_MAP_NODES.find(({ id }) => id === selectedId);
  const taskCard = selectedNode && cards.length ? cards[(selectedNode.order - 1) % cards.length] : undefined;

  async function selectNode(node: MindMapNode) {
    setSelectedId(node.id);
    setOutput("");
    setRepeatConfirmed(false);
    setSaving(true);
    try {
      await onStart(node);
    } finally {
      setSaving(false);
    }
  }

  async function completeNode() {
    if (!selectedNode) return;
    setSaving(true);
    try {
      await onComplete(selectedNode, output.trim() || undefined);
    } finally {
      setSaving(false);
    }
  }

  const needsText = selectedNode && ["write", "reflect", "reorder"].includes(selectedNode.taskType);
  const canComplete = Boolean(selectedNode) && (!needsText || Boolean(output.trim())) && (selectedNode?.taskType !== "repeat" || repeatConfirmed);

  return <section className="mind-map-view" aria-labelledby="mind-map-title">
    <header className="mind-map-heading">
      <div><span className="eyebrow">AI LEARNING MAP</span><h2 id="mind-map-title">多語學習三大核心策略</h2><p>選擇節點，完成一項 30–120 秒的微任務。</p></div>
      <div className="map-progress" aria-label={`心智圖完成 ${completion.completed}／${completion.total}`}><strong>{completion.percent}%</strong><span>{completion.completed}／{completion.total} 已完成</span><div><i style={{ width: `${completion.percent}%` }}/></div></div>
    </header>

    <div className="mind-map-tree">
      <div className="map-root"><span>AI 英語方法教練</span><small>理解・連結・輸出</small></div>
      <div className="map-branches">
        {MIND_MAP_BRANCHES.map((branch) => {
          const nodes = MIND_MAP_NODES.filter(({ branchId }) => branchId === branch.id);
          const branchDone = nodes.filter(({ id }) => progressByNode.get(id)?.state === "completed").length;
          return <article className={`map-branch branch-${branch.id}`} key={branch.id}>
            <header><div><span>{branch.shortTitle}</span><strong>{branch.title}</strong></div><small>{branchDone}/{nodes.length}</small></header>
            <p>{branch.description}</p>
            <div className="map-node-list">
              {nodes.map((node) => {
                const progress = progressByNode.get(node.id);
                const completed = progress?.state === "completed";
                return <button key={node.id} className={`map-node ${selectedId === node.id ? "selected" : ""} ${completed ? "completed" : ""}`} aria-pressed={selectedId === node.id} onClick={() => void selectNode(node)}><span className="node-status" aria-hidden="true">{completed ? "✓" : node.order}</span><span><strong>{node.title}</strong><small>{node.summary}</small></span></button>;
              })}
            </div>
          </article>;
        })}
      </div>
    </div>

    {selectedNode && <section className="node-task-panel" aria-live="polite" aria-labelledby="node-task-title">
      <div className="node-task-copy"><span className="eyebrow">MICRO TASK · {selectedNode.order.toString().padStart(2, "0")}</span><h3 id="node-task-title">{selectedNode.title}</h3><p>{selectedNode.summary}</p><div className="why-line"><strong>為什麼有效</strong><span>{selectedNode.whyItWorks}</span></div></div>
      <div className="node-task-action"><div className="task-word"><span>本次練習單字</span><strong>{taskCard?.word ?? "請先匯入字庫"}</strong><small>{taskCard?.definitionZh ?? "目前沒有可用字卡"}</small></div><p className="task-instruction">{getTaskInstruction(selectedNode, taskCard)}</p>{needsText && <label className="task-input"><span>寫下您的答案</span><textarea rows={3} value={output} onChange={(event) => setOutput(event.target.value)} placeholder="先求清楚，再求精準…"/></label>}{selectedNode.taskType === "repeat" && <label className="repeat-check"><input type="checkbox" checked={repeatConfirmed} onChange={(event) => setRepeatConfirmed(event.target.checked)}/><span>我已播放例句並完成一次跟讀</span></label>}<button className="primary-button full" disabled={!canComplete || saving || !taskCard} onClick={() => void completeNode()}>{saving ? "正在保存…" : progressByNode.get(selectedNode.id)?.state === "completed" ? "再完成一次" : "完成這項練習"}</button>{progressByNode.get(selectedNode.id)?.completionCount ? <small className="completion-note">已完成 {progressByNode.get(selectedNode.id)?.completionCount} 次</small> : null}</div>
    </section>}
  </section>;
}

function getTaskInstruction(node: MindMapNode, card?: WordCard): string {
  const word = card?.word ?? "這個單字";
  const example = card?.exampleEn;
  const collocation = card?.collocations?.[0];
  const instructions: Record<MindMapNode["id"], string> = {
    "context-switch": `先不看中文，根據詞性、分類與例句，判斷 ${word} 可能出現在哪種工作情境。`,
    "environment-loop": `替 ${word} 選擇一個最可能實際使用的場景：會議、Email、電話或簡報。`,
    "task-learning": `寫一句必須使用 ${word} 才能完成的工作指令或回覆。`,
    "simple-communication": `只用一個主詞、一個動作與一個對象，寫出包含 ${word} 的簡單句。`,
    "core-image": `不要抄中文翻譯，用自己的話描述 ${word} 最核心的動作、狀態或畫面。`,
    "language-chunks": collocation ? `讀出語塊「${collocation}」，觀察哪些字經常和 ${word} 一起出現。` : `查看 ${word} 的搭配詞欄位；若尚未提供，先標記待補資料。`,
    "nine-second-start": `看 ${word} 與定義九秒，移開視線後立刻回想；重點是主動提取，不是九秒保證記住。`,
    "i-plus-one": example ? `閱讀例句「${example}」，圈出已懂部分，再找出唯一需要新增理解的部分。` : `查看 ${word} 的例句；若尚未提供，先標記待補資料。`,
    "write-speak": `寫一個包含 ${word} 的完整句，完成後用正常速度朗讀一次。`,
    "block-building": `用「主詞｜動作｜對象｜補充」四個區塊，重組一個包含 ${word} 的句子。`,
    "ai-pre-edit": `翻成英文前，先寫出誰、做什麼、對誰、需要什麼語氣，再放入 ${word}。`,
    "imitation-speech": example ? `播放並跟讀「${example}」，模仿語塊停頓與句子節奏。` : `播放 ${word} 的發音並跟讀；本版只記錄完成，不提供發音分數。`,
  };
  return instructions[node.id];
}
