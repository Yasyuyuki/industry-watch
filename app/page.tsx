import { createServerClient } from "@/lib/supabase";
import { Dashboard } from "@/components/dashboard";
import type { Industry, Item, Source } from "@/lib/types";

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

  return {
    industries: (industries ?? []) as Industry[],
    sources: (sources ?? []) as Source[],
    items: (items ?? []) as Item[],
  };
}

export default async function Home() {
  let data: Awaited<ReturnType<typeof getData>>;
  try {
    data = await getData();
  } catch (e) {
    return (
      <main className="container max-w-5xl py-10">
        <h1 className="text-3xl font-bold tracking-tight">Industry Watch</h1>
        <div className="mt-6 rounded-lg border border-destructive/50 bg-destructive/5 p-6 text-sm">
          <p className="font-semibold text-destructive">セットアップが必要です</p>
          <p className="mt-2 text-muted-foreground">
            Supabase環境変数が未設定、またはテーブル未作成のようです。README の手順をご確認ください。
          </p>
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            {e instanceof Error ? e.message : String(e)}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="container max-w-5xl py-6 md:py-10">
      <Dashboard
        industries={data.industries}
        sources={data.sources}
        items={data.items}
      />
    </main>
  );
}
