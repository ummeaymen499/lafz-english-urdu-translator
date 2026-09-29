"use client";

import { Check, Clock3, Eraser, History, Search } from "lucide-react";
import { useState } from "react";
import { useWorkspace } from "@/lib/workspace-context";

type JournalFilter = "all" | "review" | "approved" | "logged";

export default function JournalPage() {
  const { history, averageFluency, averageAdequacy, clearJournal, submitReview } = useWorkspace();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<JournalFilter>("all");
  const entries = [...history].reverse();
  const needsReviewCount = history.filter((entry) => entry.reviewStatus === "pending").length;
  const approvedCount = history.filter((entry) => entry.reviewStatus === "approved").length;
  const averageLatency = history.length
    ? history.reduce((total, entry) => total + entry.latencyMs, 0) / history.length
    : null;
  const englishToUrduCount = history.filter((entry) => entry.sourceLanguage === "English").length;
  const urduToEnglishCount = history.length - englishToUrduCount;
  const directionScale = Math.max(englishToUrduCount, urduToEnglishCount, 1);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const activityDays = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today);
    day.setUTCDate(today.getUTCDate() - (6 - index));
    const dayKey = day.toISOString().slice(0, 10);
    const count = history.filter((entry) => {
      const createdAt = new Date(entry.createdAt);
      return !Number.isNaN(createdAt.getTime()) && createdAt.toISOString().slice(0, 10) === dayKey;
    }).length;
    return {
      key: dayKey,
      label: day.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
      date: day.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      count,
    };
  });
  const activityScale = Math.max(...activityDays.map((day) => day.count), 1);
  const filteredEntries = entries.filter((entry) => {
    const matchesFilter = filter === "all"
      || (filter === "review" && entry.reviewStatus === "pending")
      || (filter === "approved" && entry.reviewStatus === "approved")
      || (filter === "logged" && entry.reviewStatus === "not-flagged");
    const haystack = [entry.source, entry.correction, entry.translation, entry.model, entry.audienceId, entry.domain]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase();
    return matchesFilter && haystack.includes(query.trim().toLocaleLowerCase());
  });

  return (
    <section className="workspace" aria-labelledby="page-title">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span>ل</span>
            <span className="eyebrow-rule" /> English <span className="eyebrow-arrow">↔</span> اردو
          </div>
          <h1 id="page-title">Translation history.</h1>
        </div>
        <div className="workspace-badge">
          <History size={17} />
          <span>LOCAL</span>
        </div>
      </div>

      <section className="journal-view">
        <div className="journal-overview">
          <div>
            <h2>History &amp; review</h2>
            <p>Text is retained only when you opt in. This journal stays in this browser.</p>
          </div>
          <button type="button" className="text-action" onClick={clearJournal} disabled={history.length === 0}>
            <Eraser size={14} /> Clear journal
          </button>
        </div>
        <div className="journal-stats">
          <div>
            <span>Total translations</span>
            <strong>{history.length}</strong>
          </div>
          <div>
            <span>Needs review</span>
            <strong>{needsReviewCount}</strong>
          </div>
          <div>
            <span>Mean latency</span>
            <strong>{averageLatency === null ? "—" : `${(averageLatency / 1000).toFixed(1)}s`}</strong>
          </div>
          <div>
            <span>Fluency avg.</span>
            <strong>{averageFluency === null ? "—" : `${averageFluency.toFixed(1)}/5`}</strong>
          </div>
          <div>
            <span>Adequacy avg.</span>
            <strong>{averageAdequacy === null ? "—" : `${averageAdequacy.toFixed(1)}/5`}</strong>
          </div>
        </div>
        <div className="journal-visuals">
          <section className="journal-activity" aria-labelledby="activity-title">
            <div className="journal-panel-heading">
              <div>
                <span className="section-kicker">LAST 7 DAYS</span>
                <h2 id="activity-title">Translation activity</h2>
              </div>
              <History size={17} aria-hidden="true" />
            </div>
            <div className="activity-chart" role="img" aria-label={`Seven-day activity: ${activityDays.map((day) => `${day.date}: ${day.count}`).join(", ")}`}>
              {activityDays.map((day) => (
                <div className="activity-day" key={day.key} title={`${day.date}: ${day.count} translation${day.count === 1 ? "" : "s"}`}>
                  <span className="activity-count">{day.count || ""}</span>
                  <div className="activity-track">
                    <span
                      className={day.count ? "activity-bar active" : "activity-bar"}
                      style={{ height: `${day.count ? Math.max(12, day.count / activityScale * 100) : 3}%` }}
                    />
                  </div>
                  <span className="activity-label">{day.label}</span>
                </div>
              ))}
            </div>
            {history.length === 0 && <p className="chart-empty-note">Activity appears here after your first translation.</p>}
          </section>
          <section className="journal-directions" aria-labelledby="direction-title">
            <div className="journal-panel-heading">
              <div>
                <span className="section-kicker">LANGUAGE PAIR</span>
                <h2 id="direction-title">Direction split</h2>
              </div>
            </div>
            <div className="direction-row">
              <div><span>English <b>to</b> Urdu</span><strong>{englishToUrduCount}</strong></div>
              <div className="direction-track"><span style={{ width: `${englishToUrduCount / directionScale * 100}%` }} /></div>
            </div>
            <div className="direction-row">
              <div><span>Urdu <b>to</b> English</span><strong>{urduToEnglishCount}</strong></div>
              <div className="direction-track"><span style={{ width: `${urduToEnglishCount / directionScale * 100}%` }} /></div>
            </div>
            <p className="direction-footnote">{approvedCount} approved · {needsReviewCount} awaiting review</p>
          </section>
        </div>

        <div className="journal-tools">
          <label className="journal-search">
            <Search size={16} aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search source, translation, model..." aria-label="Search history" />
          </label>
          <div className="journal-filters" role="group" aria-label="Filter history">
            {(["all", "review", "approved", "logged"] as const).map((value) => (
              <button key={value} type="button" className={filter === value ? "active" : ""} aria-pressed={filter === value} onClick={() => setFilter(value)}>
                {value === "all" ? "All" : value === "review" ? "Needs review" : value === "approved" ? "Approved" : "Logged"}
              </button>
            ))}
          </div>
        </div>

        {history.length === 0 ? (
          <p className="empty-journal">No translations logged yet. Your saved history will appear here.</p>
        ) : filteredEntries.length === 0 ? (
          <p className="empty-journal">No entries match this search or filter.</p>
        ) : (
          <div className="journal-list">
            {filteredEntries.map((entry) => (
              <article key={entry.id} className="journal-entry">
                <div className="journal-entry-heading">
                  <span>
                    <time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString()}</time> · {entry.sourceLanguage} → {entry.targetLanguage}
                  </span>
                  <span className={`journal-status ${entry.reviewStatus === "pending" ? "pending" : entry.reviewStatus === "approved" ? "approved" : "logged"}`}>
                    {entry.reviewStatus === "pending" ? "Review needed" : entry.reviewStatus === "approved" ? "Approved" : "Logged"}
                  </span>
                </div>
                {entry.source && entry.translation ? (
                  <>
                    <p>
                      <b>Source</b> {entry.source}
                    </p>
                    <p>
                      <b>Model output</b> {entry.translation}
                    </p>
                    {entry.correction && <p><b>Approved correction</b> {entry.correction}</p>}
                    {entry.suggestedTranslation && <p className="journal-user-suggestion"><b>User suggestion</b> {entry.suggestedTranslation}</p>}
                  </>
                ) : (
                  <p className="text-not-retained">Source/output text was not retained.</p>
                )}
                <div className="journal-entry-meta">
                  <span>{entry.model}{entry.usedFallback ? " · fallback" : ""}</span>
                  <span>Estimate {entry.qualityScore}/100</span>
                  <span><Clock3 size={13} /> {entry.latencyMs} ms</span>
                  <span>{entry.audienceId}{entry.audienceId === "professional" ? ` · ${entry.domain}` : ""}</span>
                  {entry.fluencyRating ? <span>Fluency {entry.fluencyRating}/5</span> : null}
                  {entry.adequacyRating ? <span>Adequacy {entry.adequacyRating}/5</span> : null}
                </div>
                {entry.reviewReason && <p className="journal-review-reason">{entry.reviewReason}</p>}
                {entry.reviewStatus !== "approved" && entry.source && entry.translation && (
                  <form className="journal-review-form" onSubmit={(event) => submitReview(event, entry)}>
                    <label htmlFor={`correction-${entry.id}`}>Correct or approve this output</label>
                    <textarea id={`correction-${entry.id}`} name="correction" defaultValue={entry.suggestedTranslation || entry.correction || entry.translation} dir={entry.targetLanguage === "Urdu" ? "rtl" : "ltr"} />
                    <div className="rating-controls">
                      <label>
                        Fluency
                        <select name="fluencyRating" required defaultValue="">
                          <option value="" disabled>
                            Rate 1–5
                          </option>
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <option key={rating} value={rating}>
                              {rating} / 5
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Adequacy
                        <select name="adequacyRating" required defaultValue="">
                          <option value="" disabled>
                            Rate 1–5
                          </option>
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <option key={rating} value={rating}>
                              {rating} / 5
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <button className="text-action" type="submit">
                      <Check size={14} /> Save correction and approve
                    </button>
                  </form>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
