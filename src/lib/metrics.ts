/**
 * metrics.ts
 *
 * Central Prometheus metrics registry for the translator app.
 * Uses a singleton pattern safe for Next.js hot-reload (dev) and
 * multi-worker (production) Node.js environments.
 *
 * Exposed on GET /api/metrics — scraped by Prometheus every 15 s.
 */

import {
  Counter,
  Histogram,
  Gauge,
  Registry,
  collectDefaultMetrics,
} from "prom-client";

// ─── Singleton guard ──────────────────────────────────────────────────────────
// In Next.js dev mode the module is re-evaluated on every hot-reload.
// We pin the registry on `globalThis` so metrics don't get re-registered.
const globalForMetrics = globalThis as typeof globalThis & {
  __translatorMetricsRegistry?: Registry;
};

function buildRegistry(): Registry {
  const registry = new Registry();
  registry.setDefaultLabels({ app: "translator" });
  collectDefaultMetrics({ register: registry, prefix: "translator_" });
  return registry;
}

export const registry: Registry =
  globalForMetrics.__translatorMetricsRegistry ??
  (globalForMetrics.__translatorMetricsRegistry = buildRegistry());

// ─── Helper: get-or-create a metric ──────────────────────────────────────────
// Guards against "metric already registered" errors on hot-reload.
function getOrCreate<T>(create: () => T, name: string): T {
  const existing = registry.getSingleMetric(name);
  return (existing as T | undefined) ?? create();
}

// ─── Translation request counters ────────────────────────────────────────────

/** Total translation API requests, labelled by endpoint and HTTP status. */
export const httpRequestsTotal = getOrCreate(
  () =>
    new Counter({
      name: "translator_http_requests_total",
      help: "Total HTTP requests handled by the translator API.",
      labelNames: ["endpoint", "method", "status_code"] as const,
      registers: [registry],
    }),
  "translator_http_requests_total",
);

/** Translation errors, labelled by endpoint and error type. */
export const translationErrorsTotal = getOrCreate(
  () =>
    new Counter({
      name: "translator_errors_total",
      help: "Total translation errors by endpoint and error category.",
      labelNames: ["endpoint", "error_type"] as const,
      registers: [registry],
    }),
  "translator_errors_total",
);

/** How many times the fallback model was used. */
export const fallbackModelUsageTotal = getOrCreate(
  () =>
    new Counter({
      name: "translator_fallback_model_usage_total",
      help: "Number of translation requests that used the fallback model.",
      labelNames: ["model"] as const,
      registers: [registry],
    }),
  "translator_fallback_model_usage_total",
);

/** Translations that were flagged for human review. */
export const reviewFlaggedTotal = getOrCreate(
  () =>
    new Counter({
      name: "translator_review_flagged_total",
      help: "Translation responses flagged for human review.",
      labelNames: ["direction", "audience"] as const,
      registers: [registry],
    }),
  "translator_review_flagged_total",
);

// ─── Latency histograms ───────────────────────────────────────────────────────

/** End-to-end translation latency in milliseconds. */
export const translationLatencyMs = getOrCreate(
  () =>
    new Histogram({
      name: "translator_latency_ms",
      help: "End-to-end translation latency in milliseconds (p50 / p95 / p99).",
      labelNames: ["endpoint", "direction", "model"] as const,
      // Buckets tuned for a 2 s short-text / 10 s long-text SLA
      buckets: [100, 250, 500, 1000, 2000, 4000, 6000, 10000, 20000],
      registers: [registry],
    }),
  "translator_latency_ms",
);

/** Whether the translation met its latency target (1 = yes, 0 = no). */
export const latencyTargetMetTotal = getOrCreate(
  () =>
    new Counter({
      name: "translator_latency_target_met_total",
      help: "Translations that met (met=true) or missed (met=false) the latency SLA.",
      labelNames: ["met"] as const,
      registers: [registry],
    }),
  "translator_latency_target_met_total",
);

// ─── Quality score histogram ──────────────────────────────────────────────────

/** Distribution of model-reported quality scores (0–100). */
export const qualityScoreHistogram = getOrCreate(
  () =>
    new Histogram({
      name: "translator_quality_score",
      help: "Distribution of translation quality scores (0–100) returned by the model.",
      labelNames: ["direction", "audience"] as const,
      buckets: [50, 60, 70, 75, 80, 85, 90, 95, 100],
      registers: [registry],
    }),
  "translator_quality_score",
);

// ─── Token usage and cost ─────────────────────────────────────────────────────

/** Cumulative input tokens consumed. */
export const inputTokensTotal = getOrCreate(
  () =>
    new Counter({
      name: "translator_input_tokens_total",
      help: "Cumulative input (prompt) tokens sent to the model.",
      labelNames: ["model"] as const,
      registers: [registry],
    }),
  "translator_input_tokens_total",
);

/** Cumulative output tokens produced. */
export const outputTokensTotal = getOrCreate(
  () =>
    new Counter({
      name: "translator_output_tokens_total",
      help: "Cumulative output (completion) tokens produced by the model.",
      labelNames: ["model"] as const,
      registers: [registry],
    }),
  "translator_output_tokens_total",
);

/** Cumulative estimated USD cost. */
export const estimatedCostUsdTotal = getOrCreate(
  () =>
    new Counter({
      name: "translator_estimated_cost_usd_total",
      help: "Cumulative estimated cost in USD (requires GEMINI_INPUT_USD_PER_MILLION and GEMINI_OUTPUT_USD_PER_MILLION env vars).",
      labelNames: ["model"] as const,
      registers: [registry],
    }),
  "translator_estimated_cost_usd_total",
);

// ─── In-flight gauge ──────────────────────────────────────────────────────────

/** Number of translation requests currently in-flight. */
export const inFlightRequests = getOrCreate(
  () =>
    new Gauge({
      name: "translator_in_flight_requests",
      help: "Number of translation requests currently being processed.",
      labelNames: ["endpoint"] as const,
      registers: [registry],
    }),
  "translator_in_flight_requests",
);
