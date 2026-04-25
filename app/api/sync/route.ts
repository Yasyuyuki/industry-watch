import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function callInternal(req: Request, path: string) {
  const url = new URL(req.url);
  const target = `${url.origin}${path}`;
  const res = await fetch(target, { method: "POST", cache: "no-store" });
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, body: JSON.parse(text) };
  } catch {
    return { ok: res.ok, status: res.status, body: text };
  }
}

async function runSync(req: Request) {
  const collect = await callInternal(req, "/api/collect");
  const summarize = await callInternal(req, "/api/summarize");
  return NextResponse.json({
    ok: collect.ok && summarize.ok,
    collect: collect.body,
    summarize: summarize.body,
  });
}

export async function GET(req: Request) {
  return runSync(req);
}

export async function POST(req: Request) {
  return runSync(req);
}
