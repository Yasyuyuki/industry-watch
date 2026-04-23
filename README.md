# Industry Watch

業界ニュース自動収集ダッシュボード（個人用）。

- **Stack**: Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui + Supabase + Vercel
- **機能**:
  - RSS / Google News からニュースを自動収集（Vercel Cron で毎日9時JST実行）
  - 業界タブで切替表示
  - 画面から業界・ソースを追加可能
- **想定ユーザー**: 1人（認証なし、URL非公開で運用）

## 初回セットアップ（所要15分）

### 1. Supabase プロジェクトを作る
1. https://supabase.com/dashboard で新規プロジェクト作成
2. 作成後、左メニュー「SQL Editor」を開く
3. `supabase/schema.sql` の中身を貼り付けて Run
4. 「Settings → API」で以下の値をコピー
   - Project URL
   - `anon` public key
   - `service_role` secret key（⚠️非公開）

### 2. Vercel にデプロイ
1. https://vercel.com/new で本GitHubリポジトリをインポート
2. Environment Variables に以下を設定：
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon key
   - `SUPABASE_SERVICE_ROLE_KEY` = service_role key
   - `CRON_SECRET` = ランダム文字列（例: `openssl rand -hex 32`）
3. Deploy

### 3. 動作確認
1. デプロイ完了後のURLを開く → ライブ配信業界の記事一覧（空）が表示される
2. 右上「今すぐ収集」をクリック → 数秒〜数十秒で記事が溜まる
3. 「業界を追加」で他の業界も追加できる

## 定時実行

`vercel.json` に定義済み（毎日 09:00 UTC＝18:00 JST）。
頻度を変えたい場合は `vercel.json` の `schedule` をCron形式で編集して push。

⚠️ Vercel Hobby プランは cron 実行が1日1回までの制限あり。もっと頻度を上げたい場合は Pro プラン、または Supabase Edge Functions + pg_cron へ移行。

## 業界の追加方法

**画面から**：右上「業界を追加」→ 業界名 + Google News キーワード or RSS URL

**SQLから（まとめて追加するとき）**：
```sql
insert into industries (name, slug) values ('SaaS', 'saas');
insert into sources (industry_id, name, url)
select id, 'Google News: Notion',
  'https://news.google.com/rss/search?q=%22Notion%22&hl=ja&gl=JP&ceid=JP:ja'
from industries where slug = 'saas';
```

## ローカル開発（任意）

```bash
npm install
cp .env.example .env.local
# .env.local を編集
npm run dev
```

## トラブルシュート

**「セットアップが必要です」と表示される**
- Vercelの環境変数3つ（`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`）が設定されているか確認
- Supabase で schema.sql を実行したか確認

**「今すぐ収集」で何も記事が出ない**
- Supabase → Table Editor → `sources` に行が入っているか確認
- Vercel → Logs → `/api/collect` のログを確認

**cronが動かない**
- Vercelの Hobby プランは cron 1日1回制限
- デプロイ後、実際に動くのは翌日から（即動作しないことがある）
- 手動トリガー: `curl -H "Authorization: Bearer <CRON_SECRET>" https://<domain>/api/collect`
