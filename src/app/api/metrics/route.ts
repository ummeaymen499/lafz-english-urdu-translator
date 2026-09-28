/**
 * GET /api/metrics
 *
 * Prometheus scrape endpoint.  Prometheus is configured to hit this route
 * every 15 s (see prometheus.yml in the repo root).
 *
 * Access is protected by a bearer token when METRICS_TOKEN env var is set.
 * Leave METRICS_TOKEN unset only in local development.
 */

import { registry } from "@/lib/metrics";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
// Never cache the metrics response.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // ── Optional bearer-token auth ────────────────────────────────────────────
  const metricsToken = process.env.METRICS_TOKEN;
  if (metricsToken) {
    const authHeader = request.headers.get("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (token !== metricsToken) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  try {
    const metrics = await registry.metrics();
    return new Response(metrics, {
      status: 200,
      headers: {
        "Content-Type": registry.contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to collect metrics", error);
    return new Response("Failed to collect metrics", { status: 500 });
  }
}
