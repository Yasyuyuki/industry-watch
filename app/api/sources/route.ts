import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { googleNewsRssFor } from "@/lib/rss";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  industry_id: string;
  name?: string;
  url?: string;
  keyword?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (!body.industry_id) {
    return NextResponse.json(
      { error: "industry_id is required" },
      { status: 400 }
    );
  }

  const url = body.url?.trim()
    ? body.url.trim()
    : body.keyword
      ? googleNewsRssFor(body.keyword.trim())
      : null;

  if (!url) {
    return NextResponse.json(
      { error: "url or keyword is required" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("sources")
    .insert({
      industry_id: body.industry_id,
      name:
        body.name?.trim() ||
        (body.keyword
          ? `Google News: ${body.keyword}`
          : new URL(url).host),
      url,
      enabled: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ source: data });
}
