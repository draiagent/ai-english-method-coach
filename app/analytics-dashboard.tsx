"use client";

import type { AnalyticsSnapshot, AnalyticsWindow } from "@/lib/learning/analytics";

interface AnalyticsDashboardProps {
  snapshot: AnalyticsSnapshot;
  onWindowChange: (window: AnalyticsWindow) => void;
}

const WINDOW_OPTIONS: Array<{ value: AnalyticsWindow; label: string }> = [
  { value: 7, label: "7 日" },
  { value: 30, label: "30 日" },
  { value: "all", label: "全部" },
];

const OUTPUT_LABELS: Array<{ key: keyof Omit<AnalyticsSnapshot["outputs"], "total">; label: string }> = [
  { key: "prediction", label: "主動回想" },
  { key: "analysis", label: "句型分析" },
  { key: "sentence", label: "造句輸出" },
  { key: "reorder", label: "語塊重組" },
  { key: "repeat-confirmation", label: "跟讀確認" },
];

export default function AnalyticsDashboard({ snapshot, onWindowChange }: AnalyticsDashboardProps) {
  const activityMaximum = Math.max(1, ...snapshot.activity.map(({ reviews, outputs }) => reviews + outputs));
  const outputMaximum = Math.max(1, ...OUTPUT_LABELS.map(({ key }) => snapshot.outputs[key]));
  const periodLabel = snapshot.window === "all" ? "全部期間" : `最近 ${snapshot.window} 日`;

  return <section className="analytics-dashboard" aria-labelledby="analytics-title">
    <header className="analytics-heading">
      <div>
        <span className="eyebrow">LEARNING ANALYTICS</span>
        <h2 id="analytics-title">學習分析儀表板</h2>
        <p>目前學習狀態與 {periodLabel} 的可驗證練習紀錄。</p>
      </div>
      <div className="analytics-window" aria-label="分析期間">
        {WINDOW_OPTIONS.map((option) => <button
          key={String(option.value)}
          className={snapshot.window === option.value ? "active" : ""}
          aria-pressed={snapshot.window === option.value}
          onClick={() => onWindowChange(option.value)}
        >{option.label}</button>)}
      </div>
    </header>

    <div className="analytics-kpis">
      <MetricCard
        label="熟練度"
        value={`${snapshot.cards.masteryRate}%`}
        detail={`${snapshot.cards.mastered} / ${snapshot.cards.total} 張已熟練`}
        tone="indigo"
      />
      <MetricCard
        label="現在到期"
        value={snapshot.due.dueNow.toLocaleString("zh-TW")}
        detail={`逾期 ${snapshot.due.overdue}・今日排定 ${snapshot.due.today}`}
        tone="amber"
      />
      <MetricCard
        label="無提示回想率"
        value={snapshot.recall.attempts ? `${snapshot.recall.rate}%` : "—"}
        detail={snapshot.recall.attempts
          ? `${snapshot.recall.withoutHint} / ${snapshot.recall.attempts} 次 AI 教練回想`
          : "尚無 AI 教練回想紀錄"}
        tone="cyan"
      />
    </div>

    <article className="analytics-panel activity-panel">
      <div className="analytics-panel-heading">
        <div><span>ACTIVITY</span><h3>學習活動趨勢</h3></div>
        <div className="chart-legend"><span className="review-dot">評分</span><span className="output-dot">輸出</span></div>
      </div>
      {snapshot.activity.some(({ reviews, outputs }) => reviews || outputs)
        ? <div className="activity-chart" role="img" aria-label={`${periodLabel}每日評分與輸出證據數量`}>
          {snapshot.activity.map((point, index) => {
            const total = point.reviews + point.outputs;
            const showLabel = index === 0 || index === snapshot.activity.length - 1 || index === Math.floor(snapshot.activity.length / 2);
            return <div className="activity-column" key={point.date} title={`${point.label}：評分 ${point.reviews}，輸出 ${point.outputs}`}>
              <div className="activity-value">{total || ""}</div>
              <div className="activity-bar" style={{ height: `${Math.max(total ? 8 : 0, (total / activityMaximum) * 100)}%` }}>
                {total > 0 && <><i className="review-part" style={{ height: `${(point.reviews / total) * 100}%` }}/><i className="output-part" style={{ height: `${(point.outputs / total) * 100}%` }}/></>}
              </div>
              <small>{showLabel ? point.label : ""}</small>
            </div>;
          })}
        </div>
        : <EmptyAnalytics text={`${periodLabel}尚無評分或輸出紀錄；完成一張字卡後即可看到趨勢。`}/>} 
    </article>

    <div className="analytics-breakdown">
      <article className="analytics-panel mastery-panel">
        <div className="analytics-panel-heading"><div><span>CURRENT STATE</span><h3>熟練度與心智圖</h3></div></div>
        <div className="mastery-stack" aria-label="字卡熟練狀態分布">
          <div className="mastery-track">
            {(["new", "learning", "review", "mastered"] as const).map((state) => <i
              key={state}
              className={`mastery-${state}`}
              style={{ width: `${snapshot.cards.total ? (snapshot.cards[state] / snapshot.cards.total) * 100 : 0}%` }}
            />)}
          </div>
          <div className="mastery-labels">
            <span>新卡 <b>{snapshot.cards.new}</b></span><span>學習中 <b>{snapshot.cards.learning}</b></span>
            <span>複習中 <b>{snapshot.cards.review}</b></span><span>已熟練 <b>{snapshot.cards.mastered}</b></span>
          </div>
        </div>
        <div className="mindmap-analytics-heading"><strong>心智圖進度</strong><span>{snapshot.mindMap.completed} / {snapshot.mindMap.total} 節點</span></div>
        <div className="branch-progress-list">
          {snapshot.mindMap.branches.map((branch) => <div className="branch-progress-row" key={branch.id}>
            <div><span>{branch.title}</span><b>{branch.completed}/{branch.total}</b></div>
            <div role="progressbar" aria-label={`${branch.title}完成度`} aria-valuenow={branch.percent} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${branch.percent}%` }}/></div>
          </div>)}
        </div>
      </article>

      <article className="analytics-panel output-panel">
        <div className="analytics-panel-heading"><div><span>EVIDENCE</span><h3>輸出證據</h3></div><strong>{snapshot.outputs.total}</strong></div>
        {snapshot.outputs.total
          ? <div className="output-bars">
            {OUTPUT_LABELS.map(({ key, label }) => <div className="output-row" key={key}>
              <div><span>{label}</span><b>{snapshot.outputs[key]}</b></div>
              <div><i style={{ width: `${(snapshot.outputs[key] / outputMaximum) * 100}%` }}/></div>
            </div>)}
          </div>
          : <EmptyAnalytics text={`${periodLabel}尚無輸出證據；使用 AI 教練或完成心智圖任務即可累積。`}/>} 
      </article>
    </div>

    <p className="analytics-note">數據只讀取此裝置的 IndexedDB；「熟練度、到期量、心智圖」為目前狀態，其餘指標依所選期間計算。</p>
  </section>;
}

function MetricCard({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) {
  return <article className={`metric-card metric-${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

function EmptyAnalytics({ text }: { text: string }) {
  return <div className="analytics-empty"><span>尚無資料</span><p>{text}</p></div>;
}
