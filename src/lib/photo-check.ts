// Scott 10-16: a profile photo must be one real adult person with the face visible, not a dog, a couch or a child.
// One small vision call per upload on the parser model already configured. If no model is set up or the call
// fails, the photo is allowed: a broken check does not stop sign-up.
import { resolveProvider } from "@/lib/resume/ai-provider";

export const PHOTO_REJECTED = "Please use a clear photo of yourself: one adult person, with your face visible.";

const QUESTION =
  "Is this image a photo of exactly one real adult person whose face is clearly visible, suitable as a professional profile picture? " +
  "Answer false for animals, objects, furniture, scenery, cartoons, drawings, logos, screenshots, more than one person, or a child.";

/** Uploads: a broken or missing check lets the photo through. */
export async function photoLooksLikePerson(bytes: ArrayBuffer, mime: string): Promise<boolean> {
  return (await checkPerson(bytes, mime)) ?? true;
}
/** Scott 10-17: a photo taken from a résumé is used only when the check says YES (no model → not used). */
export async function photoIsSurelyPerson(bytes: ArrayBuffer, mime: string): Promise<boolean> {
  return (await checkPerson(bytes, mime)) === true;
}
async function checkPerson(bytes: ArrayBuffer, mime: string): Promise<boolean | null> {
  const cfg = resolveProvider();
  if (!cfg) return null;
  const b64 = Buffer.from(bytes).toString("base64");
  try {
    if (cfg.provider === "anthropic") {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey: cfg.apiKey });
      const r = await client.messages.create(
        {
          model: cfg.model,
          max_tokens: 20,
          messages: [{ role: "user", content: [
            { type: "image", source: { type: "base64", media_type: mime as "image/jpeg", data: b64 } },
            { type: "text", text: `${QUESTION} Reply with only true or false.` },
          ] }],
        },
        { timeout: 20_000 }
      );
      const text = r.content.map((c) => ("text" in c ? c.text : "")).join("").toLowerCase();
      return text.includes("false") ? false : text.includes("true") ? true : null;
    }
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({
        model: cfg.model,
        max_completion_tokens: 1500,
        ...(/^(gpt-5|o1|o3|o4)/i.test(cfg.model) ? { reasoning_effort: "low" } : {}),
        messages: [{ role: "user", content: [
          { type: "text", text: QUESTION },
          { type: "image_url", image_url: { url: `data:${mime};base64,${b64}`, detail: "low" } },
        ] }],
        response_format: {
          type: "json_schema",
          json_schema: { name: "photo_check", strict: true, schema: { type: "object", additionalProperties: false, properties: { ok: { type: "boolean" } }, required: ["ok"] } },
        },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const parsed = JSON.parse(body.choices?.[0]?.message?.content ?? "{}") as { ok?: boolean };
    return typeof parsed.ok === "boolean" ? parsed.ok : null;
  } catch (e) {
    console.warn("[photo-check] skipped:", (e as Error).message);
    return null;
  }
}
