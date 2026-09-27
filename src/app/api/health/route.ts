export const runtime = "nodejs";

export async function GET() {
  const configured = Boolean(process.env.GEMINI_API_KEY);
  return Response.json({
    status: "ok",
    providerConfigured: configured,
    timestamp: new Date().toISOString(),
  }, { status: configured ? 200 : 503 });
}
