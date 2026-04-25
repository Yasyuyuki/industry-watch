import { createServerClient } from "@/lib/supabase";
import { Dashboard } from "@/components/dashboard";
import type { DailySummary, Industry, Item, Source } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getData() {
  const supabase = createServerClient();

  const { data: industries, error: indErr } = await supabase
    .from("industries")
    .select("*")
    .eq("enabled", true)
    .order("created_at", { ascending: true });

  if (indErr) throw new Error(indErr.message);

  const { data: sources, error: srcErr } = await supabase
    .from("sources")
    .select("*")
    .eq("enabled", true);

  if (srcErr) throw new Error(srcErr.message);

  const { data: items, error: itmErr } = await supabase
    .from("items")
    .select("*")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(500);

  if (itmErr) throw new Error(itmErr.message);

  let summaries: DailySummary[] = [];
  const { data: sumData } = await supabase
    .from("daily_summaries")
    .select("*")
    .order("date", { ascending: false })
    .limit(50);
  if (sumData) {
    summaries = sumData as DailySummary[];
  }

  return {
    industries: (industries ?? []) as Industry[],
    sources: (sources ?? []) as Source[],
    items: (items ?? []) as Item[],
    summaries,
  };
}

export default async function Home() {
  let data: Awaited<ReturnType<typeof getData>>;
  try {
    data = await getData();
  } catch (e) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Industry Watch
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          セットアップが必要です
        </h1>
        <div className="mt-8 rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-sm">
          <p className="text-muted-foreground">
            Supabase環境変数が未設定、またはテーブル未作成のようです。READMEの手順をご確認ください。
          </p>
          <p className="mt-3 font-mono text-xs text-destructive/80">
            {e instanceof Error ? e.message : String(e)}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 md:py-16">
      <Dashboard
        industries={data.industries}
        sources={data.sources}
        items={data.items}
        summaries={data.summaries}
      />
    </main>
  );
}
