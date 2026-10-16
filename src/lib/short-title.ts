// Scott 10-16: the résumé's title often runs past the 42-character limit — shorten it with one small AI call,
// falling back to cutting at a word boundary. Never cuts mid-word.
import { resolveProvider } from "@/lib/resume/ai-provider";

const cutAtWord = (s: string, max: number) => {
  if (s.length <= max) return s;
  const cut = s.slice(0, max + 1).replace(/[\s,&/|·-]+\S*$/, "").replace(/[\s,&/|·-]+$/, "");
  return cut || s.slice(0, max);
};

export async function shortTitle(title: string, max = 42): Promise<string> {
  const t = title.trim();
  if (t.length <= max) return t;
  const cfg = resolveProvider();
  const ask = `Shorten this professional title to at most ${max} characters. Keep the most important words, no quotes, no trailing punctuation:\n${t}`;
  try {
    let out = "";
    if (cfg?.provider === "anthropic") {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const r = await new Anthropic({ apiKey: cfg.apiKey }).messages.create({ model: cfg.model, max_tokens: 60, messages: [{ role: "user", content: ask }] }, { timeout: 15_000 });
      out = r.content.map((c) => ("text" in c ? c.text : "")).join("");
    } else if (cfg) {
      const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
        body: JSON.stringify({ model: cfg.model, max_completion_tokens: 800, ...(/^(gpt-5|o1|o3|o4)/i.test(cfg.model) ? { reasoning_effort: "low" } : {}), messages: [{ role: "user", content: ask }] }),
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) out = ((await res.json()) as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content ?? "";
    }
    out = out.trim().replace(/^["']|["']$/g, "");
    if (out && out.length <= max) return out;
  } catch {
    /* fall through to the word cut */
  }
  return cutAtWord(t, max);
}
