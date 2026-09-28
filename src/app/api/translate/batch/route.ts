import { translateText } from "@/lib/translation";
import { MAX_BATCH_DOCUMENTS, parseTranslationInput } from "@/lib/translateRequest";
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

const ENDPOINT = "translate/batch";

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
  const documents = (body as Record<string, unknown>).documents;
  if (!Array.isArray(documents) || documents.length === 0 || documents.length > MAX_BATCH_DOCUMENTS) {
    httpRequestsTotal.inc({ endpoint: ENDPOINT, method: "POST", status_code: "400" });
    return Response.json({ error: `Provide between 1 and ${MAX_BATCH_DOCUMENTS} documents per batch.` }, { status: 400 });
  }

  const common = body as Record<string, unknown>;
  const inputs = documents.map((document, index) => {
    if (!document || typeof document !== "object" || Array.isArray(document)) {
      return { index, error: "Each document must be an object." } as const;
    }
    const value = document as Record<string, unknown>;
    const parsed = parseTranslationInput({
      ...common,
      text: value.text,
      direction: value.direction ?? common.direction,
      romanUrdu: value.romanUrdu ?? common.romanUrdu,
      audienceId: value.audienceId ?? common.audienceId,
      domain: value.domain ?? common.domain,
      tone: value.tone ?? common.tone,
    });
    return parsed.ok ? { index, input: parsed.value } as const : { index, error: parsed.error } as const;
  });

  const invalid = inputs.find((item) => "error" in item);
  if (invalid && "error" in invalid) {
    httpRequestsTotal.inc({ endpoint: ENDPOINT, method: "POST", status_code: "400" });
    return Response.json({ error: `Document ${invalid.index + 1}: ${invalid.error}` }, { status: 400 });
  }

  inFlightRequests.inc({ endpoint: ENDPOINT });
  try {
    const results = await Promise.all(inputs.map(async (item) => {
      if (!("input" in item) || !item.input) return { index: item.index, error: "error" in item ? item.error : "Invalid document." };
      try {
        const result = await translateText(item.input);

        // ── Per-document metrics ──────────────────────────────────────────
        const direction = `${result.sourceLanguage}->${result.targetLanguage}`;
        const audience = item.input.audienceId;

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

        return { index: item.index, ...result };
      } catch (error) {
        const status = typeof error === "object" && error !== null && "status" in error
          ? (error as { status?: unknown }).status
          : undefined;
        const statusCode = typeof status === "number" ? String(status) : "502";
        translationErrorsTotal.inc({ endpoint: ENDPOINT, error_type: statusCode });
        return { index: item.index, error: "This document could not be translated. Check the configured model, API limits, and connection." };
      }
    }));

    httpRequestsTotal.inc({ endpoint: ENDPOINT, method: "POST", status_code: "200" });
    return Response.json({ results });
  } finally {
    inFlightRequests.dec({ endpoint: ENDPOINT });
  }
}
