# Lafz: English–Urdu Translation Studio

Lafz is a web application for translating between English and Urdu with audience-aware prompt settings, batch text translation, browser-local review, and optional Prometheus/Grafana telemetry. Translation requests run through server-side Next.js routes using Google's Gemini API; the Gemini key is not sent to the browser.

This README documents the implemented project. It distinguishes working features from unmeasured goals: the app is a student project, not a certified translation service or a production service-level guarantee.

For presentation slides and speaker notes, see [PRESENTATION_README.md](PRESENTATION_README.md). For the evaluation protocol and reviewer guidance, see [evaluation/README.md](evaluation/README.md).

## Contents

- [Features](#features)
- [Architecture](#architecture)
- [Requirements](#requirements)
- [Local setup](#local-setup)
- [Configuration](#configuration)
- [Using the application](#using-the-application)
- [HTTP API](#http-api)
- [Observability](#observability)
- [Evaluation](#evaluation)
- [Development checks](#development-checks)
- [Project structure](#project-structure)
- [Deployment and security](#deployment-and-security)
- [Limitations and troubleshooting](#limitations-and-troubleshooting)

## Features

- English-to-Urdu and Urdu-to-English translation, with automatic direction detection or a fixed direction.
- Six prompt profiles: End User / Casual, Student, Professional, Developer, Government / Institutional, and Content Creator.
- Natural, Formal, and Casual tone options. Professional mode adds General, Academic, Medical, Legal, or Journalism domain guidance.
- Explicit Roman Urdu input mode for Urdu-to-English. Latin-script Urdu is not reliably distinguishable from English through script detection alone.
- A model-estimated quality score and review reason, plus review flags for low scores, model-reported uncertainty, and Professional Medical or Legal requests.
- Inline editing for any translation. A submitted edit is stored as a user suggestion in the local journal and enters the review queue. It is not included as a prompt example until approved.
- Reviewer approval with fluency and adequacy ratings. Up to three approved examples can be added to later prompts on the same browser.
- Optional back-translation check. This makes another model request and is a qualitative aid, not proof of correctness.
- Batch translation for up to five `.txt` or `.md` files per request, with a 5,000-character limit per file.
- A browser-local translation/review journal, JSON endpoints, health and metrics endpoints, and an optional Prometheus/Grafana dashboard.

## Architecture

See the detailed [Lafz architecture diagrams](ARCHITECTURE.md) for the runtime component map, translation and feedback sequence, telemetry/evaluation flows, metric families, and security/data boundaries.

The application has no server-side translation database or user-account system. Journal records live in IndexedDB for the current browser profile. Text retention is opt-in; a submitted inline suggestion explicitly records its source and translation alongside the feedback so it can be reviewed. Approved examples are sent as part of a later Gemini prompt from that browser.

## Requirements

- Node.js 20.9 or later and npm.
- A Google AI Studio API key with access and quota for the configured Gemini models. Model identifiers and quotas can change; check current availability for your account.
- Docker Desktop or another Docker Compose installation only if you want the optional local Prometheus/Grafana stack.
- Python 3.10 or later only if you want to run the evaluation scripts; see [evaluation/README.md](evaluation/README.md).

## Local setup

Run these commands from the `translator/` directory:

```bash
npm install
```

Copy `.env.example` to `.env.local`, then set at least the Gemini API key. PowerShell:

```powershell
Copy-Item .env.example .env.local
```

macOS/Linux:

```bash
cp .env.example .env.local
```

Edit `.env.local` and configure the values described in [Configuration](#configuration). Then start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app requires a valid key and available model quota to complete real translation requests. The UI itself can load without a key; `GET /api/health` reports whether the key is configured.

## Configuration

Next.js reads the app's local settings from `.env.local`. Do not commit that file. It is ignored by `.gitignore`.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `GEMINI_API_KEY` | For translation | None | Server-side Google AI Studio API key. Do not prefix it with `NEXT_PUBLIC_`. |
| `GEMINI_MODEL` | No | `gemini-3.8-flash` | Primary model ID. Use a model available to your key. |
| `GEMINI_FALLBACK_MODEL` | No | `gemini-3.5-flash` | Secondary model attempted after the primary fails. |
| `GEMINI_INPUT_USD_PER_MILLION` | No | Unset | Current input-token price in USD per million tokens; used for estimated cost. |
| `GEMINI_OUTPUT_USD_PER_MILLION` | No | Unset | Current output-token price in USD per million tokens; used for estimated cost. |
| `METRICS_TOKEN` | No | Unset | When set, protects `/api/metrics` with bearer-token authentication. Configure the same credential in Prometheus. |
| `GRAFANA_ADMIN_USER` | No | Compose fallback: `admin` | Grafana admin username when starting the Compose stack. |
| `GRAFANA_ADMIN_PASSWORD` | No | Compose fallback: `admin` | Grafana admin password when starting the Compose stack. Replace the default for shared or deployed environments. |

The model loop retries a temporary HTTP 503 once for each model, then tries the distinct fallback model if configured. It does not retry every class of error. Pricing values are estimates and must be kept current; leave them unset if you do not have reliable current prices.

Docker Compose does not load Next.js's `.env.local` automatically. For Compose variable interpolation, export the Grafana variables in the shell or provide a Compose `.env` file. The app still reads its own `.env.local` when Next.js runs on the host.

## Using the application

### Translate

1. Choose Auto, English, or Urdu direction. Auto mode uses script heuristics to guide the initial direction and the model's returned language label for the result.
2. Choose an audience profile. The profile adjusts prompt instructions; it does not guarantee domain correctness.
3. Choose Natural, Formal, or Casual tone. Professional mode also exposes a domain selector.
4. Enter up to 5,000 characters and translate.
5. Review the output, copy it, or request a back-translation meaning check.

For Urdu-to-English Latin-script input, select Urdu direction and turn on **Source is Roman Urdu**. This setting changes how the input is interpreted; Urdu output is requested in Unicode Urdu script, not Roman Urdu.

### Inline suggestions and review

Every successful translation can be edited with **Suggest an edit**. Saving feedback records the source, original model output, and user suggestion in the local journal and marks the entry for review. The displayed output updates to the user's edit, while the journal keeps the original model output and suggestion separately.

The Journal page lets a reviewer rate fluency and adequacy from 1 to 5 and approve a correction. Approval stores the corrected translation as an approved example. Up to three most recent approved examples are included in future translation and batch prompts in the same browser. Unapproved suggestions are not sent as examples.

The **Save source/output text** option controls routine journal retention and is off by default. Submitting inline feedback is a separate, explicit action that saves the text needed to review that suggestion. Do not save sensitive or personal text. The journal is not synchronized across devices and can be removed by clearing it in the UI or deleting this site's browser data.

### Batch

The Batch page accepts up to five `.txt` or `.md` files in one request. Each file may contain up to 5,000 characters. Per-file results are shown immediately and successful documents are recorded in the local journal. PDF, Word, and other document parsing are not implemented.

## HTTP API

All endpoints use the same origin as the Next.js app and accept/return JSON unless noted. There is no API authentication or per-user rate limiting in this project; protect deployments accordingly.

### `POST /api/translate`

Translate one text. Example request:

```json
{
   "text": "Could you please send me the details?",
   "direction": "en-ur",
   "romanUrdu": false,
   "tone": "formal",
   "audienceId": "student",
   "domain": "academic",
   "approvedExamples": []
}
```

Request fields:

| Field | Rules |
| --- | --- |
| `text` | Required non-empty string; maximum 5,000 characters. |
| `direction` | `auto`, `en-ur`, or `ur-en`; defaults to `auto`. |
| `romanUrdu` | Boolean; defaults to `false`. `true` is only valid with `direction: "ur-en"`. |
| `tone` | `natural`, `formal`, or `casual`; defaults to `natural`. |
| `audienceId` | `casual`, `student`, `professional`, `developer`, `institutional`, or `creator`; defaults to `casual`. |
| `domain` | `general`, `academic`, `medical`, `legal`, or `journalism`; defaults to `general`. Domain instructions are used for the Professional audience. |
| `approvedExamples` | Optional array of at most three `{ "source", "translation" }` objects. Source is limited to 500 characters and translation to 1,000 characters. |

Successful responses include `translation`, source/target/detected language, `qualityScore`, `reviewReason`, `needsReview`, model ID, fallback status, latency, and token/cost fields when available. Example shape:

```json
{
   "translation": "...",
   "sourceLanguage": "English",
   "targetLanguage": "Urdu",
   "detectedLanguage": "English",
   "qualityScore": 91,
   "reviewReason": "",
   "needsReview": false,
   "model": "gemini-3.8-flash",
   "usedFallback": false,
   "latencyMs": 842,
   "latencyTargetMs": 2000,
   "latencyTargetMet": true,
   "inputTokens": 120,
   "outputTokens": 48
}
```

`qualityScore` is the model's uncalibrated estimate, not a probability or independent quality measurement. Cost fields are only returned when token counts and both price variables are available.

### `POST /api/translate/batch`

Accepts a JSON object with `documents`, an array of one to five objects shaped like `{ "name": "notes.txt", "text": "..." }`, plus the shared translation options described above. Each document text is limited to 5,000 characters. The response has a `results` array with the original document index and either translation metadata or an error for that document. Invalid batch structure or request settings return an HTTP 400 response.

```json
{
   "documents": [
      { "name": "notes.txt", "text": "Good morning." },
      { "name": "summary.md", "text": "A short paragraph." }
   ],
   "direction": "auto",
   "tone": "natural",
   "audienceId": "casual",
   "domain": "general"
}
```

### `POST /api/translate/verify`

Generates a back-translation for a meaning check. Requires `source`, `translation`, and a fixed `direction` (`en-ur` or `ur-en`); optional settings are `tone`, `audienceId`, and `domain`. Source and translation are each limited to 5,000 characters. The result includes `backTranslation`, language, latency, model, fallback status, and a note that the comparison is not proof of semantic equivalence. This call consumes an additional model request.

### `GET /api/health`

Returns a small JSON readiness/configuration response with `status`, `providerConfigured`, and a timestamp. It returns HTTP 200 if `GEMINI_API_KEY` is present and HTTP 503 if it is absent. It does not contact Gemini, validate the key, check quota, or establish service availability.

### `GET /api/metrics`

Exposes Prometheus text-format metrics. If `METRICS_TOKEN` is set, requests must include `Authorization: Bearer <token>` or the endpoint returns HTTP 401. Metrics are in-memory per Node.js process; they are not a durable business ledger. See [Observability](#observability).

### Error behavior

Malformed or out-of-range input returns HTTP 400 with an `error` string. Provider quota errors may return 429; invalid key, unavailable service, or other provider failures can return 503 or 502. Check the response message and server logs, and verify model access and quota in Google AI Studio.

## Observability

The optional stack runs Prometheus and Grafana in Docker while the Next.js application runs on the host at port 3000. From `translator/`, start it with:

```bash
docker compose -f docker-compose.observability.yml up -d
```

Open:

- Prometheus: [http://localhost:9090](http://localhost:9090)
- Grafana: [http://localhost:3001](http://localhost:3001)
- Grafana dashboard: [Translator — Telemetry Overview](http://localhost:3001/d/translator-overview/translator-e28094-telemetry-overview)

The Compose defaults are `admin` / `admin`. Set `GRAFANA_ADMIN_USER` and `GRAFANA_ADMIN_PASSWORD` before startup, and change the password outside disposable local development. Stop the services without deleting stored metrics using:

```bash
docker compose -f docker-compose.observability.yml down
```

Prometheus scrapes `http://host.docker.internal:3000/api/metrics` every 15 seconds. This works with Docker Desktop on Windows. On other Docker hosts, ensure the Prometheus container can resolve and reach the host application; update `observability/prometheus/prometheus.yml` if needed. The host app must be running before meaningful application metrics can be scraped.

The dashboard and registry cover request/error counts, in-flight requests, fallback use, latency and quality histograms, token/cost counters, latency-target outcomes, and Node.js process metrics. Translation counters, latency, quality, token, and cost series may be absent until requests exercise those paths; token/cost metrics also depend on provider usage metadata and configured prices. A successful Prometheus target scrape (`up = 1`) confirms reachability, not that every dashboard panel has data.

To enable metrics authentication, set `METRICS_TOKEN` in the Next.js server environment and configure the matching Prometheus bearer credential under the translator scrape job's `authorization.credentials` in `observability/prometheus/prometheus.yml`. Do not commit real credentials. Restart/reload Prometheus after changing its configuration.

## Evaluation

The evaluator calls the running `/api/translate` endpoint against the 100-case set in `evaluation/dataset.json`; live runs consume Gemini quota. The references are AI-assisted drafts awaiting independent bilingual human review. The checked-in [evaluation/results.json](evaluation/results.json) is `not_run`, with no measured BLEU or human ratings.

See [evaluation/README.md](evaluation/README.md) for the full protocol. A small starting workflow from `translator/` is:

```powershell
py -m venv "$env:TEMP\lafz-eval-venv"
& "$env:TEMP\lafz-eval-venv\Scripts\python.exe" -m pip install -r evaluation/requirements.txt
& "$env:TEMP\lafz-eval-venv\Scripts\python.exe" evaluation/evaluate.py --validate-only
& "$env:TEMP\lafz-eval-venv\Scripts\python.exe" evaluation/evaluate.py --base-url http://localhost:3000 --limit 2
```

Run the full set by omitting `--limit 2`; `--resume` reuses successful outputs. The script computes corpus BLEU overall, per direction, and per category using SacreBLEU's `intl` tokenizer and Unicode NFC normalization. Human scores must be entered by bilingual reviewers and are summarized with `score_human.py`. Do not claim BLEU or fluency targets from model self-scores or the browser-local, self-selected review journal.

## Development checks

From `translator/`:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

There is currently no `npm test` script. The evaluation scripts are separate from the frontend checks and the full evaluation requires a running app, a working Gemini key, available quota, and the Python dependency in `evaluation/requirements.txt`.

## Project structure

```text
translator/
├── src/
│   ├── app/                 Next.js pages and API route handlers
│   │   ├── api/             health, metrics, translate, batch, verify
│   │   ├── batch/           batch translation page
│   │   └── journal/         local review journal page
│   ├── components/          shared controls and app shell
│   └── lib/                 translation, prompts, state, metrics, IndexedDB
├── evaluation/              dataset, API runner, human scoring, results
├── observability/           Prometheus and Grafana provisioning/dashboard
├── public/                  static assets
├── docker-compose.observability.yml
├── .env.example              environment variable template
└── package.json              scripts and dependencies
```

Key implementation modules:

- `src/lib/translation.ts`: direction handling, prompt construction, Gemini calls, fallback behavior, and translation metadata.
- `src/lib/audiences.ts`: audience and professional-domain prompt guidance.
- `src/lib/translateRequest.ts`: request validation and provider-error responses.
- `src/lib/workspace-context.tsx`: shared UI state, IndexedDB journal workflow, review approval, and approved-example selection.
- `src/lib/localJournal.ts`: IndexedDB persistence.
- `src/lib/metrics.ts`: Prometheus registry and application metrics.

## Deployment and security

This is a standard Next.js application and can run on a Node.js-compatible host such as Vercel. Set the project root to `translator/`, configure `GEMINI_API_KEY` as a server-side secret, and select model IDs available to the key. Set optional cost variables only from current provider pricing. Configure HTTPS/TLS at the hosting provider or CDN and verify the deployed endpoint; the app's response headers do not by themselves configure TLS.

Before making the service public, add suitable authentication, per-user/IP rate limits, abuse monitoring, and an operational plan for Gemini quota and outages. Protect Grafana and Prometheus from public access or configure appropriate network controls. Replace local Grafana credentials and protect `METRICS_TOKEN` where used. Do not expose either secret in client-side code or commit secrets.

Submitted translation text is sent to Google for inference. Browser-local retention controls only the journal; it does not make inference local. Review the provider's current data-use terms and avoid submitting sensitive, confidential, or personally identifiable information.

## Limitations and troubleshooting

### Known limitations

- The quality score is model-reported, uncalibrated, and not a verified probability of correctness.
- No staffed remote review queue, accounts, reviewer identity, shared database, or cross-device journal synchronization is implemented.
- Medical and legal prompts request review, but do not replace a qualified translator or professional.
- The evaluation reference set is not independently validated, and the evaluation results are currently unmeasured.
- Latency targets are heuristics (2 seconds for a short input; 10 seconds for longer/multi-sentence input), not guarantees. Availability and concurrency targets have not been load-tested or certified.
- Cost is estimated only when current input/output prices and token counts are configured; the stated cost target has not been validated over a representative workload.
- No production SLA or claim of superiority over another translation product is established.

| Symptom | Checks |
| --- | --- |
| Translation returns a key/configuration error | Confirm `.env.local` is in `translator/`, `GEMINI_API_KEY` is set server-side, and the dev server was restarted after environment changes. |
| Provider returns 429 or 503 | Check Google AI Studio quota, billing/access, provider status, and configured model IDs. Retry after limits clear; do not mistake fallback configuration for guaranteed availability. |
| `/api/health` is 200 but translation fails | Health checks only whether a key is present. It does not validate credentials, model access, network connectivity to Gemini, or quota. |
| Grafana dashboard loads but panels are empty | Check Prometheus `/targets` for the translator target, verify `/api/metrics` is reachable from the Prometheus container, make a successful translation, and allow at least one scrape interval. Many series are created only when a matching request occurs. |
| Prometheus translator target is down | Start the Next.js app on port 3000 and confirm the scrape target in `observability/prometheus/prometheus.yml` is reachable from Docker. For non-Windows Docker, `host.docker.internal` may need a host-specific replacement. |
| Metrics endpoint returns 401 | If `METRICS_TOKEN` is set, configure the matching bearer credential in Prometheus. |
| Journal text is missing | Routine source/output retention is off by default. Inline feedback submission explicitly saves the text needed for review; browser site data or a different browser profile has a separate journal. |

For a presentation-oriented summary and current project status, see [PRESENTATION_README.md](PRESENTATION_README.md).
