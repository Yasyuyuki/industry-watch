import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { hasAnthropicKey, summarizeIndustry } from "@/lib/anthropic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type SummarizeResult = {
  ok: boolean;
  generated: number;
  skipped: number;
  errors: { industry: string; error: string }[];
  reason?: string;
};

async function summarize(): Promise<SummarizeResult> {
  if (!hasAnthropicKey()) {
    return {
      ok: false,
      generated: 0,
      skipped: 0,
      errors: [],
      reason: "ANTHROPIC_API_KEY が未設定です",
    };
  }

  const supabase = createServerClient();
  const result: SummarizeResult = {
    ok: true,
    generated: 0,
    skipped: 0,
    errors: [],
  };

  const { data: industries, error: indErr } = await supabase
    .from("industries")
    .select("*")
    .eq("enabled", true);

  if (indErr) {
    return {
      ok: false,
      generated: 0,
      skipped: 0,
      errors: [{ industry: "(load)", error: indErr.message }],
    };
  }

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  for (const ind of industries ?? []) {
    try {
      const { data: items, error: itmErr } = await supabase
        .from("items")
        .select("id, title, summary, published_at, fetched_at")
        .eq("industry_id", ind.id)
        .gte("fetched_at", cutoff)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(50);

      if (itmErr) throw new Error(itmErr.message);
      if (!items || items.length === 0) {
        result.skipped++;
        continue;
      }

      const out = await summarizeIndustry({
        industryName: ind.name,
        items: items.map((it) => ({
          id: it.id,
          title: it.title,
          summary: it.summary,
          published_at: it.published_at,
        })),
      });

      if (!out.summary) {
        result.skipped++;
        continue;
      }

      const { error: upsertErr } = await supabase.from("daily_summaries").upsert(
        {
          industry_id: ind.id,
          date: todayStr,
          summary: out.summary,
          notable_item_ids: out.notableItemIds,
          generated_at: new Date().toISOString(),
        },
        { onConflict: "industry_id,date" }
      );

      if (upsertErr) throw new Error(upsertErr.message);
      result.generated++;
    } catch (e) {
      result.errors.push({
        industry: ind.name,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return result;
}

export async function GET() {
  const result = await summarize();
  return NextResponse.json(result);
}

export async function POST() {
  return GET();
}
