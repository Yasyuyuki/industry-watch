"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  RefreshCw,
  ArrowUpRight,
  Activity,
  Radio,
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AddIndustryDialog } from "@/components/add-industry-dialog";
import { formatDate } from "@/lib/utils";
import type { Industry, Item, Source } from "@/lib/types";

type Props = {
  industries: Industry[];
  sources: Source[];
  items: Item[];
};

export function Dashboard({ industries, sources, items }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isCollecting, setIsCollecting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const itemsByIndustry = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const it of items) {
      const arr = map.get(it.industry_id) ?? [];
      arr.push(it);
      map.set(it.industry_id, arr);
    }
    return map;
  }, [items]);

  const sourceCountByIndustry = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sources) {
      map.set(s.industry_id, (map.get(s.industry_id) ?? 0) + 1);
    }
    return map;
  }, [sources]);

  const totalItems = items.length;
  const totalSources = sources.length;

  const runCollect = async () => {
    setIsCollecting(true);
    try {
      const res = await fetch("/api/collect", { method: "POST" });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      startTransition(() => router.refresh());
    } catch (e) {
      alert(
        "収集に失敗しました: " + (e instanceof Error ? e.message : String(e))
      );
    } finally {
      setIsCollecting(false);
    }
  };

  const collecting = isCollecting || isPending;

  if (industries.length === 0) {
    return (
      <div className="space-y-10">
        <Header
          totalItems={0}
          totalSources={0}
          industriesCount={0}
          onAdd={() => setAddOpen(true)}
          onCollect={runCollect}
          collecting={collecting}
        />
        <EmptyState
          title="業界を登録してください"
          desc="右上「業界を追加」から、最初の業界とRSSソースを登録します。"
        />
        <AddIndustryDialog open={addOpen} onOpenChange={setAddOpen} />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <Header
        totalItems={totalItems}
        totalSources={totalSources}
        industriesCount={industries.length}
        onAdd={() => setAddOpen(true)}
        onCollect={runCollect}
        collecting={collecting}
      />

      <Tabs defaultValue={industries[0].id} className="w-full">
        <div className="border-b border-border/60">
          <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none bg-transparent p-0">
            {industries.map((ind) => (
              <TabsTrigger
                key={ind.id}
                value={ind.id}
                className="relative rounded-none border-b-2 border-transparent bg-transparent px-3 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                <span>{ind.name}</span>
                <span className="ml-2 font-mono text-[11px] text-muted-foreground/70">
                  {itemsByIndustry.get(ind.id)?.length ?? 0}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {industries.map((ind) => {
          const industryItems = itemsByIndustry.get(ind.id) ?? [];
          const srcCount = sourceCountByIndustry.get(ind.id) ?? 0;
          return (
            <TabsContent key={ind.id} value={ind.id} className="mt-8">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs uppercase tracking-widest text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-mono">
                    <Activity className="h-3.5 w-3.5" />
                    {industryItems.length} items
                  </span>
                  <span className="flex items-center gap-1.5 font-mono">
                    <Radio className="h-3.5 w-3.5" />
                    {srcCount} sources
                  </span>
                </div>
              </div>

              {industryItems.length === 0 ? (
                <EmptyState
                  title="まだ記事がありません"
                  desc="「Sync」を押すか、毎日のcronが動くのを待ってください。"
                />
              ) : (
                <div className="divide-y divide-border/50">
                  {industryItems.map((it) => (
                    <ItemRow key={it.id} item={it} />
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <AddIndustryDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

function Header({
  totalItems,
  totalSources,
  industriesCount,
  onAdd,
  onCollect,
  collecting,
}: {
  totalItems: number;
  totalSources: number;
  industriesCount: number;
  onAdd: () => void;
  onCollect: () => void;
  collecting: boolean;
}) {
  return (
    <header className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
            Industry Watch
          </div>
          <h1 className="text-balance font-sans text-3xl font-semibold tracking-tight md:text-4xl">
            業界の<span className="text-primary">脈動</span>を、
            <br className="hidden md:block" />
            毎朝ひとめで。
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCollect}
            disabled={collecting}
            className="font-mono text-xs uppercase tracking-wider"
          >
            <RefreshCw
              className={`mr-2 h-3.5 w-3.5 ${collecting ? "animate-spin" : ""}`}
            />
            {collecting ? "Syncing" : "Sync"}
          </Button>
          <Button
            size="sm"
            onClick={onAdd}
            className="font-mono text-xs uppercase tracking-wider"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border/60 bg-border/40">
        <Stat label="Items" value={totalItems} />
        <Stat label="Sources" value={totalSources} />
        <Stat label="Industries" value={industriesCount} />
      </div>
    </header>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card px-5 py-4">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-mono text-2xl font-medium tabular-nums">
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function ItemRow({ item }: { item: Item }) {
  const displayDate = item.published_at ?? item.fetched_at;
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block py-5 transition-colors hover:bg-accent/30"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/80">
            <span>{displayDate ? formatDate(displayDate) : "—"}</span>
            <span className="h-px w-4 bg-border" />
            <span className="truncate normal-case tracking-normal">
              {sourceHostFromUrl(item.url)}
            </span>
          </div>
          <h3 className="text-balance text-base font-medium leading-snug text-foreground transition-colors group-hover:text-primary">
            {item.title}
          </h3>
          {item.summary && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {item.summary}
            </p>
          )}
        </div>
        <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
    </a>
  );
}

function sourceHostFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host === "news.google.com") return "Google News";
    return host;
  } catch {
    return "";
  }
}

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="grid-bg flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 px-6 py-16 text-center">
      <div className="text-base font-medium">{title}</div>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
