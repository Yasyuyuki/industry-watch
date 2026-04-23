"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type SourceInput = { name: string; url: string };
type SuggestionInput = { name: string; keyword: string };

function newEmptySource(): SourceInput {
  return { name: "", url: "" };
}

export function AddIndustryDialog({ open, onOpenChange }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState<SuggestionInput[]>([
    { name: "", keyword: "" },
  ]);
  const [customSources, setCustomSources] = useState<SourceInput[]>([
    newEmptySource(),
  ]);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setKeywords([{ name: "", keyword: "" }]);
    setCustomSources([newEmptySource()]);
    setError(null);
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const submit = async () => {
    setError(null);

    if (!name.trim()) {
      setError("業界名を入力してください");
      return;
    }

    const validKeywords = keywords.filter((k) => k.keyword.trim());
    const validSources = customSources.filter(
      (s) => s.url.trim() && /^https?:\/\//.test(s.url.trim())
    );

    if (validKeywords.length === 0 && validSources.length === 0) {
      setError("最低1つのキーワード（Google News）またはRSS URLが必要です");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/industries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          keywords: validKeywords.map((k) => ({
            name: k.name.trim() || k.keyword.trim(),
            keyword: k.keyword.trim(),
          })),
          sources: validSources.map((s) => ({
            name: s.name.trim() || new URL(s.url).host,
            url: s.url.trim(),
          })),
        }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `HTTP ${res.status}`);
      }
      reset();
      handleOpenChange(false);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const busy = submitting || isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>業界を追加</DialogTitle>
          <DialogDescription>
            業界名と、Google Newsで拾いたいキーワード、もしくはRSSのURLを登録します。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="industry-name">業界名</Label>
            <Input
              id="industry-name"
              placeholder="例：ライブ配信、SaaS、Vtuber"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Google News キーワード（推奨）</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setKeywords([...keywords, { name: "", keyword: "" }])
                }
                disabled={busy}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                追加
              </Button>
            </div>
            <div className="space-y-2">
              {keywords.map((k, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <Input
                    placeholder="表示名 (任意)"
                    value={k.name}
                    onChange={(e) => {
                      const next = [...keywords];
                      next[i] = { ...next[i], name: e.target.value };
                      setKeywords(next);
                    }}
                    disabled={busy}
                  />
                  <Input
                    placeholder='検索キーワード 例: "Pococha"'
                    value={k.keyword}
                    onChange={(e) => {
                      const next = [...keywords];
                      next[i] = { ...next[i], keyword: e.target.value };
                      setKeywords(next);
                    }}
                    disabled={busy}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setKeywords(keywords.filter((_, idx) => idx !== i))
                    }
                    disabled={busy || keywords.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>RSS / Atom フィード URL (任意)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCustomSources([...customSources, newEmptySource()])}
                disabled={busy}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                追加
              </Button>
            </div>
            <div className="space-y-2">
              {customSources.map((s, i) => (
                <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2">
                  <Input
                    placeholder="表示名 (任意)"
                    value={s.name}
                    onChange={(e) => {
                      const next = [...customSources];
                      next[i] = { ...next[i], name: e.target.value };
                      setCustomSources(next);
                    }}
                    disabled={busy}
                  />
                  <Input
                    placeholder="https://example.com/feed.xml"
                    value={s.url}
                    onChange={(e) => {
                      const next = [...customSources];
                      next[i] = { ...next[i], url: e.target.value };
                      setCustomSources(next);
                    }}
                    disabled={busy}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setCustomSources(
                        customSources.filter((_, idx) => idx !== i)
                      )
                    }
                    disabled={busy || customSources.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={busy}
          >
            キャンセル
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            追加する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
