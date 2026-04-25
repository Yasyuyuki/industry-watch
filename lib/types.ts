export type Industry = {
  id: string;
  name: string;
  slug: string;
  enabled: boolean;
  created_at: string;
};

export type Source = {
  id: string;
  industry_id: string;
  name: string;
  url: string;
  enabled: boolean;
  created_at: string;
};

export type Item = {
  id: string;
  source_id: string;
  industry_id: string;
  title: string;
  url: string;
  summary: string | null;
  published_at: string | null;
  fetched_at: string;
  source?: Source;
};

export type IndustryWithItems = Industry & {
  items: Item[];
  sources: Source[];
};

export type DailySummary = {
  id: string;
  industry_id: string;
  date: string;
  summary: string;
  notable_item_ids: string[];
  generated_at: string;
};
