import { XMLParser } from "fast-xml-parser";

export type ParsedItem = {
  title: string;
  url: string;
  summary: string | null;
  published_at: string | null;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
});

function textOf(node: unknown): string {
  if (typeof node === "string") return node;
  if (node && typeof node === "object" && "#text" in node) {
    return String((node as { "#text": unknown })["#text"] ?? "");
  }
  return "";
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(s: string, max = 240): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

export const MAX_ITEMS_PER_SOURCE = 30;

export async function fetchAndParseRss(
  url: string,
  limit: number = MAX_ITEMS_PER_SOURCE
): Promise<ParsedItem[]> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; IndustryWatch/1.0; +https://github.com/Yasyuyuki/industry-watch)",
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`RSS fetch failed (${res.status}): ${url}`);
  }
  const xml = await res.text();
  const data = parser.parse(xml);

  const rssItems = data?.rss?.channel?.item;
  if (rssItems) {
    const arr = Array.isArray(rssItems) ? rssItems : [rssItems];
    return arr.slice(0, limit).map((it): ParsedItem => {
      const title = stripHtml(textOf(it.title));
      const url = textOf(it.link) || textOf(it.guid);
      const desc = textOf(it.description) || textOf(it["content:encoded"]);
      const pubDate = textOf(it.pubDate) || textOf(it["dc:date"]);
      return {
        title,
        url,
        summary: desc ? truncate(stripHtml(desc)) : null,
        published_at: pubDate ? new Date(pubDate).toISOString() : null,
      };
    });
  }

  const atomEntries = data?.feed?.entry;
  if (atomEntries) {
    const arr = Array.isArray(atomEntries) ? atomEntries : [atomEntries];
    return arr.slice(0, limit).map((entry): ParsedItem => {
      const title = stripHtml(textOf(entry.title));
      const linkNode = entry.link;
      let url = "";
      if (Array.isArray(linkNode)) {
        const alt = linkNode.find((l) => l["@_rel"] !== "self") || linkNode[0];
        url = alt?.["@_href"] ?? "";
      } else if (linkNode && typeof linkNode === "object") {
        url = linkNode["@_href"] ?? textOf(linkNode);
      } else {
        url = textOf(linkNode);
      }
      const summary = textOf(entry.summary) || textOf(entry.content);
      const published = textOf(entry.published) || textOf(entry.updated);
      return {
        title,
        url,
        summary: summary ? truncate(stripHtml(summary)) : null,
        published_at: published ? new Date(published).toISOString() : null,
      };
    });
  }

  return [];
}

export function googleNewsRssFor(keyword: string): string {
  const q = encodeURIComponent(keyword);
  return `https://news.google.com/rss/search?q=${q}&hl=ja&gl=JP&ceid=JP:ja`;
}
