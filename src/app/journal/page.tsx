"use client";

import { Check, Eraser, History } from "lucide-react";
import { useWorkspace } from "@/lib/workspace-context";

export default function JournalPage() {
  const { history, averageFluency, averageAdequacy, clearJournal, submitReview } = useWorkspace();

  return (
    <section className="workspace" aria-labelledby="page-title">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span>ل</span>
            <span className="eyebrow-rule" /> English <span className="eyebrow-arrow">↔</span> اردو
          </div>
          <h1 id="page-title">Your review journal.</h1>
        </div>
        <div className="workspace-badge">
          <History size={17} />
          <span>LOCAL</span>
        </div>
      </div>

      <section className="journal-view">
        <div className="journal-overview">
          <div>
            <h2>
              {history.length} translation{history.length === 1 ? "" : "s"} recorded
            </h2>
            <p>Text is retained only when you opt in. Clear site data to remove this journal.</p>
          </div>
          <button type="button" className="text-action" onClick={clearJournal} disabled={history.length === 0}>
            <Eraser size={14} /> Clear journal
          </button>
        </div>
        <div className="journal-stats">
          <div>
            <span>Fluency avg.</span>
            <strong>{averageFluency === null ? "—" : `${averageFluency.toFixed(1)}/5`}</strong>
          </div>
          <div>
            <span>Adequacy avg.</span>
            <strong>{averageAdequacy === null ? "—" : `${averageAdequacy.toFixed(1)}/5`}</strong>
          </div>
        </div>
        {history.length === 0 ? (
          <p className="empty-journal">No translations logged yet.</p>
        ) : (
          <div className="journal-list">
            {[...history].reverse().map((entry) => (
              <article key={entry.id} className="journal-entry">
                <div className="journal-entry-heading">
                  <span>
                    {new Date(entry.createdAt).toLocaleString()} · {entry.sourceLanguage} → {entry.targetLanguage}
                  </span>
                  <span className={entry.reviewStatus === "pending" ? "journal-status pending" : "journal-status"}>
                    {entry.reviewStatus === "pending" ? "Review needed" : entry.reviewStatus === "approved" ? "Approved" : "Logged"}
                  </span>
                </div>
                {entry.source && entry.translation ? (
                  <>
                    <p>
                      <b>Source</b> {entry.source}
                    </p>
                    <p>
                      <b>Translation</b> {entry.correction || entry.translation}
                    </p>
                  </>
                ) : (
                  <p className="text-not-retained">Source/output text was not retained.</p>
                )}
                <small>
                  Model estimate {entry.qualityScore}/100 · latency {entry.latencyMs} ms · {entry.audienceId}
                  {entry.fluencyRating ? ` · fluency ${entry.fluencyRating}/5` : ""}
                  {entry.adequacyRating ? ` · adequacy ${entry.adequacyRating}/5` : ""}
                  {entry.reviewReason ? ` · ${entry.reviewReason}` : ""}
                </small>
                {entry.reviewStatus !== "approved" && entry.source && entry.translation && (
                  <form className="journal-review-form" onSubmit={(event) => submitReview(event, entry)}>
                    <label htmlFor={`correction-${entry.id}`}>Correct or approve this output</label>
                    <textarea id={`correction-${entry.id}`} name="correction" defaultValue={entry.correction || entry.translation} dir={entry.targetLanguage === "Urdu" ? "rtl" : "ltr"} />
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
