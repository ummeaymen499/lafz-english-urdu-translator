"use client";

import { Check, Clipboard, Eraser, Languages, LoaderCircle, RefreshCw, Sparkles } from "lucide-react";
import { TranslationControls } from "@/components/TranslationControls";
import { useWorkspace } from "@/lib/workspace-context";

const examples = [
  { label: "Everyday", text: "The weather is beautiful today." },
  { label: "Polite", text: "Could you please send me the details?" },
  { label: "Idiom", text: "A friend in need is a friend indeed." },
];

export default function TranslatePage() {
  const {
    direction,
    input,
    setInput,
    translation,
    translationMeta,
    loading,
    journalReady,
    error,
    isUrduSource,
    outputLanguage,
    romanUrduInput,
    saveTextLocally,
    setSaveTextLocally,
    saveReviewText,
    setSaveReviewText,
    reviewOpen,
    setReviewOpen,
    reviewDraft,
    setReviewDraft,
    backTranslation,
    verifyNote,
    verifying,
    copied,
    translate,
    verifyMeaning,
    copyTranslation,
    clearInput,
    setExample,
    submitCurrentReview,
  } = useWorkspace();

  return (
    <section className="workspace" aria-labelledby="page-title">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span>ل</span>
            <span className="eyebrow-rule" /> English <span className="eyebrow-arrow">↔</span> اردو
          </div>
          <h1 id="page-title">Meaning, carried.</h1>
        </div>
      </div>

      <TranslationControls />

      <form onSubmit={translate}>
        <div className="translation-grid">
          <section className="text-panel source-panel" aria-label="Text to translate">
            <div className="panel-heading">
              <span>
                <span className="panel-index">A</span> {direction === "auto" ? "Auto-detect input" : isUrduSource ? (romanUrduInput ? "Roman Urdu text" : "Urdu text") : "English text"}
              </span>
              <span className="language-caption">{direction === "auto" ? "AUTO" : isUrduSource ? "اردو" : "EN"}</span>
            </div>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={isUrduSource ? (romanUrduInput ? "Roman Urdu likhein, misal: Aap kaise hain?" : "ترجمے کے لیے متن یہاں لکھیں…") : "Write or paste something to translate…"}
              dir={direction === "auto" || romanUrduInput ? "auto" : isUrduSource ? "rtl" : "ltr"}
              maxLength={5000}
              aria-label="Source text"
            />
            <div className="panel-footer">
              <button type="button" className="text-action" onClick={clearInput} disabled={!input && !translation}>
                <Eraser size={14} /> Clear
              </button>
              <span>{input.length.toLocaleString()} / 5,000</span>
            </div>
          </section>
          <div className="direction-mark" aria-hidden="true">
            <span>↗</span>
          </div>
          <section className="text-panel result-panel" aria-label="Translation result">
            <div className="panel-heading">
              <span>
                <span className="panel-index">B</span> {outputLanguage === "English" ? "English translation" : outputLanguage === "Urdu" ? "Urdu translation" : "Translation"}
              </span>
              <span className="language-caption">{outputLanguage === "English" ? "EN" : outputLanguage === "Urdu" ? "اردو" : "AUTO"}</span>
            </div>
            <div
              className={`translation-output ${outputLanguage === "Urdu" || (!outputLanguage && !isUrduSource) ? "urdu-output" : ""}`}
              dir={outputLanguage === "Urdu" ? "rtl" : outputLanguage === "English" ? "ltr" : direction === "auto" ? "auto" : !isUrduSource ? "rtl" : "ltr"}
              aria-live="polite"
            >
              {loading ? (
                <span className="loading-label">
                  <LoaderCircle className="spin" size={17} /> Finding the right words…
                </span>
              ) : (
                translation || (
                  <span className="output-placeholder">
                    Your translation
                    <br />
                    will appear here.
                  </span>
                )
              )}
            </div>
            {translationMeta && (
              <>
                <div className={`quality-strip ${translationMeta.needsReview ? "review-required" : ""}`} title="This is an uncalibrated model estimate, not a verified probability.">
                  <span>
                    Model quality estimate <strong>{translationMeta.qualityScore}/100</strong>
                  </span>
                  <span>{translationMeta.needsReview ? "Human review advised" : "No review flag"}</span>
                </div>
                <div className="runtime-metrics">
                  <span>
                    {(translationMeta.latencyMs / 1000).toFixed(2)}s · {translationMeta.latencyTargetMet ? "within" : "over"} {translationMeta.latencyTargetMs / 1000}s target
                  </span>
                  <span>
                    {translationMeta.inputTokens ?? "?"} in / {translationMeta.outputTokens ?? "?"} out tokens
                  </span>
                  <span>
                    {translationMeta.estimatedCostPerThousandTokensUsd === undefined
                      ? "Cost rate unset"
                      : `$${translationMeta.estimatedCostPerThousandTokensUsd.toFixed(6)}/1K tokens · ${translationMeta.estimatedCostPerThousandTokensUsd <= 0.002 ? "within" : "over"} target`}
                  </span>
                </div>
              </>
            )}
            <div className="panel-footer output-footer">
              <span className="result-note">
                {translationMeta
                  ? `${translationMeta.detectedLanguage.toUpperCase()} → ${translationMeta.targetLanguage.toUpperCase()} · ${translationMeta.model}${translationMeta.usedFallback ? " · fallback" : ""}`
                  : "Ready when you are"}
              </span>
              <div className="output-actions">
                <button
                  type="button"
                  className="copy-button"
                  onClick={verifyMeaning}
                  disabled={!translation || !translationMeta || verifying}
                  title="Translate the result back into the source language for a meaning check"
                  aria-label="Check meaning with back-translation"
                >
                  {verifying ? <LoaderCircle className="spin" size={14} /> : <RefreshCw size={14} />}
                  <span>{verifying ? "Checking" : "Check meaning"}</span>
                </button>
                <button type="button" className="copy-button" onClick={copyTranslation} disabled={!translation} title="Copy translation" aria-label="Copy translation">
                  {copied ? <Check size={15} /> : <Clipboard size={15} />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>
          </section>
        </div>
        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}
        <div className="submit-row">
          <span className="privacy-note">
            <Sparkles size={14} /> Journal stays in this browser.
          </span>
          <button className="translate-button" type="submit" disabled={loading || !journalReady || !input.trim()}>
            {loading ? <LoaderCircle className="spin" size={16} /> : <Languages size={16} />}
            <span>{!journalReady ? "Loading journal" : loading ? "Translating" : "Translate"}</span>
            <span className="button-arrow">→</span>
          </button>
        </div>
        <label className="retention-consent">
          <input type="checkbox" checked={saveTextLocally} onChange={(event) => setSaveTextLocally(event.target.checked)} />
          <span>Save source/output text in this browser for correction and future examples. Off by default; metadata is still logged.</span>
        </label>
      </form>

      {backTranslation && (
        <section className="verification-result" aria-live="polite">
          <div>
            <span className="review-kicker">Back-translation check</span>
            <span className="verification-meta">Secondary Gemini pass · {translationMeta?.model}</span>
          </div>
          <p dir={translationMeta?.sourceLanguage === "Urdu" ? "rtl" : "ltr"}>{backTranslation}</p>
          <small>{verifyNote} This is a qualitative check, not BLEU, a guarantee, or a replacement for bilingual review.</small>
        </section>
      )}

      {translationMeta?.needsReview && (
        <section className="current-review" aria-label="Review flagged translation">
          <div>
            <span className="review-kicker">Human review requested</span>
            <p>{translationMeta.reviewReason || "The quality estimate is below the review threshold."}</p>
          </div>
          <button className="text-action" type="button" onClick={() => setReviewOpen(!reviewOpen)}>
            {reviewOpen ? "Close review" : "Correct or approve"}
          </button>
          {reviewOpen && (
            <form className="review-form" onSubmit={submitCurrentReview}>
              <label htmlFor="review-correction">Reviewer-approved translation</label>
              <textarea id="review-correction" name="correction" value={reviewDraft} onChange={(event) => setReviewDraft(event.target.value)} dir={translationMeta.targetLanguage === "Urdu" ? "rtl" : "ltr"} />
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
              <label className="review-retention">
                <input type="checkbox" checked={saveReviewText} onChange={(event) => setSaveReviewText(event.target.checked)} /> Store this source and correction locally as an approved example.
              </label>
              <button className="translate-button" type="submit" disabled={!reviewDraft.trim()}>
                <Check size={15} /> Approve translation
              </button>
            </form>
          )}
        </section>
      )}

      <div className="examples-row">
        <span className="examples-label">Try a phrase</span>
        {examples.map((example) => (
          <button type="button" key={example.label} onClick={() => setExample(example.text)}>
            {example.label}
            <span>↗</span>
          </button>
        ))}
      </div>
    </section>
  );
}
