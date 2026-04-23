import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { googleNewsRssFor } from "@/lib/rss";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-一-龠ぁ-んァ-ヴー]/g, "")
    .slice(0, 64);
}

type Body = {
  name: string;
  keywords?: { name: string; keyword: string }[];
  sources?: { name: string; url: string }[];
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const supabase = createServerClient();

  const slug = slugify(name) || `industry-${Date.now()}`;

  const { data: industry, error: indErr } = await supabase
    .from("industries")
    .insert({ name, slug, enabled: true })
    .select()
    .single();

  if (indErr || !industry) {
    return NextResponse.json(
      { error: indErr?.message ?? "failed to create industry" },
      { status: 500 }
    );
  }

  const sourceRows: {
    industry_id: string;
    name: string;
    url: string;
    enabled: boolean;
  }[] = [];

  for (const k of body.keywords ?? []) {
    if (!k.keyword.trim()) continue;
    sourceRows.push({
      industry_id: industry.id,
      name: k.name || `Google News: ${k.keyword}`,
      url: googleNewsRssFor(k.keyword),
      enabled: true,
    });
  }

  for (const s of body.sources ?? []) {
    if (!s.url.trim()) continue;
    sourceRows.push({
      industry_id: industry.id,
      name: s.name || new URL(s.url).host,
      url: s.url,
      enabled: true,
    });
  }

  if (sourceRows.length) {
    const { error: srcErr } = await supabase.from("sources").insert(sourceRows);
    if (srcErr) {
      return NextResponse.json({ error: srcErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ industry, sourceCount: sourceRows.length });
}
