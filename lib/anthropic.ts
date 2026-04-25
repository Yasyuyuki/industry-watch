import Anthropic from "@anthropic-ai/sdk";

export function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY が未設定です");
  }
  return new Anthropic({ apiKey });
}

export type SummarizeInput = {
  industryName: string;
  items: {
    id: string;
    title: string;
    summary: string | null;
    published_at: string | null;
  }[];
};

export type SummarizeOutput = {
  summary: string;
  notableItemIds: string[];
};

export async function summarizeIndustry(
  input: SummarizeInput
): Promise<SummarizeOutput> {
  if (input.items.length === 0) {
    return { summary: "", notableItemIds: [] };
  }

  const client = getClient();

  const itemsText = input.items
    .map((it, i) => {
      const date = it.published_at
        ? new Date(it.published_at).toLocaleDateString("ja-JP", {
            month: "short",
            day: "numeric",
          })
        : "日付不明";
      return `${i + 1}. [${date}] ${it.title}${it.summary ? "\n   " + it.summary : ""}`;
    })
    .join("\n");

  const prompt = `以下は「${input.industryName}」業界に関する直近24時間のニュース一覧です。
日本のライブ配信事業会社 Light の代表が朝の意思決定材料として読みます。

${itemsText}

これらを踏まえて、JSON形式（説明や前置き一切なし、JSONのみ）で出力してください:

{
  "summary": "今日の特筆すべきトピック・トレンドを2〜3文で簡潔に。事業判断に効くものに焦点。重複・PR記事は無視。値ある動きが無い場合は「特筆すべき動きなし」とだけ書く。",
  "notable_indices": [事業判断に効く注目記事の番号 0〜3個。値ある動きが無ければ空配列]
}`;

  const result = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 800,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    result.content[0]?.type === "text" ? result.content[0].text : "";

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("AI応答からJSONを抽出できませんでした: " + text.slice(0, 200));
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    summary?: string;
    notable_indices?: number[];
  };

  const notableItemIds = (parsed.notable_indices ?? [])
    .map((i) => input.items[i - 1]?.id)
    .filter((id): id is string => Boolean(id));

  return {
    summary: parsed.summary ?? "",
    notableItemIds,
  };
}
