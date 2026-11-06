# AIオリジナル応援ソング — 音楽生成比較実験

Next.js / TypeScript の会場向け実験版です。6つの回答とキャラクター選択から、OpenAIがEleven Music用の「楽曲設計書」を生成し、Eleven Music APIで約90秒の音源を生成・ページ内再生します。

## 起動

```bash
npm ci
npm run dev
```

http://localhost:3000 を開きます。APIキー未設定時、または `USE_MOCK_AI=true` のときはモック設計書を返すため、課金なしで画面・コピー・タイムラインを確認できます。

1. 同意後、6問に回答し、内容を確認します。
2. 男性応援団または女性アイドルを選びます。
3. OpenAIが、Eleven Music用のプロンプトと、90秒の映像演出目安を作成します。
4. 「Eleven Musicで曲を生成」を押すと、90秒・1パターンの音源、生成された歌詞、再生位置に対応する単語、実際の映像同期用JSONをページ内に表示します。
5. 再生成は1回だけ許可されます。追加クレジットを消費する確認を表示します。
6. 「トップ画面へ」で回答と設計書をsessionStorageから削除します。音源はブラウザのメモリだけにあり、保存されません。

## 環境変数

`.env.example` はキーを含まない見本です。実際のキーはプロジェクト直下の `.env.local` にのみ置き、コミットしません。

| 変数 | 用途 |
| --- | --- |
| `OPENAI_API_KEY` | サーバー専用。未設定ならモック |
| `OPENAI_MODEL` | 未設定なら `gpt-4.1-mini` |
| `USE_MOCK_AI` | `true` ならキーがあってもモック |
| `ELEVENLABS_API_KEY` | サーバー専用。Eleven Music APIで曲を生成するキー |

実APIを試す場合は `.env.local` に次を設定して開発サーバーを再起動します。

```env
OPENAI_API_KEY=自分のAPIキー
USE_MOCK_AI=false
ELEVENLABS_API_KEY=自分のEleven Music APIキー
```

キーをチャット、Git、ログ、`NEXT_PUBLIC_` 変数に入れないでください。OpenAIの呼び出しはサーバーの `/api/generate-brief` だけが行い、Responses API、Structured Outputs、`store:false`、45秒タイムアウト、自動リトライなしを使います。Eleven Musicの呼び出しもサーバーの `/api/generate-music` だけが行い、90秒・1パターン・120秒のタイムアウトに固定しています。

## 比較の進め方

OpenAIは歌詞を出力せず、曲尺・曲展開・歌声・テンポ・利用者の回答を含む「制作指示書」を返します。歌詞・歌唱・伴奏はEleven Music自身に生成させます。APIには曲尺を `90000ms` として渡します。OpenAIの6区間は映像演出の目安であり、生成後にEleven Musicが返す実チャンク時刻を映像同期用JSONとして使います。

曲尺、日本語の聞き取りやすさ、個人回答の反映、サビ、構成、生成時間、料金、修正のしやすさを記録してください。映像は当日生成せず、事前生成した短い素材を実際の曲展開に合わせて切り替える前提のタイムラインです。

音楽生成時、設計書の内容はEleven Musicへ送信されます。実名・連絡先・第三者の個人情報や、実在アーティスト名・曲名・既存歌詞は入力しないでください。

## 主な構成

- `app/api/generate-brief`：OpenAIまたはモックから楽曲設計書を生成
- `lib/prompts/creative-brief.ts`：構造化出力の指示とJSON Schema
- `lib/providers/openai.ts` / `mock-brief.ts`：サーバー専用OpenAI処理と無料のモック
- `app/api/generate-music`：Eleven Music APIへ90秒の詳細生成を依頼し、音声・歌詞・映像同期用JSONを一時的に返す
- `app/result/page.tsx`：生成ボタン、ページ内プレーヤー、歌詞、プロンプト・タイムラインのコピー画面
- `components/session.tsx`：一時セッションの復元・削除
- `tests/domain.test.ts`：入力、タイムライン、生成データ、Originの検証

## 検証

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

本作業では実キーを参照せず、OpenAIとEleven Musicへの実リクエストは実施しません。
