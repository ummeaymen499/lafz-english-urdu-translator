import { translateText, type TranslationDirection } from "@/lib/translation";
import { providerErrorResponse } from "@/lib/translateRequest";
import { audiences, professionalDomains, type AudienceId, type ProfessionalDomain, type TranslationTone } from "@/lib/audiences";
import {
  httpRequestsTotal,
  translationErrorsTotal,
  translationLatencyMs,
  latencyTargetMetTotal,
  fallbackModelUsageTotal,
  inFlightRequests,
} from "@/lib/metrics";

export const runtime = "nodejs";

const ENDPOINT = "translate/verify";
const MAX_TEXT_LENGTH = 5000;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    httpRequestsTotal.inc({ endpoint: ENDPOINT, method: "POST", status_code: "400" });
    return Response.json({ error: "Send a valid JSON request." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    httpRequestsTotal.inc({ endpoint: ENDPOINT, method: "POST", status_code: "400" });
    return Response.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }

  const value = body as Record<string, unknown>;
  const source = value.source;
  const translation = value.translation;
  const direction = value.direction;
  const tone = value.tone ?? "natural";
  const audienceId = value.audienceId ?? "casual";
  const domain = value.domain ?? "general";

  if (typeof source !== "string" || !source.trim() || source.length > MAX_TEXT_LENGTH) {
    httpRequestsTotal.inc({ endpoint: ENDPOINT, method: "POST", status_code: "400" });
    return Response.json({ error: "The original text is missing or exceeds 5,000 characters." }, { status: 400 });
  }
  if (typeof translation !== "string" || !translation.trim() || translation.length > MAX_TEXT_LENGTH) {
    httpRequestsTotal.inc({ endpoint: ENDPOINT, method: "POST", status_code: "400" });
    return Response.json({ error: "The translation is missing or exceeds 5,000 characters." }, { status: 400 });
  }
  if (direction !== "en-ur" && direction !== "ur-en") {
    httpRequestsTotal.inc({ endpoint: ENDPOINT, method: "POST", status_code: "400" });
    return Response.json({ error: "Select a fixed translation direction before checking meaning." }, { status: 400 });
  }
  if (typeof tone !== "string" || !["natural", "formal", "casual"].includes(tone)) {
    httpRequestsTotal.inc({ endpoint: ENDPOINT, method: "POST", status_code: "400" });
    return Response.json({ error: "Choose a supported tone." }, { status: 400 });
  }
  if (typeof audienceId !== "string" || !audiences.some((audience) => audience.id === audienceId)) {
    httpRequestsTotal.inc({ endpoint: ENDPOINT, method: "POST", status_code: "400" });
    return Response.json({ error: "Choose a supported audience profile." }, { status: 400 });
  }
  if (typeof domain !== "string" || !professionalDomains.some((item) => item.id === domain)) {
    httpRequestsTotal.inc({ endpoint: ENDPOINT, method: "POST", status_code: "400" });
    return Response.json({ error: "Choose a supported professional domain." }, { status: 400 });
  }

  const reverseDirection: TranslationDirection = direction === "en-ur" ? "ur-en" : "en-ur";
  inFlightRequests.inc({ endpoint: ENDPOINT });
  try {
    const result = await translateText({
      text: translation,
      direction: reverseDirection,
      tone: tone as TranslationTone,
      audienceId: audienceId as AudienceId,
      domain: domain as ProfessionalDomain,
    });

    const dir = `${result.sourceLanguage}->${result.targetLanguage}`;
    translationLatencyMs.observe({ endpoint: ENDPOINT, direction: dir, model: result.model }, result.latencyMs);
    latencyTargetMetTotal.inc({ met: String(result.latencyTargetMet) });
    if (result.usedFallback) {
      fallbackModelUsageTotal.inc({ model: result.model });
    }

    httpRequestsTotal.inc({ endpoint: ENDPOINT, method: "POST", status_code: "200" });
    return Response.json({
      backTranslation: result.translation,
      sourceLanguage: result.sourceLanguage,
      targetLanguage: result.targetLanguage,
      latencyMs: result.latencyMs,
      model: result.model,
      usedFallback: result.usedFallback,
      note: "Compare this independently generated back-translation with the original. Similarity is a review aid, not proof of correctness.",
    });
  } catch (error) {
    const status = typeof error === "object" && error !== null && "status" in error
      ? (error as { status?: unknown }).status
      : undefined;
    const statusCode = typeof status === "number" ? String(status) : "502";
    httpRequestsTotal.inc({ endpoint: ENDPOINT, method: "POST", status_code: statusCode });
    translationErrorsTotal.inc({ endpoint: ENDPOINT, error_type: statusCode });
    console.error("Gemini meaning-check request failed", { status });
    return providerErrorResponse(error);
  } finally {
    inFlightRequests.dec({ endpoint: ENDPOINT });
  }
}
