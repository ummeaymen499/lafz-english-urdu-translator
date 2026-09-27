# Lafz Project Presentation Guide

This guide contains ready-to-use slide content and speaker notes for presenting Lafz, the English-Urdu translation project. It is based on the current implementation, not only on the original design proposal. Suggested length: 10-12 minutes plus questions. Use the caveats and evaluation status as written; do not present design targets as measured results.

## Presentation Title

**Lafz: An English-Urdu Translation Studio**

Subtitle: *Audience-aware translation, local review, and a measurable path to quality*

Presenter: Umme Aymee  
Course: Programming for AI  
Date: September 2026

## Slide 1 - The Project

### Put on the slide

- Lafz is a web-based English <-> Urdu translation studio.
- It combines a configurable Gemini translation service with audience, tone, and domain controls.
- The product focuses on a thoughtful workflow: translate, inspect, correct, and review.

### Say

"Lafz is my AI engineering project for English-Urdu translation. I used a foundation model through an API rather than training a translation model from scratch. The application adds controls and a review workflow around that model call."

### Visual

Show the Translate screen and point out the language controls, audience selector, input, and result panels.

## Slide 2 - The Problem

### Put on the slide

- English and Urdu differ in script, word order, register, honorifics, and idiomatic expression.
- One generic translation style does not fit personal messages, academic material, technical copy, or formal notices.
- A fluent-looking output can still omit or distort meaning.

### Say

"The challenge is not just replacing words. A translation may need a different level of formality, preserve a technical term, or express an idiom naturally. The interface exposes some of these decisions instead of hiding them in a single translate button."

### Visual

Use a simple source-to-translation diagram and label the context decisions: audience, tone, domain, and script.

## Slide 3 - Project Goals and Scope

### Put on the slide

- Support English-to-Urdu and Urdu-to-English translation.
- Offer automatic direction selection, with manual overrides.
- Support standard Unicode Urdu and explicit Roman Urdu input mode.
- Provide single-text and small-batch workflows.
- Make uncertain or sensitive results reviewable.

### Say

"The current application is a course-project prototype. It implements these workflows, but it does not claim certified translation, production-scale availability, or proven superiority over other translators."

### Visual

Show three labeled routes: Translate, Batch, and Review Journal.

## Slide 4 - Who It Is For

### Put on the slide

The six audience profiles are:

- End User / Casual
- Student
- Professional
- Developer
- Government / Institutional
- Content Creator

Professional users can additionally select a General, Academic, Medical, Legal, or Journalism domain.

### Say

"Each audience profile changes the prompt guidance. A student profile emphasizes preserving academic terms and citations. A developer profile asks the model to preserve identifiers and placeholders. Professional mode adds the selected domain instruction. These controls guide the model; they do not guarantee correct terminology."

### Visual

Show the profile selector and one example of the Professional domain control.

## Slide 5 - Product Workflow

### Put on the slide

1. Choose automatic or fixed translation direction.
2. Choose an audience and, where relevant, a professional domain.
3. Select Natural, Formal, or Casual tone.
4. Enter or paste up to 5,000 characters.
5. Translate, inspect the output, and optionally check meaning or correct a flagged result.

### Say

"Urdu-to-English also has an explicit Roman Urdu toggle. Latin-script Urdu can resemble English, so the system does not pretend it can always identify Roman Urdu automatically."

### Visual

Trace the flow from controls to source panel to result panel.

## Slide 6 - Prompt Engineering

### Put on the slide

The server builds a prompt from:

- Context: English-Urdu translation task.
- Audience: selected profile's translation guidance.
- Domain: added for Professional mode.
- Role: careful professional bilingual translator.
- Instructions: preserve meaning, names, numbers, formatting, idioms, and tone.
- Constraints: return structured JSON; treat source text and examples as data, not instructions.

Up to three approved, opted-in local corrections may be included as style examples.

### Say

"The prompt is assembled on the server from the request settings. The held-out evaluation references are never supplied to the translation prompt. Approved examples come from corrections the user deliberately retained in their own browser."

### Visual

Show a compact prompt diagram: request settings + audience/domain guidance + optional approved examples -> Gemini.

## Slide 7 - System Architecture

### Put on the slide

```text
Browser UI
  -> Next.js route handler
  -> request validation
  -> translation service and prompt builder
  -> Google Gemini API
  -> structured translation result
  -> UI and optional local review journal
```

- The API key is read only by server-side code.
- Shared frontend state is provided above the app routes.
- The review journal is stored in browser IndexedDB, not in a project database.

### Say

"The browser never receives the Gemini key. The Next.js server validates the request and calls the Google GenAI SDK. Translation metadata and the optional local journal are separate from provider-side inference."

### Visual

Draw the browser, Next.js server, Gemini API, and IndexedDB as four boxes; label the server-to-provider connection as secret-bearing.

## Slide 8 - Technology Stack

### Put on the slide

- Next.js 16 App Router
- React 19 and TypeScript
- Google GenAI JavaScript SDK
- Gemini configurable primary and fallback model IDs
- IndexedDB for browser-local review history
- Python evaluation runner with SacreBLEU

Current sample defaults are `gemini-3.8-flash` and `gemini-3.5-flash`; availability depends on the Google AI Studio account and may change. The key is configured as `GEMINI_API_KEY` in the server environment.

### Say

"The model names and key are environment configuration. The code has a primary and fallback model path, but an available API key and quota are still required for live requests."

### Visual

Use a small stack diagram or logos for Next.js, TypeScript, Gemini, and Python.

## Slide 9 - API and Batch Workflow

### Put on the slide

- `GET /api/health`: reports server status and whether a Gemini key is configured; it does not test provider connectivity.
- `POST /api/translate`: accepts text, direction, Roman Urdu flag, tone, audience, domain, and optional approved examples.
- `POST /api/translate/batch`: accepts up to five text or Markdown documents, each up to 5,000 characters.
- `POST /api/translate/verify`: requests a back-translation for a qualitative meaning check.

The translation routes return model metadata, including selected model, fallback use, latency, token counts where available, and the model quality estimate.

### Say

"The health endpoint is a configuration/readiness check only. It does not guarantee that a provider call will succeed. The batch path reuses the same translation service and returns per-document outcomes."

### Visual

Show a short JSON request on the left and the main response fields on the right. Do not include an API key.

## Slide 10 - Quality and Human Review

### Put on the slide

- Gemini returns a 0-100 quality estimate and a short review reason.
- The estimate is uncalibrated and is not a probability of correctness.
- Review is flagged for low estimates, model-reported uncertainty, and Professional Medical or Legal domain requests.
- Users can correct flagged translations and rate fluency and adequacy from 1 to 5.
- An optional back-translation is a qualitative aid, not proof of correctness.

### Say

"The current human-in-the-loop feature is a local correction and approval workflow. It is not a staffed remote review queue. Medical and legal output still requires a qualified human before use."

### Visual

Show a flagged result, reviewer correction field, and approval controls.

## Slide 11 - Privacy and Safety

### Put on the slide

- Gemini credentials remain server-side.
- Translation metadata is stored in the current browser's IndexedDB journal.
- Source and output text are omitted unless the user opts in to retaining them locally.
- Opted-in approved examples may be sent in future prompts from that browser.
- Translation input is sent to Google for inference; do not submit sensitive or personal data.
- The project does not currently provide accounts, authentication, per-user rate limits, or a remote reviewer system.

### Say

"Local storage does not mean the translation input stays local: the text is sent to Gemini to produce the result. The opt-in controls browser journal retention, not provider inference."

### Visual

Use a data-flow diagram distinguishing browser-local journal data from text sent to Gemini.

## Slide 12 - Evaluation Design

### Put on the slide

- `evaluation/dataset.json` contains 100 paired cases: 50 per direction.
- Coverage includes general, academic, technical, formal, idiomatic, and Roman Urdu cases.
- `evaluation/evaluate.py` calls the real `/api/translate` route and records translations, latency, model, and token metadata.
- SacreBLEU uses the `intl` tokenizer and reports overall, per-direction, and per-category corpus BLEU.
- `evaluation/score_human.py` aggregates adequacy, fluency, terminology accuracy, and overall quality ratings (1-5).

### Say

"The evaluator is designed to call the actual running application. It does not infer BLEU from Gemini's self-score. Human averages are only calculated from ratings entered by reviewers."

### Visual

Show dataset -> real API -> results.json -> BLEU breakdown and human-rating averages.

## Slide 13 - Current Evaluation Status

### Put on the slide

- The 100 reference pairs are AI-assisted drafts, not human-authored or independently validated gold references.
- `evaluation/results.json` is currently `not_run`; BLEU and human averages are null.
- A qualified bilingual reviewer must validate the references before using the scores as a benchmark.
- A live API probe in the development environment returned HTTP 429, indicating quota/rate limiting at that time.
- No BLEU score or human score is being claimed.

### Say

"This is an important distinction between an evaluation tool and completed evaluation evidence. The runner and aggregation workflow are implemented, but I will not report a fabricated score. The API also needs available quota for an actual run."

### Visual

Show a status panel: Dataset 100 draft cases; Run status Not run; BLEU Not measured; Human ratings Pending.

## Slide 14 - Limitations and Failure Modes

### Put on the slide

- Ambiguous short phrases may need more context.
- Gender, honorifics, idioms, and culturally specific wording can be misinterpreted.
- Domain prompts do not replace a verified terminology glossary.
- A model can return a plausible but incorrect translation or quality estimate.
- Long text is limited by the current 5,000-character request boundary; batch currently accepts `.txt` and `.md`, not PDF or Word parsing.
- Provider quota, network availability, and model access affect runtime success.

### Say

"The safest product position is decision support for translation workflows, not certified translation. The UI marks some risk conditions, but automated flags cannot catch every error."

### Visual

Use a two-column table: failure risk and current mitigation/remaining gap.

## Slide 15 - Roadmap

### Put on the slide

- Have bilingual reviewers validate and correct the reference set.
- Run the complete evaluation when Gemini quota is available; retain model IDs and SacreBLEU settings.
- Add chrF and confidence intervals to the automated evaluation report.
- Record independent reviewer agreement and expand high-risk domain coverage.
- Add authentication and per-user rate limits before public deployment.
- Test performance and reliability under controlled load before making service-level claims.

### Say

"The next milestone is evidence: reviewed references, a reproducible evaluation run, and reviewer-rated samples. Production operations such as authentication, abuse controls, and load testing are later work."

### Visual

Show three stages: Validate references -> Measure quality -> Harden deployment.

## Slide 16 - Conclusion

### Put on the slide

- Lafz demonstrates foundation-model integration around a real translation workflow.
- Audience, tone, and domain settings shape prompts.
- Review, local feedback, batch translation, and evaluation are included.
- Accuracy and production readiness remain to be established with human review and measured results.

### Say

"The contribution is a usable, configurable English-Urdu translation workflow and a clear path to evaluate it responsibly. The system is implemented; its benchmark claims are not yet established. Thank you."

### Visual

Return to the Translate screen, then open the Review Journal and Evaluation status.

## Live Demo Plan

Allow 2-3 minutes. Check the Gemini key/quota and start the app before presenting. Never show `.env.local` or paste the API key into slides.

1. Open the Translate page and point out the direction, audience, and tone controls.
2. Select Professional to show the additional domain selector.
3. Enter a short, non-sensitive example and translate it if the provider quota is available.
4. Show the model, latency, and quality-estimate metadata; explain that the estimate is uncalibrated.
5. If the result is flagged, show the correction/review controls. Do not invent a translation or rating if the API is unavailable.
6. Open Batch and show the supported file types and limits without making an unplanned quota-heavy batch request.
7. Open the Review Journal and explain local storage and text opt-in.
8. End on `evaluation/results.json` or its status summary to show that evaluation is not yet run.

### Demo fallback

If the provider returns 429 or is unavailable, show the interface and explain that the request requires Google AI Studio quota. Do not display a made-up output as if it came from a live request.

## Likely Questions

### Does the system outperform Google Translate?

There is no completed comparative benchmark. The project offers configurable audience, tone, domain, Roman Urdu, and review workflows, but no superiority claim is supported yet.

### Is the model quality score a confidence probability?

No. It is a self-reported, uncalibrated 0-100 model estimate and should not be interpreted as a verified probability.

### Is the journal private?

The journal is stored in browser-local IndexedDB. Text is retained only after opt-in. However, text entered for translation is sent to Google Gemini for inference, and opted-in approved examples may be included in later prompts from that browser.

### Are medical and legal translations safe to use?

No automated translation should be treated as certified or as a substitute for a qualified professional. The UI flags these professional domains for human review.

### What is the current BLEU score?

There is no measured BLEU score yet. The results file is marked `not_run`, and the reference pairs require qualified bilingual review first.

### What does the health endpoint prove?

`GET /api/health` reports app status and whether `GEMINI_API_KEY` exists in the server environment. It does not verify model access, remaining quota, or successful inference.

## Presenter Checklist

- Start the Next.js app from the `translator/` project directory.
- Confirm `/api/health` returns `providerConfigured: true` without displaying secrets.
- Check model availability and Google AI Studio quota shortly before the demo.
- Use short, non-sensitive demo text.
- Keep the evaluation caveat visible: references need human review and current results are unrun.
- Do not claim the design-document NFR targets have been achieved unless new measurements support them.
- Keep a static screenshot/demo path ready if the provider is rate-limited.