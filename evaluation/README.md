# English-Urdu Evaluation

This folder contains a 100-case paired reference set and scripts that evaluate the running translator through its existing `POST /api/translate` endpoint. The app's `qualityScore` is a model self-estimate; it is not BLEU or a human rating.

## Dataset

`dataset.json` has 50 English-to-Urdu and 50 Urdu-to-English cases, split across general, academic, technical, formal, idiomatic, and Roman Urdu content. Every case includes the API settings it needs. Roman Urdu cases set `romanUrdu: true`; the runner sends only the endpoint's supported request fields and never includes references or test examples in prompts.

The entries are AI-assisted original drafts, not human-authored or independently verified gold references. `reference_status` is deliberately `AI_assisted_draft_pending_bilingual_human_review`. Have a qualified English-Urdu reviewer validate and correct every reference before treating the BLEU result as a benchmark or publishing accuracy claims. This 100-case set is a project evaluation set, not the larger acceptance corpus described in the design protocol. Keep it held out from prompt tuning.

## Setup And Run

Run the Next.js app from `translator/` with a valid `GEMINI_API_KEY` in the server environment. In a separate PowerShell terminal, from the `translator/` directory, create an isolated Python environment and install the metric dependency:

```powershell
py -m venv "$env:TEMP\lafz-eval-venv"
& "$env:TEMP\lafz-eval-venv\Scripts\python.exe" -m pip install -r evaluation/requirements.txt
& "$env:TEMP\lafz-eval-venv\Scripts\python.exe" evaluation/evaluate.py --validate-only
& "$env:TEMP\lafz-eval-venv\Scripts\python.exe" evaluation/evaluate.py --base-url http://localhost:3000 --delay-seconds 1
```

The runner checks the dataset before calling the API, sends requests sequentially, records the translation, model, fallback flag, token counts, wall-clock latency, and API-reported latency, and rewrites `results.json` after each case. It stops on a non-retryable API error, preserving completed cases; 429 and 503 responses receive bounded retries. Resume a partial run with `--resume`. Use `--limit 2` for a small live smoke test. Live runs consume Gemini quota.

The runner computes corpus BLEU overall, for each direction, and for each category with SacreBLEU's `intl` tokenizer and effective order, after Unicode NFC normalization. Empty groups have a null score. BLEU is a corpus comparison metric, not a correctness probability. Each case's human score fields start as `null`; the initial `results.json` is marked `not_run` and contains no measured scores.

## Human Ratings

After an evaluation run, open `results.json` and enter actual 1-5 ratings in each completed case's `human_scores` fields:

- `adequacy`: meaning, detail, and tone preserved.
- `fluency`: natural grammar, register, and readability.
- `terminology_accuracy`: domain terms and named entities handled correctly.
- `overall_quality`: holistic assessment of the translation.

Leave unrated fields `null`. Have two bilingual reviewers independently rate each sampled output and resolve disagreements before reporting consensus means; report reviewer agreement and sample counts. Calculate overall, per-direction, and per-category averages with:

```powershell
& "$env:TEMP\lafz-eval-venv\Scripts\python.exe" evaluation/score_human.py
```

The script reads only entered scores, ignores `null`, validates the 1-5 range, and writes means plus `n` counts back into `results.json`. With no ratings, means stay null and counts stay zero.

## Results And Limits

`results.json` is the output artifact. Retain it with the dataset version, SacreBLEU settings/version, model IDs, and run status. The evaluator measures individual request latency; it does not claim a service-level latency percentile. BLEU depends on reference wording and tokenizer choices, especially for Urdu. Report the sample count and tokenizer with every score, and do not present this draft set as independently human-validated.

The 100-case results do not establish the larger benchmark or acceptance targets. Do not claim BLEU of 35 or higher or mean human fluency of 4/5 or higher until those results have been produced by this protocol and retained. For stronger claims, expand the held-out set, obtain independent bilingual reference review, report BLEU and chrF together, and use multiple human reviewers with agreement reporting. The browser-local journal is self-selected and is not a substitute for this benchmark.
