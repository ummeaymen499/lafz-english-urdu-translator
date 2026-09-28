import { translateText } from "@/lib/translation";
import { parseTranslationInput, providerErrorResponse } from "@/lib/translateRequest";
import {
  httpRequestsTotal,
  translationErrorsTotal,
  translationLatencyMs,
  latencyTargetMetTotal,
  qualityScoreHistogram,
  inputTokensTotal,
  outputTokensTotal,
  estimatedCostUsdTotal,
  fallbackModelUsageTotal,
  reviewFlaggedTotal,
  inFlightRequests,
} from "@/lib/metrics";

export const runtime = "nodejs";

const ENDPOINT = "translate";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    httpRequestsTotal.inc({ endpoint: ENDPOINT, method: "POST", status_code: "400" });
    return Response.json({ error: "Send a valid JSON request." }, { status: 400 });
  }

  const parsed = parseTranslationInput(body);
  if (!parsed.ok) {
    httpRequestsTotal.inc({ endpoint: ENDPOINT, method: "POST", status_code: "400" });
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  inFlightRequests.inc({ endpoint: ENDPOINT });
  try {
    const result = await translateText(parsed.value);

    // ── Record metrics ────────────────────────────────────────────────────
    const direction = `${result.sourceLanguage}->${result.targetLanguage}`;
    const audience = parsed.value.audienceId;

    translationLatencyMs.observe(
      { endpoint: ENDPOINT, direction, model: result.model },
      result.latencyMs,
    );
    latencyTargetMetTotal.inc({ met: String(result.latencyTargetMet) });
    qualityScoreHistogram.observe({ direction, audience }, result.qualityScore);

    if (result.inputTokens !== undefined) {
      inputTokensTotal.inc({ model: result.model }, result.inputTokens);
    }
    if (result.outputTokens !== undefined) {
      outputTokensTotal.inc({ model: result.model }, result.outputTokens);
    }
    if (result.estimatedCostUsd !== undefined) {
      estimatedCostUsdTotal.inc({ model: result.model }, result.estimatedCostUsd);
    }
    if (result.usedFallback) {
      fallbackModelUsageTotal.inc({ model: result.model });
    }
    if (result.needsReview) {
      reviewFlaggedTotal.inc({ direction, audience });
    }

    httpRequestsTotal.inc({ endpoint: ENDPOINT, method: "POST", status_code: "200" });
    return Response.json(result);
  } catch (error) {
    const status = typeof error === "object" && error !== null && "status" in error
      ? (error as { status?: unknown }).status
      : undefined;
    const statusCode = typeof status === "number" ? String(status) : "502";
    httpRequestsTotal.inc({ endpoint: ENDPOINT, method: "POST", status_code: statusCode });
    translationErrorsTotal.inc({ endpoint: ENDPOINT, error_type: statusCode });
    console.error("Gemini translation request failed", { status });
    return providerErrorResponse(error);
  } finally {
    inFlightRequests.dec({ endpoint: ENDPOINT });
  }
}
