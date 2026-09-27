import { translateText } from "@/lib/translation";
import { parseTranslationInput, providerErrorResponse } from "@/lib/translateRequest";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send a valid JSON request." }, { status: 400 });
  }

  const parsed = parseTranslationInput(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  try {
    return Response.json(await translateText(parsed.value));
  } catch (error) {
    console.error("Gemini translation request failed", { status: typeof error === "object" && error !== null && "status" in error ? (error as { status?: unknown }).status : undefined });
    return providerErrorResponse(error);
  }
}
