import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { fetchAndParseRss } from "@/lib/rss";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type CollectResult = {
  ok: boolean;
  sources: number;
  fetched: number;
  inserted: number;
  errors: { source: string; error: string }[];
};

async function collect(): Promise<CollectResult> {
  const supabase = createServerClient();
  const { data: sources, error: srcErr } = await supabase
    .from("sources")
    .select("*, industries!inner(*)")
    .eq("enabled", true)
    .eq("industries.enabled", true);

  if (srcErr) throw new Error(srcErr.message);

  const result: CollectResult = {
    ok: true,
    sources: sources?.length ?? 0,
    fetched: 0,
    inserted: 0,
    errors: [],
  };

  for (const src of sources ?? []) {
    try {
      const parsed = await fetchAndParseRss(src.url);
      result.fetched += parsed.length;
      if (parsed.length === 0) continue;

      const rows = parsed
        .filter((p) => p.title && p.url)
        .map((p) => ({
          source_id: src.id,
          industry_id: src.industry_id,
          title: p.title,
          url: p.url,
          summary: p.summary,
          published_at: p.published_at,
        }));

      if (rows.length === 0) continue;

      const { error: upsertErr, count } = await supabase
        .from("items")
        .upsert(rows, {
          onConflict: "source_id,url",
          ignoreDuplicates: true,
          count: "exact",
        });

      if (upsertErr) {
        result.errors.push({ source: src.name, error: upsertErr.message });
      } else {
        result.inserted += count ?? 0;
      }
    } catch (e) {
      result.errors.push({
        source: src.name,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return result;
}

export async function GET() {
  try {
    const result = await collect();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
