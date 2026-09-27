# Lafz: English–Urdu Translator

A deployable student translation app built with Next.js and Google's Gemini API. It supports English ↔ Urdu, audience-specific prompts, review feedback, local translation journaling, batch text translation, and JSON REST endpoints. Translation requests are sent from server-side routes; the browser never receives the Gemini API key.

For a slide-by-slide project presentation, including speaker notes, demo flow, architecture, evaluation status, and limitations, see [PRESENTATION_README.md](PRESENTATION_README.md).

## Run locally

1. Install Node.js 20.9 or later.
2. Create a Gemini API key in Google AI Studio. Check current model availability and free-tier limits for your account; model access and quotas can change.
3. From this directory, install dependencies:

   ```bash
   npm install
   ```

4. Copy `.env.example` to `.env.local` and enter your key:

   ```dotenv
   GEMINI_API_KEY=your_key_here
   GEMINI_MODEL=gemini-3.8-flash
   GEMINI_FALLBACK_MODEL=gemini-3.5-flash
   GEMINI_INPUT_USD_PER_MILLION=
   GEMINI_OUTPUT_USD_PER_MILLION=
   ```

   `GEMINI_API_KEY` is a server secret. Never rename it with a `NEXT_PUBLIC_` prefix, commit `.env.local`, or paste the key into client-side code. `.env.local` is excluded by `.gitignore`.

5. Start the app:

   ```bash
   npm run dev
   ```

6. Open http://localhost:3000.

The app validates empty input and the 5,000-character limit. Without a configured key, the API returns a setup message. Google Fonts are loaded for the interface and Urdu Nastaliq rendering; a system fallback is used if they are unavailable. Optional input/output USD-per-million rates enable per-request cost estimates; leave them unset rather than use stale prices.

## Audience prompt profiles

The audience carousel offers six prompt lenses: End User / Casual, Student, Professional, Developer, Government / Institutional, and Content Creator. Each profile adjusts translation guidance for its audience; the Professional profile additionally accepts a General, Academic, Medical, Legal, or Journalism domain. Medical and legal results are flagged for qualified human review. Approved corrections saved in the browser may be included as up to three examples in subsequent prompts on that device.

## Value proposition

Lafz exposes workflow controls for domain, tone, audience, Urdu script, honorifics, Roman Urdu input, reviewer correction, and REST integration. It also offers an optional back-translation check: Gemini translates the output back into the source language so a person can inspect the round-trip meaning. This uses an additional model call and may add latency/cost. It is not BLEU, does not prove semantic equivalence, and does not demonstrate that Lafz is more accurate than Google Translate. Use the held-out evaluation protocol below before making comparative quality claims.

## Functional requirements

| ID | Implementation |
| --- | --- |
| FR-01 | Auto mode detects English vs Urdu using Gemini's returned language label, supported by script-count detection for mixed-script text. The user can override with a fixed direction. |
| FR-02 | The single-translation endpoint handles English → Urdu and Urdu → English. |
| FR-03 | Prompts instruct Gemini to preserve meaning, sentence structure, idioms, and audience/domain context. |
| FR-04 | Urdu output requests Unicode Urdu script; the UI uses RTL direction and a Nastaliq-capable font. |
| FR-05 | The result includes a 0–100 model-estimated quality score and reason. It is not calibrated or an objectively verified confidence probability. Scores below 80, uncertainty, or medical/legal domains flag review. |
| FR-06 | Flagged translations can be edited and approved in the local review journal. There is no staffed remote reviewer queue or identity/access control yet. |
| FR-07 | Every successful translation writes operational/quality metadata to IndexedDB on the current browser. Source/output text and model review reasons are omitted unless the user explicitly opts in to local text retention. It is not uploaded to a project database; clearing browser site data removes it. |
| FR-08 | The UI and batch endpoint accept up to five `.txt` or `.md` documents, each limited to 5,000 characters. |
| FR-09 | JSON REST endpoints: `POST /api/translate` for one item and `POST /api/translate/batch` for multiple documents. |
| FR-10 | If the primary Gemini model fails, the server retries temporary 503 failures once and then tries the configured secondary model. Configure both models that are available to your key. |

## Non-functional requirements

| ID | Target | Current implementation/status |
| --- | --- | --- |
| NFR-01 | <2s single sentence; <10s paragraph | Server returns measured end-to-end model latency and checks a heuristic target (paragraph = multiple sentences or >50 words). Provider/network variability means the target is not guaranteed. |
| NFR-02 | 99.5% availability | Not established locally. `GET /api/health` is available for host monitoring; an SLA requires deployed uptime monitoring, incident response, and provider availability evidence. |
| NFR-03 | 10,000 concurrent requests | Not tested or claimed. Routes are stateless, but host capacity, Gemini quotas, and rate limits are external bottlenecks. Requires load testing with a mocked provider first, then a quota-approved deployment test. |
| NFR-04 | No PII stored; TLS 1.3 | The app server has no translation database and avoids logging request content. Browser journal records metadata only by default; a separate opt-in saves text locally for review/examples, and a schema upgrade clears the previous full-text journal. Submitted text is still sent to Google for inference. Production HTTPS/TLS 1.3 depends on the hosting provider; response security headers including HSTS are configured. Do not submit sensitive/PII content. |
| NFR-05 | BLEU >=35; human fluency >=4/5 | Not yet measured. Human review can record fluency/adequacy scores and shows sample means, but this self-selected local sample is not a benchmark. Use the held-out bilingual evaluation protocol in `evaluation/README.md`; no accuracy claim is made until then. |
| NFR-06 | <=$0.002 / 1,000 tokens average | Token usage is returned per request. Set `GEMINI_INPUT_USD_PER_MILLION` and `GEMINI_OUTPUT_USD_PER_MILLION` to the current prices for the selected models to show an estimate per 1,000 combined tokens. The estimate is omitted when prices are unset; the target has not been validated over a representative workload. |
| NFR-07 | Formal Standard Urdu; Roman Urdu awareness | Formal tone requests standard Unicode Urdu. Roman Urdu is supported with an explicit Roman Urdu input toggle under Urdu → English; it is not automatically inferred from Latin letters because it is ambiguous with English. |

Prices, quotas, model names, TLS termination, and performance vary by provider/account and deployment. Keep the configured values current and report the date/model alongside any NFR measurements.

### REST examples

Single translation request:

```json
{
   "text": "Good morning.",
   "direction": "auto",
   "tone": "formal",
   "audienceId": "student",
   "domain": "academic"
}
```

Batch request uses `documents: [{ "name": "notes.txt", "text": "..." }]` and the same optional direction, tone, audience, domain, and approved-example settings. Both endpoints return JSON; successful translations include detected languages, quality estimate, review flag, selected model, and whether fallback was used.

## Check the app

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Try Auto mode with English and Urdu; select Roman Urdu explicitly for Latin-script Urdu; override each direction; inspect profile prompts; upload `.txt`/`.md` files; edit and rate a flagged result; reload to confirm the IndexedDB journal remains. Translation metadata is stored locally by default. Source/output text is saved in this browser only after opting in. Submitted text is sent to Google for inference, so avoid sensitive/PII content and review Google's current API data-use terms before deployment.

## Deploy

This is a standard Next.js app and can be deployed to Vercel or another Node.js-compatible Next.js host.

1. Push the `translator` project to a Git provider.
2. Import it into your hosting provider and keep the project root set to this directory.
3. Add `GEMINI_API_KEY` as a server-side environment secret, and set `GEMINI_MODEL` plus `GEMINI_FALLBACK_MODEL` to models available to your account. Defaults are `gemini-3.8-flash` and `gemini-3.5-flash`.
4. Deploy, then test both directions and verify behavior for missing/invalid secrets and exhausted quota. Use `GET /api/health` as a readiness probe; it does not establish an uptime SLA. The app sends security headers including HSTS; TLS 1.3 termination must be enabled and verified at the host or CDN.
5. Keep rate limiting and abuse controls in mind before sharing publicly: the server endpoint calls a quota-limited API, and this starter does not yet implement per-user limits or authentication.

## Operational limits

This is a student-project implementation, not a production SLA. Local journal entries are browser/device-specific and have no server backup, shared reviewer queue, user accounts, or access control. Opt-in local text is not automatically PII-filtered; never retain sensitive text in the journal. Batch currently supports plain text and Markdown, not PDF or Word parsing. Model-estimated quality scores are not proof of correctness. Do not rely on generated translations for legal, medical, or other high-stakes decisions without qualified human review.
