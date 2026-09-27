import { translateText, type TranslationDirection } from "@/lib/translation";
import { providerErrorResponse } from "@/lib/translateRequest";
import { audiences, professionalDomains, type AudienceId, type ProfessionalDomain, type TranslationTone } from "@/lib/audiences";

export const runtime = "nodejs";

const MAX_TEXT_LENGTH = 5000;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send a valid JSON request." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
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
    return Response.json({ error: "The original text is missing or exceeds 5,000 characters." }, { status: 400 });
  }
  if (typeof translation !== "string" || !translation.trim() || translation.length > MAX_TEXT_LENGTH) {
    return Response.json({ error: "The translation is missing or exceeds 5,000 characters." }, { status: 400 });
  }
  if (direction !== "en-ur" && direction !== "ur-en") {
    return Response.json({ error: "Select a fixed translation direction before checking meaning." }, { status: 400 });
  }
  if (typeof tone !== "string" || !["natural", "formal", "casual"].includes(tone)) {
    return Response.json({ error: "Choose a supported tone." }, { status: 400 });
  }
  if (typeof audienceId !== "string" || !audiences.some((audience) => audience.id === audienceId)) {
    return Response.json({ error: "Choose a supported audience profile." }, { status: 400 });
  }
  if (typeof domain !== "string" || !professionalDomains.some((item) => item.id === domain)) {
    return Response.json({ error: "Choose a supported professional domain." }, { status: 400 });
  }

  const reverseDirection: TranslationDirection = direction === "en-ur" ? "ur-en" : "en-ur";
  try {
    const result = await translateText({
      text: translation,
      direction: reverseDirection,
      tone: tone as TranslationTone,
      audienceId: audienceId as AudienceId,
      domain: domain as ProfessionalDomain,
    });
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
    console.error("Gemini meaning-check request failed", { status: typeof error === "object" && error !== null && "status" in error ? (error as { status?: unknown }).status : undefined });
    return providerErrorResponse(error);
  }
}
