import { audiences, professionalDomains, type AudienceId, type ProfessionalDomain, type TranslationTone } from "@/lib/audiences";
import type { ApprovedExample, TranslationDirection, TranslateInput } from "@/lib/translation";

export const MAX_INPUT_LENGTH = 5000;
export const MAX_BATCH_DOCUMENTS = 5;
const directions = ["auto", "en-ur", "ur-en"] as const;
const tones = ["natural", "formal", "casual"] as const;

type ValidationResult = { ok: true; value: TranslateInput } | { ok: false; error: string };

export function parseTranslationInput(body: unknown): ValidationResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const value = body as Record<string, unknown>;
  const text = value.text;
  const direction = value.direction ?? "auto";
  const romanUrdu = value.romanUrdu ?? false;
  const tone = value.tone ?? "natural";
  const audienceId = value.audienceId ?? "casual";
  const domain = value.domain ?? "general";

  if (typeof text !== "string" || !text.trim()) return { ok: false, error: "Enter some text to translate." };
  if (text.length > MAX_INPUT_LENGTH) return { ok: false, error: `Text must be ${MAX_INPUT_LENGTH.toLocaleString()} characters or fewer.` };
  if (typeof direction !== "string" || !directions.includes(direction as (typeof directions)[number])) {
    return { ok: false, error: "Choose automatic detection, English to Urdu, or Urdu to English." };
  }
  if (typeof romanUrdu !== "boolean") return { ok: false, error: "Roman Urdu mode must be true or false." };
  if (romanUrdu && direction !== "ur-en") return { ok: false, error: "Select Urdu to English before enabling Roman Urdu input." };
  if (typeof tone !== "string" || !tones.includes(tone as (typeof tones)[number])) return { ok: false, error: "Choose a supported tone." };
  if (typeof audienceId !== "string" || !audiences.some((audience) => audience.id === audienceId)) {
    return { ok: false, error: "Choose a supported audience profile." };
  }
  if (typeof domain !== "string" || !professionalDomains.some((item) => item.id === domain)) {
    return { ok: false, error: "Choose a supported professional domain." };
  }

  const rawExamples = value.approvedExamples ?? [];
  if (!Array.isArray(rawExamples) || rawExamples.length > 3) {
    return { ok: false, error: "At most three approved feedback examples can be included." };
  }
  const approvedExamples: ApprovedExample[] = [];
  for (const example of rawExamples) {
    if (!example || typeof example !== "object" || Array.isArray(example)) return { ok: false, error: "A feedback example is invalid." };
    const candidate = example as Record<string, unknown>;
    if (typeof candidate.source !== "string" || typeof candidate.translation !== "string" || !candidate.source.trim() || !candidate.translation.trim()) {
      return { ok: false, error: "A feedback example is missing its source or approved translation." };
    }
    if (candidate.source.length > 500 || candidate.translation.length > 1000) return { ok: false, error: "Feedback examples exceed the allowed size." };
    approvedExamples.push({ source: candidate.source, translation: candidate.translation });
  }

  return {
    ok: true,
    value: {
      text,
      direction: direction as TranslationDirection,
      romanUrdu,
      tone: tone as TranslationTone,
      audienceId: audienceId as AudienceId,
      domain: domain as ProfessionalDomain,
      approvedExamples,
    },
  };
}

export function providerErrorResponse(error: unknown): Response {
  const status = typeof error === "object" && error !== null && "status" in error
    ? (error as { status?: unknown }).status
    : undefined;
  const message = error instanceof Error ? error.message : "";

  if (/API_KEY_INVALID|API key not valid|unauthorized/i.test(message)) {
    return Response.json({ error: "Gemini rejected this API key. Check GEMINI_API_KEY in the server environment." }, { status: 503 });
  }
  if (status === 429) {
    return Response.json({ error: "Gemini's rate limit or quota was reached. Check your Google AI Studio limits and try again later." }, { status: 429 });
  }
  if (status === 503 || /UNAVAILABLE|high demand/i.test(message)) {
    return Response.json({ error: "Gemini is temporarily busy. Please wait a little and try again." }, { status: 503 });
  }
  if (status === 404 || /not found|not supported/i.test(message)) {
    return Response.json({ error: "The configured Gemini model is unavailable. Check GEMINI_MODEL and GEMINI_FALLBACK_MODEL." }, { status: 502 });
  }
  return Response.json({ error: "Gemini could not complete the translation. Check your model, API limits, and connection, then try again." }, { status: 502 });
}
