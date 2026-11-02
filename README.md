# AIオリジナル応援ソング

Next.js App Router / TypeScript / Tailwind CSS の会場向けMVPです。体験者本人の頑張りと夢を6問で聞き、確認後にキャラクターを選び、本人へ語りかける約2分の応援歌を生成・再生します。主表示は1920×1080相当の16:9で、各操作は一画面で完結します。

## 起動とモック確認

```bash
npm ci
npm run dev
```

http://localhost:3000 を開いて「体験をはじめる」から進めます。キー未設定なら自動でモックになります。`USE_MOCK_AI=true` で明示的にモックを選べます。音楽は初期状態で自作約2分のインスト（歌声なし）です。回答を歌う音源ではなく、歌詞表示と再生演出の確認用です。

1. 同意画面で「同意しない」を選びトップに戻ることを確認。
2. 同意後、6問を一問ずつ回答します。マイク利用を許可できない場合は「文字で入力する」を選びます。
3. 回答確認で各項目を修正し、男性応援団または女性アイドルを選びます。
4. 生成後に再生。イントロ、Aメロ、サビ、Bメロ、最後のサビ、アウトロで表示が切り替わります。
5. 「トップ画面へ」で回答・曲・sessionStorageを消去します。

## 環境変数

`.env.example` はダミーのみです。実際の値は運用環境のシークレット管理機能などからサーバーに設定してください。`.env.local` は本作業では作成・編集していません。

| 変数                 | 用途・既定動作                                                                 |
| -------------------- | ------------------------------------------------------------------------------ |
| `OPENAI_API_KEY`     | サーバー専用。未設定ならモック                                                 |
| `OPENAI_MODEL`       | 未設定なら `lib/providers/openai.ts` の `DEFAULT_OPENAI_MODEL`（gpt-4.1-mini） |
| `USE_MOCK_AI`        | `true` でキーがあってもモック。それ以外はキーがある場合に実API                 |
| `ELEVENLABS_API_KEY` | 将来の音楽接続用。現状は外部送信しない                                         |
| `USE_MOCK_MUSIC`     | 既定はモック。`false` かつ音楽キー設定時は未接続エラーを返す                   |

キーをコード、Git、ログ、`NEXT_PUBLIC_` 変数に保存しないでください。回答全文やAPIエラー詳細もログに出していません。

## OpenAI実APIの確認

サーバーのシークレットに `OPENAI_API_KEY` を設定し、`USE_MOCK_AI=false`、必要なら `OPENAI_MODEL` を設定して再起動します。通常フローで生成し、完成画面に「歌詞：OpenAI生成」と表示されることを確認します。課金が発生します。本作業では実キーを参照せず、実API呼び出しは実施していません。

サーバー専用SDKのResponses APIと厳密なJSON Schemaを使用し、返却内容も検証します。`store:false`、45秒タイムアウト、自動リトライなし。クライアントの全体タイムアウトは90秒です。拒否・不正出力・通信失敗は再試行画面に集約し、回答を維持します。外部サービス独自のデータ保持ポリシーは別途適用されます。

確認した公式仕様: [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses)。

## 主な構成

- `app/`：指定の6画面、`api/generate-lyrics`・`api/generate-music`
- `components/session.tsx`：ContextとsessionStorage、復元・消去
- `components/generation.tsx`：逐次生成、検証、音源読み込み、離脱確認、中断・再試行
- `components/voice-answer.tsx`：ブラウザ音声認識のPoC、読み上げ、文字入力へのフォールバック
- `components/shell.tsx`：進捗、必要データのガード
- `lib/questions.ts`：スタッフが編集する質問・必須設定・文字数上限
- `lib/types.ts` / `lib/validation.ts`：共有型と実行時検証
- `lib/prompts/lyrics.ts`：専用プロンプトとJSON Schema
- `lib/providers/`：OpenAI、モック歌詞、音楽インターフェース、Eleven Musicの骨組み
- `lib/themes.ts`：2つのキャラクター、色、画像参照先、演出タイムライン
- `app/globals.css`：レスポンシブ表示、テーマ、アニメーション、動きを減らす設定
- `scripts/create-demo-audio.py`：第三者素材を使わない自作デモ音源の再生成（Python標準ライブラリのみ）

## 将来のEleven Music接続

`lib/providers/eleven-music.ts` に入出力とTODOを用意しています。公式仕様・利用権を確認してから、認証、生成、ジョブ完了確認、実尺・音源URLの検証、音源保管を実装してください。`app/api/generate-music/route.ts` でプロバイダーを切り替え、`parseMusic` のURL許可リストとlive検証、実際のタイムスタンプ、セッション復元も更新します。現状は未知のAPIエンドポイントへの送信はありません。

## テスト・ビルド

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

テストは既存のTypeScriptとNodeの標準テストランナーを利用し、追加テストフレームワークは不要です。重要な入力検証、同意、スタイル、モック生成、出力検証、演出のセクション境界を検証します。

## データと運用上の注意

回答と生成結果は、このタブのReact ContextとsessionStorageにのみ保持します。データベース・サーバーへの永続保存はありません。共有端末では、利用後に「トップ画面へ」で必ず消去してください。一時保存を利用できない環境では警告し、メモリ内で動作します。

入力はReactのテキストとして表示し、HTMLとして挿入しません。APIは同意・文字数・型・同一Origin・リクエスト容量を検証し、レスポンスはno-storeです。同意フラグは認証にはなりません。会場公開前に、利用人数に応じたレート制限・課金上限、入力と生成物の内容審査、利用規約、端末ごとの終了時消去、キャンセル時の外部課金の扱いを整備してください。中断後の外部生成停止はサービス側仕様に依存します。

## 音声PoCと次の実装

現在の音声入力は、対応ブラウザのWeb Speech APIを使うPoCです。マイク状態、認識文の確認、言い直し、停止／再開、文字入力の切替を提供します。実会場ではブラウザとネットワーク条件で挙動が異なるため、必ず実機テストをしてください。

OpenAI Realtimeを本接続する場合は、サーバーで短命のClient Secretを発行し、ブラウザへ主APIキーを渡さずにWebRTCで接続します。内蔵マイクには `far_field` ノイズ低減と、会場で調整したVAD閾値・無音時間が候補です。OpenAIはライブ文字起こしにRealtime transcriptionを案内しており、会場のノイズ・話者・短い発話を含む代表的な条件で試験するよう求めています。[Realtime VAD](https://developers.openai.com/api/docs/guides/realtime-vad) / [Transcription](https://developers.openai.com/api/docs/guides/transcription) / [Client Secrets](https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create)

## 対象外・次の実装

ログイン、QR配布、SNS共有、追加会話、曲の再編集・複数曲保存、管理画面、DB/Supabase、Suno/Udio、本格AI動画・リップシンクは対象外です。実験的な口パクも未実装です。

次はEleven Musicの実接続と歌声付き音源、実際の歌詞タイムスタンプ、会場向けの負荷・課金・コンテンツ安全性の対策、実機での音量と操作性の確認を進めてください。

ビルド互換性のため `dev` / `build` はWebpackを使用し、Tailwindは公式ガイドのPostCSS構成を追加しています。Next.jsのTypeScript CLI設定読込がこの環境で失敗するため、同梱ガイドの `experimental.useTypeScriptCli: false` でインストール済みTypeScript 5のコンパイラーAPIを使います。型チェックを省略する設定ではありません。
