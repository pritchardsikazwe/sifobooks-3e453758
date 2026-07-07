import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Section = "summary" | "variance" | "cashflow" | "strategy";

const PROMPTS: Record<Section, { system: string; user: (facts: string) => string }> = {
  summary: {
    system: "You are a CFO writing an executive summary for the board of a small/medium business. Be direct, plain-English, and specific with numbers from the fact sheet. 3-5 short paragraphs.",
    user: (f) => `Write an executive summary of the following annual financial performance:\n\n${f}`,
  },
  variance: {
    system: "You are a financial analyst. Comment on margins, ratios, and any red flags implied by the numbers. Be numeric and concrete. Use bullet points.",
    user: (f) => `Give a variance & trend commentary from these numbers. Point out anything unusual or risky:\n\n${f}`,
  },
  cashflow: {
    system: "You are a treasury advisor. Give practical cashflow, working capital and funding advice based on the fact sheet. Numbered list of 5-8 actions.",
    user: (f) => `Recommend cashflow and funding actions this company should take next quarter:\n\n${f}`,
  },
  strategy: {
    system: "You are a growth strategist for SMEs. Recommend concrete growth, pricing, cost and sales-mix moves informed by the fact sheet. Numbered list of 5-8 actions.",
    user: (f) => `Suggest growth and strategy moves for the next 12 months:\n\n${f}`,
  },
};

export const generateAfsCommentary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => {
    const d = raw as { section: Section; factSheet: string };
    if (!d?.section || !PROMPTS[d.section]) throw new Error("invalid section");
    if (!d.factSheet || typeof d.factSheet !== "string") throw new Error("missing factSheet");
    return d;
  })
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const spec = PROMPTS[data.section];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: spec.system },
          { role: "user", content: spec.user(data.factSheet) },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) throw new Error("AI rate limit reached — try again shortly.");
      if (res.status === 402) throw new Error("AI credits exhausted — top up in Settings → Plans & credits.");
      throw new Error(`AI gateway error ${res.status}: ${text.slice(0, 200)}`);
    }
    const json: any = await res.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "";
    return { content };
  });
