# TCS RADIO — AIオリジナル応援ソング

テックキャンプ文化祭向けの Next.js / TypeScript 製試作です。来場者がラジオネームを入力してDJへ電話をかけ、会話から得た内容をもとに、約90秒のオリジナル応援歌を届けます。

現在の主要導線は `experiment/radio-dj-flow` で試作中です。`main` はこのDJ試作をまだ取り込んでいません。

## 起動

```bash
npm ci
npm run dev
```

通常は `http://localhost:3000` を開きます。すでに別の開発サーバーが動いている場合は、表示された別ポートを使用してください。

### デモモード

トップ画面の「デモモード」を有効にすると、OpenAI、Eleven Music、Realtime API、マイクを使わずに体験フローを確認できます。デモ用の成功・遅延・失敗・再試行・再生失敗の状態も通話画面から選択できます。

### 本番モードの流れ

1. ラジオネームを入力し、DJへ電話をかける。
2. DJ イエローバードが会話から、応援する相手・具体的なエピソード・届けたい言葉・曲の雰囲気を聞く。
3. 必要情報がそろうと、会話スナップショットを固定して裏側で楽曲プロフィール、Eleven Music用プロンプト、90秒音源を順に作る。
4. 曲の準備中も、DJとの短い雑談を続けられる。
5. 音源完成後、利用者操作で再生画面へ進む。

音楽生成ジョブは開発サーバーのメモリで管理します。開発サーバーを再起動した場合、進行中ジョブは復元できません。生成済み音源は `.tcs-runtime/music/` にローカル保存され、このディレクトリはGit管理外です。

## 環境変数

`.env.example` はキーを含まない見本です。実際のキーはプロジェクト直下の `.env.local` にのみ置き、コミットしません。

| 変数 | 用途 |
| --- | --- |
| `OPENAI_API_KEY` | サーバー専用。未設定ならモック |
| `OPENAI_MODEL` | 未設定なら `gpt-4.1-mini` |
| `OPENAI_REALTIME_MODEL` | 任意。未設定なら `gpt-realtime-2.1` |
| `OPENAI_TRANSCRIPTION_MODEL` | 任意。未設定なら `gpt-transcribe` |
| `USE_MOCK_AI` | `true` ならキーがあってもモック |
| `ELEVENLABS_API_KEY` | サーバー専用。Eleven Music APIで曲を生成するキー |

実APIを試す場合は `.env.local` に次を設定して開発サーバーを再起動します。

```env
OPENAI_API_KEY=自分のAPIキー
USE_MOCK_AI=false
ELEVENLABS_API_KEY=自分のEleven Music APIキー
```

キーをチャット、Git、ログ、`NEXT_PUBLIC_` 変数に入れないでください。`.env.local` は各開発者がローカルにだけ作成します。

- OpenAIのプロフィール・設計書生成は Responses API、構造化出力、`store: false`、自動リトライなしを使う。
- Realtime会話は、サーバーが短命なクライアントシークレットを発行する。恒久的なOpenAI APIキーをブラウザへ渡さない。
- Eleven Musicは `music_v2_5`、90秒、タイムスタンプ付きで音源を生成する。

## 主な構成

| 場所 | 役割 |
| --- | --- |
| `app/page.tsx` | ラジオネーム入力・電話演出・デモ切替 |
| `app/talk/page.tsx` | DJとの通話、楽曲ジョブ開始、完了後の再生導線 |
| `app/result/page.tsx` | 音源再生、歌詞表示、再生終了後の導線 |
| `app/api/realtime-session/route.ts` | Realtimeセッションのサーバー側準備 |
| `app/api/music-jobs/` | 楽曲ジョブの開始、状態取得、音源取得、再試行 |
| `lib/prompts/` | DJ会話、情報抽出、プロフィール、楽曲設計のプロンプト |
| `lib/music-jobs.ts` | OpenAI → Eleven Music の順次ジョブ処理 |
| `docs/radio-dj-todo.md` | 試作の確認済み事項・未確認事項 |

OpenAIは歌詞本文を出力せず、会話を楽曲プロフィールとEleven Music用の制作指示書へ整理します。歌詞・歌唱・伴奏はEleven Musicが作ります。OpenAIの6区間タイムラインは映像演出の事前目安であり、生成後はEleven Musicが返す実際の歌詞・タイムスタンプを映像同期データとして扱います。

音楽生成時、設計書の内容はEleven Musicへ送信されます。実名・連絡先・第三者の個人情報や、実在アーティスト名・曲名・既存歌詞は入力しないでください。

## 共同開発時の注意

- `main` には直接コミットしない。作業は `feature/...` または `experiment/...` ブランチで行う。
- `.env.local`、`.tcs-runtime/`、`.next/`、`node_modules/` はコミットしない。
- `.env.example` の変数名だけを共有し、値は各自のローカル環境で設定する。
- 画像・動画素材は通常Gitで管理されている。大きな素材を追加する前に、容量とライセンスを確認する。

## 検証

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

本作業では実キーを参照せず、OpenAIとEleven Musicへの実リクエストは実施しません。
