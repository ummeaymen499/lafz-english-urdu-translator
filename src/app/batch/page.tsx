"use client";

import { Files, Languages, LoaderCircle } from "lucide-react";
import { TranslationControls } from "@/components/TranslationControls";
import { useWorkspace } from "@/lib/workspace-context";

export default function BatchPage() {
  const { batchFiles, batchResults, batchLoading, journalReady, handleBatchFiles, translateBatch, error } = useWorkspace();

  return (
    <section className="workspace" aria-labelledby="page-title">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span>ل</span>
            <span className="eyebrow-rule" /> English <span className="eyebrow-arrow">↔</span> اردو
          </div>
          <h1 id="page-title">Translate a batch.</h1>
        </div>
        <div className="workspace-badge">
          <Files size={17} />
          <span>TXT / MD</span>
        </div>
      </div>

      <TranslationControls />

      <section className="batch-section" aria-labelledby="batch-title">
        <div className="batch-heading">
          <div>
            <span className="section-kicker">MAX 5 FILES</span>
            <h2 id="batch-title">Documents</h2>
          </div>
          <label className="file-picker">
            <span>Choose .txt / .md files</span>
            <input type="file" accept=".txt,.md,text/plain,text/markdown" multiple onChange={handleBatchFiles} />
          </label>
        </div>
        <p>Up to 5,000 characters per file. Results appear in the Review journal.</p>
        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}
        {batchFiles.length > 0 && (
          <div className="selected-files">
            {batchFiles.map((file) => (
              <span key={`${file.name}-${file.size}`}>{file.name}</span>
            ))}
            <button className="translate-button" type="button" disabled={batchLoading || !journalReady} onClick={translateBatch}>
              {batchLoading ? <LoaderCircle className="spin" size={15} /> : <Languages size={15} />}
              {batchLoading ? "Translating batch" : "Translate batch"}
            </button>
          </div>
        )}
        {batchResults.length > 0 && (
          <div className="batch-results">
            {batchResults.map((result) => (
              <article key={result.index}>
                <strong>{batchFiles[result.index]?.name || `Document ${result.index + 1}`}</strong>
                {"error" in result ? (
                  <p className="batch-error">{result.error}</p>
                ) : (
                  <>
                    <p>{result.translation}</p>
                    <small>
                      {result.qualityScore}/100 quality estimate {result.needsReview ? "· review flagged" : ""}
                    </small>
                  </>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
