"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw, ExternalLink } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  const runCollect = async () => {
    setIsCollecting(true);
    try {
      const res = await fetch("/api/collect", { method: "POST" });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      startTransition(() => router.refresh());
    } catch (e) {
      alert("収集に失敗しました: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsCollecting(false);
    }
  };

  if (industries.length === 0) {
    return (
      <div className="space-y-6">
        <Header onAdd={() => setAddOpen(true)} onCollect={runCollect} collecting={isCollecting || isPending} />
        <Card>
          <CardHeader>
            <CardTitle>業界がまだ登録されていません</CardTitle>
            <CardDescription>
              右上の「業界を追加」から最初の業界とRSSソースを登録してください。
            </CardDescription>
          </CardHeader>
        </Card>
        <AddIndustryDialog open={addOpen} onOpenChange={setAddOpen} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header onAdd={() => setAddOpen(true)} onCollect={runCollect} collecting={isCollecting || isPending} />

      <Tabs defaultValue={industries[0].id} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          {industries.map((ind) => (
            <TabsTrigger key={ind.id} value={ind.id}>
              {ind.name}
              <Badge variant="secondary" className="ml-2">
                {itemsByIndustry.get(ind.id)?.length ?? 0}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {industries.map((ind) => {
          const industryItems = itemsByIndustry.get(ind.id) ?? [];
          const srcCount = sourceCountByIndustry.get(ind.id) ?? 0;
          return (
            <TabsContent key={ind.id} value={ind.id} className="mt-6">
              <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {industryItems.length} 件の記事 / {srcCount} ソース
                </span>
              </div>
              {industryItems.length === 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">まだ記事がありません</CardTitle>
                    <CardDescription>
                      「今すぐ収集」を押すか、1日1回のcronが動くのを待ってください。
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {industryItems.map((it) => (
                    <ItemCard key={it.id} item={it} />
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
  onAdd,
  onCollect,
  collecting,
}: {
  onAdd: () => void;
  onCollect: () => void;
  collecting: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Industry Watch
        </h1>
        <p className="text-sm text-muted-foreground">
          業界ニュース自動収集ダッシュボード
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onCollect} disabled={collecting}>
          <RefreshCw className={`mr-2 h-4 w-4 ${collecting ? "animate-spin" : ""}`} />
          {collecting ? "収集中..." : "今すぐ収集"}
        </Button>
        <Button size="sm" onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" />
          業界を追加
        </Button>
      </div>
    </div>
  );
}

function ItemCard({ item }: { item: Item }) {
  const displayDate = item.published_at ?? item.fetched_at;
  return (
    <Card className="transition-colors hover:bg-accent/40">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base leading-snug">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {item.title}
              <ExternalLink className="ml-1 inline h-3.5 w-3.5 text-muted-foreground" />
            </a>
          </CardTitle>
        </div>
        <CardDescription className="text-xs">
          {displayDate ? formatDate(displayDate) : "—"}
        </CardDescription>
      </CardHeader>
      {item.summary && (
        <CardContent className="pt-0">
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {item.summary}
          </p>
        </CardContent>
      )}
    </Card>
  );
}
