# Portman - プロジェクト計画書

**作成日**: 2025-11-06
**バージョン**: 0.2.0 (Draft)
**ステータス**: 計画段階
**更新日**: 2025-11-06（フィードバック反映版）

---

## 目次

1. [プロジェクト概要](#1-プロジェクト概要)
2. [背景・動機](#2-背景動機)
3. [解決する課題](#3-解決する課題)
4. [既存ツールとの比較](#4-既存ツールとの比較)
5. [セキュリティ設計](#5-セキュリティ設計)
6. [技術スタック（Phase別戦略）](#6-技術スタックphase別戦略)
7. [機能仕様（Phase別）](#7-機能仕様phase別)
8. [アーキテクチャ設計](#8-アーキテクチャ設計)
9. [UI/UXデザイン](#9-uiuxデザイン)
10. [実装計画](#10-実装計画)
11. [配布・デプロイ戦略](#11-配布デプロイ戦略)
12. [ローンチ戦略](#12-ローンチ戦略)
13. [ライセンス・貢献ガイドライン](#13-ライセンス貢献ガイドライン)
14. [開発スケジュール](#14-開発スケジュール)
15. [リスク・課題](#15-リスク課題)
16. [参考資料](#16-参考資料)

---

## 1. プロジェクト概要

### プロジェクト名

**Portman** (Port Manager)

**選定理由**:
- シンプルで覚えやすい
- ポート管理ツールであることが明確
- npmパッケージ名として適切

### 一行説明

> **オープンソース・ブラウザベースのポート管理ツール。**
> 開発者がポート競合を**安全・透過的・高速**に解決するためのWebダッシュボード。

### キーメッセージ

#### 🔓 **透明性・安全性**
- "**Open Source, Open Security**" - コードが見える、挙動が分かる、安全が証明できる
- "**docker.sockへのアクセスは明示的に有効化**" - デフォルトではOFF、セキュリティファースト
- "**自分のプロセスのみkill**" - デフォルトでは危険な操作を制限

#### 🌐 **開発者体験**
- "**pgweb for ports**" - pgwebのようなWebダッシュボード体験をポート管理に
- "**Drizzle Studio for process management**" - 洗練されたUIで直感的に操作
- "**No more `lsof -i :8080`**" - コマンドラインの煩雑さから解放

#### 🚀 **配布の容易さ**
- "**`docker pull` で即起動**" - 最も安全・手軽な配布方法
- "**ポート競合を自動回避**" - 3033 → 3034 → 3035 ... と自動調整
- "**CLI モードでポート使用ゼロ**" - ダッシュボード不要なら完全ステートレス

---

## 2. 背景・動機

### 問題の発見

開発中に頻繁に発生する問題：

#### 1. **ポート競合エラー**
```
Error: listen EADDRINUSE: address already in use :::9090
```
- アプリ起動時に最も遭遇する問題の一つ
- 特に複数プロジェクトを並行開発している場合
- Dockerコンテナとホストプロセスが競合

#### 2. **バックグラウンドプロセスの残骸**
- 開発サーバーを停止したつもりが残っている
- Docker コンテナが起動したまま
- IDEのターミナルがクラッシュした後の残骸

#### 3. **Claude Code等のAIツール使用時の特有の問題**
- 複数のBashセッションが並行実行される
- テスト実行後のプロセスが残る
- バックグラウンドプロセスの管理が複雑
- コンテキスト切り替え時に前のプロセスを忘れる

### 既存の解決方法の課題

#### コマンドライン（lsof、netstat）

```bash
# ポート確認
lsof -i :9090

# プロセスkill
kill -9 12345
```

**問題点**:
- ❌ コマンドを覚える必要がある
- ❌ 複数ポートを確認・killするのが面倒
- ❌ 視覚的にわかりにくい
- ❌ プロセスの全体像が見えない

#### TUIツール（fzf、gum、nethogs、bandwhich）

```bash
# fzf例
lsof -i -P -n | grep LISTEN | fzf | awk '{print $2}' | xargs kill -9

# bandwhich
sudo bandwhich
```

**問題点**:
- ❌ 追加インストールが必要
- ❌ ターミナルに慣れていない人には敷居が高い
- ❌ 複数選択が直感的でない
- ❌ リアルタイム監視と操作の両立が難しい

#### GUIツール（Little Snitch、PortsMonitor、Activity Monitor）

**問題点**:
- ❌ 有料（Little Snitch）
- ❌ macOS専用が多い
- ❌ ポート管理に特化していない
- ❌ 起動が重い

### 🚨 **市販ツールの致命的な問題: セキュリティ**

#### クローズドソース + docker.sock = 危険

**市販アプリ（Open Ports、Port Manager等）の問題**:

1. **中身が不明**
   - クローズドソース → 何をしているか分からない
   - バイナリの挙動が検証できない
   - セキュリティ監査不可能

2. **docker.sockへのアクセス = root権限相当**
   - docker.sockは`/var/run/docker.sock`（Unixソケット）
   - これにアクセスできる = **ホストのroot権限相当の操作が可能**
   - コンテナの作成・削除・ファイルシステムへのアクセスが可能

3. **中身不明なバイナリにroot権限相当を渡すリスク**
   - マルウェアの可能性（極端な例だが理論上可能）
   - バックドアの可能性
   - データ収集・テレメトリの可能性
   - ライセンス違反の可能性

**具体例**:
```bash
# 市販アプリが内部でdocker.sockにアクセス
# → 以下のような危険な操作が可能
docker run --rm -v /:/host alpine chown -R nobody /host
# → ホストのファイルシステム全体の所有者を変更できる
```

**結論**:
> **docker.sockへのアクセスが必要なツールは、OSSでなければ使うべきではない**

---

## 3. 解決する課題

### 理想の解決策

開発者が求めているもの：

1. ✅ **オープンソース** - コードが見える、挙動が分かる、安全が証明できる
2. ✅ **ブラウザで開ける** - インストール不要、すぐ使える
3. ✅ **視覚的** - テーブル表示、ソート、フィルタ
4. ✅ **直感的** - クリックでkill、チェックボックスで複数選択
5. ✅ **セキュリティファースト** - デフォルトで安全、危険な操作は明示的に
6. ✅ **リアルタイム** - ポート状況を自動更新
7. ✅ **クロスプラットフォーム** - macOS、Linux、Windows全対応
8. ✅ **軽量** - すぐ起動、低リソース

→ **これがPortmanのコンセプト**

### ターゲットユーザー

#### プライマリーターゲット
- **Web開発者** - Node.js、Python、Ruby、Go等のWebアプリ開発者
- **フルスタックエンジニア** - フロントエンド・バックエンド両方を扱う
- **DevOpsエンジニア** - Docker、Kubernetes等のコンテナ環境を扱う

#### セカンダリーターゲット
- **学生・初学者** - ターミナル操作に不慣れな人
- **AIツール利用者** - Claude Code、GitHub Copilot等を使う開発者
- **チーム開発者** - 複数の開発環境を切り替える人

### 解決するユースケース

#### ユースケース1: ポート競合の解決
**シナリオ**:
1. `npm run dev` を実行
2. `Error: Port 3000 is already in use` エラー
3. ブラウザで `http://localhost:3033` を開く
4. ポート3000を使っているプロセスを確認
5. クリックでkill
6. `npm run dev` を再実行

**従来の方法**:
```bash
lsof -i :3000
kill -9 12345
```

**Portmanでの方法**:
1. ブラウザで `http://localhost:3033` を開く
2. ポート3000の行の「Kill」ボタンをクリック

#### ユースケース2: 開発環境のクリーンアップ
**シナリオ**:
1. 一日の開発終了時
2. Portmanで全ポートを確認
3. 不要なプロセス（9090、5432、3000等）をまとめて選択
4. 一括kill

#### ユースケース3: Dockerコンテナのポート確認（Phase 2以降）
**シナリオ**:
1. Docker Composeで複数コンテナ起動
2. `portman --with-docker` で起動
3. Dockerコンテナのポートも表示
4. 必要に応じてコンテナを停止

#### ユースケース4: CLI モードで素早く確認
**シナリオ**:
```bash
# ポート一覧確認（ポート使用なし）
portman list

# 特定プロセスをkill
portman kill 12345
```

---

## 4. 既存ツールとの比較

### 市販ツール vs Portman

| 項目 | 市販アプリ (Open Ports / Port Manager 等) | **Portman** |
|---|---|---|
| **中身の透明性** | **❌ クローズド**（挙動が不明） | **✅ OSS**（安全・監査可能） |
| **Docker 連携** | 限定的（公開ポートのみ等） | **✅ docker.sock 経由でフル操作**（`--with-docker`で明示有効化） |
| **セキュリティ** | 不明（ブラックボックス） | **✅ コードが公開、監査可能** |
| **OS 対応** | **❌ mac 限定**が多い | **✅ mac / Linux / Windows** 全対応 |
| **チーム共有** | ❌ 基本不可（1人用） | **✅ WebUI により共有容易** |
| **カスタマイズ性** | ❌ 不可 | **✅ 要件に合わせて自由に拡張可能** |
| **ポート競合** | 未対応 | **✅ 自動調整**（3033→3034→...） |
| **価格** | $7.99〜有料 | **✅ 完全無料（MIT License）** |

### コマンドラインツール vs Portman

| ツール | 特徴 | 長所 | 短所 |
|--------|------|------|------|
| **lsof** | 標準ツール | インストール不要、強力 | コマンド複雑、覚えにくい |
| **netstat** | ネットワーク統計 | 広く使われている | 最新Linux系では非推奨 |
| **ss** | netstatの代替 | 高速、詳細情報 | macOSでは標準搭載されていない |
| **Portman** | WebUI | **視覚的、直感的、OSS** | **追加ツール必要**（Docker/npm） |

### TUIツール vs Portman

| ツール | 特徴 | 長所 | 短所 | インストール |
|--------|------|------|------|------------|
| **fzf** | ファジーファインダー | 汎用性高い、高速 | ポート管理専用ではない | `brew install fzf` |
| **gum** | Charm製TUIコンポーネント | 美しいUI、スクリプト向き | 単体では使えない | `brew install gum` |
| **bandwhich** | ネットワーク監視 | リアルタイム、詳細 | sudo必須、ポートkillできない | `brew install bandwhich` |
| **fkill** | プロセスkill専用 | 専用ツール、洗練 | npmインストール必要 | `npm i -g fkill-cli` |
| **Portman** | WebUI | **ブラウザで見やすい、OSS** | **Docker/npm必要** | `docker run`/`npx` |

### 競合分析マトリクス

```
                        透明性   Docker対応  ポート管理  クロスPF  チーム共有  ポート競合回避
Portman（本プロジェクト）   ✅        ✅        ✅       ✅        ✅         ✅
市販アプリ                 ❌        △        ✅       ❌        ❌         ❌
lsof/netstat              ✅        ❌        ✅       △        ❌         ❌
fzf/gum                   ✅        ❌        △       ✅        ❌         ❌
fkill                     ✅        ❌        ✅       ✅        ❌         ❌
Activity Monitor          △        ❌        △       ❌        ❌         ❌
```

**凡例**: ✅ 対応、△ 部分対応、❌ 非対応

### Portmanの差別化ポイント

#### 既存ツールにない価値

1. ✅ **オープンソース × ブラウザベース × ポート管理専用**
   - pgweb、Drizzle Studioの体験をポート管理に
   - コードが見える、安全が証明できる
   - リアルタイム更新

2. ✅ **セキュリティファースト設計**
   - Docker連携はデフォルトOFF（`--with-docker`で明示有効化）
   - PID killはデフォルトで自分のプロセスのみ
   - localhost限定バインド

3. ✅ **ポート競合を自動回避**
   - デフォルトポート: 3033
   - 既に使用中 → 3034 → 3035 ... と自動スライド
   - ユーザーはポート番号を意識不要

4. ✅ **CLI モード搭載**
   - ポートを使わずに操作可能
   - `portman list`、`portman kill <pid>`

5. ✅ **クロスプラットフォーム完全対応**
   - macOS、Linux、Windows全対応
   - コマンドの違いを吸収（lsof、netstat、Get-NetTCPConnection）

---

## 5. セキュリティ設計

### 基本方針

Portmanは**セキュリティファースト**の設計を採用します。

#### 1. **localhost 限定バインド**
- デフォルトでは`127.0.0.1`（localhost）のみでリッスン
- 外部ネットワークからアクセス不可
- LAN内共有は`--bind 0.0.0.0`フラグで明示的に有効化

```bash
# デフォルト（安全）
portman              # localhost:3033 のみ

# LAN内共有（明示的）
portman --bind 0.0.0.0  # 警告メッセージ表示
```

#### 2. **Docker連携はデフォルトOFF**
- docker.sockへのアクセスは**root権限相当**
- デフォルトでは接続しない
- `--with-docker`フラグで明示的に有効化
- 有効化時も警告メッセージを表示

```bash
# デフォルト（docker.sockアクセスなし）
portman

# Docker連携有効化（明示的）
portman --with-docker
# → 警告: "docker.sockにアクセスします。root権限相当の操作が可能です。"
```

#### 3. **PID killはデフォルトで自分のプロセスのみ**
- デフォルトでは自分のユーザーが所有するプロセスのみkill可能
- システムプロセスやroot所有プロセスはkillできない
- `--allow-all-users`フラグで全ユーザーのプロセスをkill可能に

```bash
# デフォルト（安全）
portman              # 自分のプロセスのみkill可能

# 全ユーザーのプロセスをkill（sudo必要）
sudo portman --allow-all-users
```

#### 4. **テレメトリ/データ収集は完全OFF**
- デフォルトでデータ収集なし
- アナリティクス送信なし
- Opt-inのみ（ユーザーが明示的に有効化した場合のみ）

### Docker連携の安全性

#### docker.sockへのアクセスリスク

**docker.sockとは**:
- `/var/run/docker.sock`（Unixソケット）
- Dockerデーモンとの通信に使用
- アクセス可能 = **ホストのroot権限相当の操作が可能**

**可能な危険な操作**:
```bash
# docker.sockにアクセスできると、以下のような操作が可能
docker run --rm -v /:/host alpine chown -R nobody /host
# → ホストのファイルシステム全体の所有者を変更

docker run --rm -v /:/host alpine rm -rf /host/etc
# → ホストのシステムファイルを削除
```

**Portmanの対策**:
1. **デフォルトでOFF**
   - `--with-docker`フラグがない場合、docker.sockにアクセスしない

2. **読み取り専用操作を優先**
   - `docker ps`（コンテナ一覧取得）のみ使用
   - `docker inspect`（詳細情報取得）のみ使用

3. **書き込み操作は明示的な確認ダイアログ**
   - `docker stop`実行時は確認ダイアログを表示
   - コンテナ名・IDを明示

4. **危険な操作は実装しない**
   - `docker rm -f`（強制削除）は実装しない
   - `docker run`（新規コンテナ作成）は実装しない

### ポート競合回避

#### 「ポート管理ツールがポートを使う問題」への対応

**問題**:
- Portman自身がポート（例: 3033）を使用
- ポート3033が既に使われている場合、Portman自身が起動できない

**解決策: ポート自動調整**

```bash
# ポート3033が空いている場合
portman
# → http://localhost:3033 で起動

# ポート3033が既に使用中の場合
portman
# → 3034 を試す → 3035 を試す → ... と自動スライド
# → http://localhost:3034 で起動
# → コンソールに「ポート3033は使用中のため、3034で起動しました」と表示
```

**Tray経由ではユーザーはポート番号を意識不要**:
- Trayアイコンクリック → 自動的にブラウザで正しいURLを開く
- ユーザーはポート番号を知らなくても使える

**CLI モード（ポート使用なし）**:
```bash
# ダッシュボードを起動せずにポート一覧確認
portman list

# 特定プロセスをkill
portman kill 12345

# Docker含む（--with-docker）
portman --with-docker list
```

### 権限管理

#### 最小権限の原則

**Phase 1（MVP）**:
- ✅ 自分のプロセスのみkill可能（デフォルト）
- ✅ localhost限定バインド（デフォルト）
- ✅ docker.sockアクセスなし（デフォルト）

**Phase 2以降**:
- ⏳ `--allow-all-users`フラグ（sudo必要）
- ⏳ `--bind 0.0.0.0`フラグ（警告表示）
- ⏳ `--with-docker`フラグ（警告表示）

### セキュリティ監査

#### オープンソースの利点

1. **コードが公開されている**
   - 誰でもソースコードを閲覧可能
   - バックドア・マルウェアの可能性を検証可能

2. **GitHub Security**
   - Dependabot（依存関係の脆弱性スキャン）
   - CodeQL（静的解析）
   - Security Advisories（脆弱性報告）

3. **コミュニティによる監視**
   - Issue/PRでの指摘
   - セキュリティ研究者による監査

#### セキュリティポリシー

**SECURITY.md**:
```markdown
# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please email:
security@portman.dev

Do NOT open a public issue.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Security Features

- localhost-only binding by default
- Docker socket access disabled by default
- Kill own processes only by default
- No telemetry/data collection
```

---

## 6. 技術スタック（Phase別戦略）

### 戦略的アプローチ

Portmanは**段階的に最適化**するアプローチを採用します：

```
Phase 1: 開発速度最優先（Bun + Hono + React + shadcn/ui）
  ↓
Phase 2: 機能拡充・フィードバック反映
  ↓
Phase 3: ネイティブ化（Go + Wails）
  ↓
Phase 4: 配布最適化（Homebrew / Winget / Scoop）
```

---

### Phase 1（1-2週間）: MVP - Bun + Hono + React + shadcn/ui

#### 構成

```
Runtime:    Bun
Backend:    Hono (Web Framework)
Frontend:   React + Vite
UI:         shadcn/ui + TailwindCSS
State:      Zustand（軽量状態管理）
Data:       SWR（データフェッチ・キャッシュ）
Styling:    TailwindCSS
Validation: Zod
```

#### 選定理由

**Bun**:
- ✅ 起動速度が超高速（Node.jsの3-4倍）
- ✅ TypeScript型安全
- ✅ ビルトインツールが豊富（テスト、バンドラー）
- ✅ 既存スキルを活用できる

**Hono**:
- ✅ 軽量Webフレームワーク
- ✅ GenAI Gatewayで実績あり
- ✅ エッジランタイム対応

**React + Vite**:
- ✅ 最も普及したUIライブラリ
- ✅ Viteで高速なビルド
- ✅ Phase 3でGo + Wailsに移植しやすい

**shadcn/ui**:
- ✅ **開発速度UP**: コンポーネントをコピペで即使える
- ✅ **一貫性**: TailwindCSSベースで統一感
- ✅ **カスタマイズ性**: ソースコードが手元にあるので自由に調整可能
- ✅ **アクセシビリティ**: WAI-ARIA準拠
- ✅ **モダンなUI**: Drizzle StudioやVercel的な洗練されたデザイン

**Zustand**:
- ✅ Redux Toolkitより軽量
- ✅ Contextより型安全
- ✅ DevToolsサポート

**SWR**:
- ✅ データフェッチ・キャッシュを自動化
- ✅ リアルタイム更新（revalidation）
- ✅ Vercel製で信頼性◎

#### セットアップコマンド

```bash
# プロジェクト初期化
bun create vite portman --template react-ts
cd portman

# 依存関係インストール
bun add hono
bun add zustand swr zod
bun add -D @types/node

# shadcn/ui セットアップ
npx shadcn-ui@latest init

# 必要なコンポーネントを追加
npx shadcn-ui@latest add table button input checkbox dialog toast switch badge
```

#### ディレクトリ構造

```
portman/
├── package.json
├── bun.lockb
├── tsconfig.json
├── README.md
├── LICENSE
├── .github/workflows/
│   ├── ci.yml
│   └── release.yml
├── src/
│   ├── server/               # Backend (Hono)
│   │   ├── index.ts
│   │   ├── routes/
│   │   │   └── ports.ts
│   │   ├── core/
│   │   │   ├── port-manager.ts
│   │   │   └── process-killer.ts
│   │   └── utils/
│   │       └── os-detector.ts
│   ├── ui/                   # Frontend (React)
│   │   ├── src/
│   │   │   ├── App.tsx
│   │   │   ├── components/
│   │   │   │   ├── ui/       # shadcn/ui components
│   │   │   │   ├── PortTable.tsx
│   │   │   │   ├── FilterBar.tsx
│   │   │   │   └── Header.tsx
│   │   │   ├── hooks/
│   │   │   │   └── usePorts.ts
│   │   │   ├── stores/
│   │   │   │   └── usePortStore.ts
│   │   │   └── lib/
│   │   │       └── utils.ts
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── tailwind.config.js
│   └── cli.ts                # CLI entry point
├── Dockerfile
└── docker-compose.yml
```

#### メリット

- ✅ **最速開発**: 既存スキルで1-2週間でMVP完成
- ✅ **Docker配布**: `docker pull`で即起動
- ✅ **npx対応**: `npx portman`で試用可能
- ✅ **shadcn/uiで洗練されたUI**: 開発速度とデザイン品質を両立

#### デメリット

- ⚠️ **node_modules が大きい**: Docker imageが肥大化（対策: multi-stage build）
- ⚠️ **Bun依存**: ユーザーがBunをインストールする必要がある（対策: Docker配布を優先）

---

### Phase 2（2-6週間）: 機能拡充

#### フォーカス

- ✅ フィードバック収集・バグ修正
- ✅ Windows対応
- ✅ Docker連携（`--with-docker`フラグ）
- ✅ 高度なフィルタ・ソート
- ✅ 設定画面（自動更新間隔、テーマ等）

#### 技術スタック（Phase 1と同じ）

- Bun + Hono + React + shadcn/ui

#### 新機能

**Docker連携**:
```bash
portman --with-docker
# → docker.sockにアクセス
# → コンテナ一覧も表示
# → コンテナの停止も可能
```

**Windows対応**:
```typescript
// src/server/core/port-manager.ts
async function getPortsWindows(): Promise<PortInfo[]> {
  const { stdout } = await execAsync('netstat -ano | findstr LISTENING');
  // パース処理
}
```

**高度なフィルタ**:
- ポート範囲（例: 3000-4000）
- プロセス名（正規表現対応）
- プロトコル（TCP/UDP）
- Docker/非Docker

---

### Phase 3（必要時）: ネイティブ化 - Go + Wails

#### 構成

```
Runtime:    Go (シングルバイナリ)
Backend:    net/http (標準ライブラリ)
Frontend:   React（Phase 1のUIをそのまま移植）
Desktop:    Wails v3
Package:    バイナリ配布
```

#### 選定理由

**Go**:
- ✅ シングルバイナリ配布
- ✅ クロスコンパイル容易
- ✅ 低メモリ・高速
- ✅ セキュリティ監査しやすい

**Wails**:
- ✅ ElectronよりはるかにUI軽量（10-100倍）
- ✅ Reactをそのまま移植可能
- ✅ システムトレイ対応
- ✅ 自動アップデート機能

#### 移植戦略

**UIは React をそのまま移植**:
- Phase 1で作ったReact UIをビルド
- Wailsでビルド成果物を配布
- コンポーネント再利用率: 90%以上

**バックエンドをGoに書き換え**:
```go
// main.go
package main

import (
    "net/http"
    "github.com/wailsapp/wails/v3/pkg/application"
)

func main() {
    app := application.New(application.Options{
        Name: "Portman",
        Width: 1200,
        Height: 800,
    })

    app.NewWebviewWindow()
    app.Run()
}
```

#### メリット

- ✅ **シングルバイナリ**: インストール不要
- ✅ **超軽量**: メモリ使用量が1/10
- ✅ **システムトレイ常駐**: バックグラウンド監視
- ✅ **Homebrew配布**: `brew install portman`

---

### Phase 4: 配布最適化

#### フォーカス

- ✅ Homebrew Formula作成
- ✅ Winget / Scoop 対応（Windows）
- ✅ 自動アップデート機能
- ✅ apt/yum リポジトリ（Linux）

#### Homebrew

```ruby
# Formula/portman.rb
class Portman < Formula
  desc "Open-source browser-based port manager"
  homepage "https://github.com/yourname/portman"
  url "https://github.com/yourname/portman/releases/download/v1.0.0/portman-darwin-arm64.tar.gz"
  sha256 "..."
  license "MIT"

  def install
    bin.install "portman"
  end

  service do
    run [opt_bin/"portman", "serve"]
    keep_alive true
  end

  test do
    system "#{bin}/portman", "--version"
  end
end
```

**インストール**:
```bash
brew install portman
brew services start portman  # 常駐運用
```

#### Winget（Windows）

```yaml
# portman.yaml
PackageIdentifier: YourName.Portman
PackageVersion: 1.0.0
PackageLocale: en-US
Publisher: Your Name
PackageName: Portman
License: MIT
ShortDescription: Open-source browser-based port manager
```

**インストール**:
```powershell
winget install portman
```

#### 自動アップデート（Wails）

```go
// update.go
import "github.com/wailsapp/wails/v3/pkg/updater"

func CheckForUpdates() {
    updater.Check("https://api.github.com/repos/yourname/portman/releases/latest")
}
```

---

### 技術スタック比較表（Phase別）

| 項目 | Phase 1: Bun + Hono | Phase 3: Go + Wails |
|------|---------------------|---------------------|
| **起動速度** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **実行速度** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **開発速度** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **学習コスト** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **配布容易性** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **メモリ効率** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **システムトレイ** | ❌ | ✅ |
| **自動アップデート** | ❌ | ✅ |

---

## 7. 機能仕様（Phase別）

### MVP (v0.1.0) - Phase 1（1-2週間）

#### 必須機能

**7.1 ポート一覧表示**

**機能**:
- リスニング中のポート一覧をテーブル表示
- プロセス詳細情報を表示
- **自分のプロセスのみ**表示（セキュリティ）

**表示項目**:
| カラム | 説明 | 例 |
|--------|------|-----|
| PID | プロセスID | 12345 |
| Port | ポート番号 | 9090 |
| Process | プロセス名 | bun |
| Command | 実行コマンド（省略版） | bun run dev |
| Protocol | プロトコル | TCP / UDP |
| State | 状態 | LISTEN |

**操作**:
- ✅ カラムクリックでソート
- ✅ ポート番号で検索/フィルタ
- ✅ プロセス名で検索/フィルタ

**7.2 プロセスKill機能**

**個別Kill**:
- 各行に「Kill」ボタン（shadcn/ui Button）
- クリックで該当プロセスをkill
- 確認ダイアログ（shadcn/ui Dialog）

**複数選択Kill**:
- チェックボックスで複数選択（shadcn/ui Checkbox）
- 「Kill Selected」ボタンで一括kill
- 選択数を表示（例: "Kill Selected (3)"）

**Kill後の動作**:
- ✅ 成功時: トースト通知（shadcn/ui Toast）「プロセス 12345 を終了しました」
- ✅ 失敗時: エラー通知「プロセス 12345 の終了に失敗しました」
- ✅ 自動リフレッシュ: ポート一覧を再取得

**7.3 リアルタイム更新**

**自動更新**:
- デフォルト5秒ごとに自動リフレッシュ
- 更新間隔を変更可能（shadcn/ui Switch）
  - 1秒、5秒、10秒、オフ
- 最終更新時刻を表示

**手動更新**:
- 「Refresh」ボタン（shadcn/ui Button）で即座に更新
- キーボードショートカット: `R`

**7.4 ポート自動調整**

**機能**:
- デフォルトポート: `3033`
- ポート3033が既に使用中の場合:
  - 3034 を試す
  - 3035 を試す
  - ...と自動スライド
- コンソールに「ポート3033は使用中のため、3034で起動しました」と表示

**7.5 CLI モード**

**機能**:
- ダッシュボードを起動せずにポート一覧確認・kill
- ポートを使わない（完全ステートレス）

**コマンド**:
```bash
# ポート一覧確認
portman list

# 出力例
PID    Port  Process  State
12345  9090  bun      LISTEN
12346  5433  postgres LISTEN

# プロセスkill
portman kill 12345
# → プロセス 12345 を終了しました

# ヘルプ
portman --help
```

**7.6 クロスプラットフォーム対応**

**サポートOS**:
- ✅ macOS (lsof)
- ✅ Linux (lsof / ss)
- ⏳ Windows (Phase 2以降)

**コマンド自動選択**:
```typescript
// src/server/core/port-manager.ts
const getPortCommand = () => {
  if (isMacOS || isLinux) {
    return 'lsof -i -P -n | grep LISTEN';
  } else if (isWindows) {
    return 'netstat -ano | findstr LISTENING';
  }
};
```

**7.7 基本UI（shadcn/ui）**

**レイアウト**:
```
┌───────────────────────────────────────────────────────────────┐
│  🔌 Portman                                     [⚙️] [🌙]      │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  [🔄 Refresh]    Auto-refresh: [ON ▼] 5s                 │ │
│  │  Search: [_______________]                               │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──┬──────┬──────┬──────────┬──────────┬────────┬─────────┐ │
│  │☑ │ PID  │ Port │ Process  │ Command  │ State  │ Action  │ │
│  ├──┼──────┼──────┼──────────┼──────────┼────────┼─────────┤ │
│  │☑ │12345 │ 9090 │ bun      │ bun r... │ LISTEN │ [Kill]  │ │
│  │☑ │12346 │ 5433 │ postgres │ pg_ctl...│ LISTEN │ [Kill]  │ │
│  │  │12347 │ 4983 │ node     │ drizzl...│ LISTEN │ [Kill]  │ │
│  └──┴──────┴──────┴──────────┴──────────┴────────┴─────────┘ │
│                                                                │
│  [☑ Select All] [Kill Selected (2)]                           │
│                                                                │
│  Showing 3 ports  •  Last updated: 2025-11-06 10:30:15        │
└───────────────────────────────────────────────────────────────┘
```

**カラースキーム**:
- shadcn/uiのデフォルトテーマを使用
- ダークモード/ライトモード切り替え
- ポート番号: `text-blue-600`
- プロセス名: `text-green-600`
- LISTEN状態: `Badge variant="success"`

**7.8 Docker配布**

**機能**:
- `docker pull`で即起動
- Docker Composeサポート

**使い方**:
```bash
# Docker Run
docker run -p 3033:3033 ghcr.io/yourname/portman

# Docker Compose
services:
  portman:
    image: ghcr.io/yourname/portman:latest
    ports:
      - "3033:3033"
```

---

### Phase 2 (v0.2.0) - 高度な機能（2-6週間）

#### 新機能

**7.9 Docker統合（`--with-docker`フラグ）**

**機能**:
- Dockerコンテナのポートも表示
- コンテナ名、イメージ名を表示
- コンテナの停止

**表示例**:
| Type | PID | Port | Process | Container | Image | State | Action |
|------|-----|------|---------|-----------|-------|-------|--------|
| Host | 12345 | 9090 | bun | - | - | LISTEN | [Kill] |
| Docker | 12346 | 5432 | postgres | lab-api-postgres | postgres:16 | Up | [Stop] |

**実装**:
```bash
# Docker コンテナのポート取得
docker ps --format "{{.ID}}\t{{.Names}}\t{{.Ports}}\t{{.Image}}\t{{.Status}}"
```

**起動方法**:
```bash
# Docker連携有効化（明示的）
portman --with-docker

# Docker Run
docker run -p 3033:3033 -v /var/run/docker.sock:/var/run/docker.sock ghcr.io/yourname/portman --with-docker
```

**7.10 Windows対応**

**機能**:
- Windows環境でもポート一覧取得・kill
- PowerShellコマンド対応

**実装**:
```typescript
// src/server/core/port-manager.ts
async function getPortsWindows(): Promise<PortInfo[]> {
  const { stdout } = await execAsync('netstat -ano | findstr LISTENING');
  // パース処理
}

async function killProcessWindows(pid: string): Promise<KillResult> {
  await execAsync(`taskkill /PID ${pid} /F`);
}
```

**7.11 高度なフィルタ・ソート**

**フィルタ機能（shadcn/ui Input + Select）**:
- ポート範囲（例: 3000-4000）
- プロセス名（正規表現対応）
- プロトコル（TCP/UDP）
- 状態（LISTEN/ESTABLISHED等）
- Type（Host/Docker）

**ソート機能（shadcn/ui Table）**:
- 複数カラムソート
- 昇順/降順
- ソート状態を保存（LocalStorage）

**7.12 設定画面（shadcn/ui Dialog）**

**設定項目**:
```
General
├─ Auto-refresh        [✓] ON
├─ Refresh interval    [5s ▼]
├─ Theme               [Auto ▼]  # Light / Dark / Auto
└─ Show Docker ports   [ ] ON    # Phase 2

Confirmations
├─ Confirm before kill [✓] ON
└─ Confirm bulk kill   [✓] ON

Advanced
├─ Command timeout     [10s]
└─ Max table rows      [100]
```

---

### Phase 3 (v1.0.0) - プロダクトレベル

#### 新機能

**7.13 システムトレイ常駐（Go + Wails）**

**機能**:
- システムトレイアイコン
- クイックアクセスメニュー
- バックグラウンド監視

**メニュー例**:
```
🔌 Portman
  ├─ Open Dashboard
  ├─ Quick Kill
  │   ├─ Port 9090 (bun)
  │   ├─ Port 5432 (postgres)
  │   └─ Port 3000 (node)
  ├─ Settings
  ├─ Check for Updates
  └─ Quit
```

**7.14 ポート使用履歴（オプション）**

**機能**:
- ポート使用履歴をグラフ表示
- 時系列でポートの開放・占有を可視化

**グラフ例**:
```
Port 9090 Usage History (Last 1 hour)

12:00  ████████████████████  bun (PID: 12345)
12:15  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  node (PID: 12400)
12:30  ████████████████████  bun (PID: 12450)
12:45  (not in use)
```

**7.15 プリセット・ブックマーク（オプション）**

**機能**:
- よく使うポートをブックマーク
- プリセットグループ作成（例: "開発環境"、"本番環境"）

**プリセット例**:
```json
{
  "name": "開発環境",
  "ports": [
    { "port": 9090, "process": "bun" },
    { "port": 5432, "process": "postgres" },
    { "port": 4983, "process": "node" }
  ]
}
```

---

## 8. アーキテクチャ設計

### 8.1 システム構成図

```
┌─────────────────────────────────────────────────────┐
│                    ブラウザ                          │
│  ┌───────────────────────────────────────────────┐  │
│  │         React Frontend (shadcn/ui)            │  │
│  │  - PortTable (shadcn/ui Table)                │  │
│  │  - FilterBar (shadcn/ui Input + Select)       │  │
│  │  - Settings (shadcn/ui Dialog)                │  │
│  │  - Toast (shadcn/ui Toast)                    │  │
│  └───────────────────┬───────────────────────────┘  │
│                      │ HTTP/SWR (Auto-revalidation) │
└──────────────────────┼───────────────────────────────┘
                       │
┌──────────────────────┼───────────────────────────────┐
│                      ▼                                │
│              Hono Server (Backend)                    │
│              localhost:3033 (自動調整)                │
│  ┌────────────────────────────────────────────────┐  │
│  │  API Routes                                    │  │
│  │  - GET  /api/ports      (ポート一覧取得)       │  │
│  │  - DELETE /api/ports/:pid (プロセスkill)       │  │
│  │  - GET  /api/containers (Docker一覧) ← Phase2 │  │
│  │  - POST /api/stop/:id   (Docker停止) ← Phase2 │  │
│  └────────────────────┬───────────────────────────┘  │
│                       │                               │
│  ┌────────────────────▼───────────────────────────┐  │
│  │  Port Manager (Core Logic)                     │  │
│  │  - getListeningPorts()                         │  │
│  │  - killProcess(pid)                            │  │
│  │  - getDockerPorts() ← Phase2                   │  │
│  │  - stopContainer(id) ← Phase2                  │  │
│  └────────────────────┬───────────────────────────┘  │
│                       │                               │
└───────────────────────┼───────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
    ┌───▼───┐      ┌───▼────┐     ┌───▼────┐
    │ lsof  │      │ Docker │     │ ps/top │
    │netstat│      │  API   │     │  etc   │
    └───────┘      └────────┘     └────────┘
     (OS)           (Docker)        (OS)
```

### 8.2 Daemon 構成

```
[portman daemon] ← http://localhost:3033（自動ポート調整）
├─ GET  /api/ports          # ホストのLISTEN中ポート
├─ GET  /api/containers     # Docker コンテナ + Port Mapping（--with-dockerのみ）
├─ POST /api/kill           # PID kill（自分のプロセスのみ）
└─ POST /api/stop/:id       # docker stop（--with-dockerのみ）

UI：ブラウザでアクセス（テーブル / ソート / 絞り込み / 一括操作）
CLI：portman list / portman kill <pid>（ポート使用なし）
Tray：任意（Phase 3以降）("Open Dashboard" で localhost:3033 を開くだけ)
```

### 8.3 ポート自動調整の仕組み

```typescript
// src/server/index.ts
async function findAvailablePort(startPort: number): Promise<number> {
  for (let port = startPort; port < startPort + 100; port++) {
    try {
      // ポートが使えるかテスト
      const server = Bun.serve({
        port,
        fetch: () => new Response(""),
      });
      server.stop();
      return port;
    } catch (error) {
      // ポートが使用中、次を試す
      continue;
    }
  }
  throw new Error('利用可能なポートが見つかりませんでした');
}

const port = await findAvailablePort(3033);
console.log(`🔌 Portman起動: http://localhost:${port}`);
```

### 8.4 CLI モードの実装

```typescript
// src/cli.ts
import { program } from 'commander';

program
  .name('portman')
  .description('Open-source browser-based port manager')
  .version('0.1.0');

program
  .command('list')
  .description('List all listening ports (no daemon)')
  .option('--with-docker', 'Include Docker containers')
  .action(async (options) => {
    const ports = await getListeningPorts();

    if (options.withDocker) {
      const containers = await getDockerPorts();
      ports.push(...containers);
    }

    console.table(ports);
  });

program
  .command('kill <pid>')
  .description('Kill process by PID')
  .action(async (pid) => {
    const result = await killProcess(pid);
    console.log(result.message);
  });

program.parse();
```

### 8.5 データフロー

#### ポート一覧取得のフロー

```
1. ブラウザ (SWR auto-revalidation)
   ↓ HTTP GET /api/ports
2. Hono Server (routes/ports.ts)
   ↓ getListeningPorts()
3. Port Manager (core/port-manager.ts)
   ↓ OS判定
4. Command Executor
   ├─ macOS/Linux: lsof -i -P -n | grep LISTEN
   └─ Windows: netstat -ano | findstr LISTENING
   ↓ パース（自分のプロセスのみフィルタ）
5. Port Manager
   ↓ JSON変換
6. Hono Server
   ↓ HTTP 200 JSON
7. ブラウザ (React + SWR)
   ↓ State更新
8. UI再描画（shadcn/ui Table）
```

#### プロセスKillのフロー

```
1. ブラウザ (Killボタンクリック)
   ↓ shadcn/ui Dialog（確認）
   ↓ HTTP DELETE /api/ports/:pid
2. Hono Server (routes/ports.ts)
   ↓ 権限チェック（自分のプロセスか？）
   ↓ killProcess(pid)
3. Process Killer (core/process-killer.ts)
   ↓ OS判定
4. Command Executor
   ├─ macOS/Linux: kill -9 <pid>
   └─ Windows: taskkill /PID <pid> /F
   ↓ 結果確認
5. Process Killer
   ↓ 成功/失敗
6. Hono Server
   ↓ HTTP 200/500 JSON
7. ブラウザ (React)
   ↓ shadcn/ui Toast（成功/失敗通知）
   ↓ SWR mutate（ポート一覧再取得）
8. UI再描画
```

### 8.6 ディレクトリ構造（Phase 1）

```
portman/
├── package.json              # Root package.json
├── bun.lockb                 # Bun lockfile
├── tsconfig.json             # TypeScript設定
├── README.md                 # プロジェクト説明
├── LICENSE                   # MIT License
├── SECURITY.md               # セキュリティポリシー
├── .github/
│   └── workflows/
│       ├── ci.yml            # CI (テスト・ビルド)
│       ├── release.yml       # リリース自動化
│       └── codeql.yml        # セキュリティスキャン
├── docs/
│   ├── CONTRIBUTING.md       # 貢献ガイドライン
│   ├── ARCHITECTURE.md       # アーキテクチャ詳細
│   └── screenshots/          # スクリーンショット
├── src/
│   ├── server/               # Backend (Hono)
│   │   ├── index.ts          # エントリーポイント
│   │   ├── routes/           # APIルート
│   │   │   └── ports.ts      # ポート関連API
│   │   ├── core/             # コアロジック
│   │   │   ├── port-manager.ts  # ポート管理
│   │   │   └── process-killer.ts # プロセスkill
│   │   ├── utils/            # ユーティリティ
│   │   │   ├── os-detector.ts   # OS判定
│   │   │   ├── port-finder.ts   # ポート自動調整
│   │   │   └── permission.ts    # 権限チェック
│   │   └── types/            # 型定義
│   │       └── index.ts
│   ├── ui/                   # Frontend (React)
│   │   ├── src/
│   │   │   ├── App.tsx       # メインコンポーネント
│   │   │   ├── components/
│   │   │   │   ├── ui/       # shadcn/ui components
│   │   │   │   │   ├── table.tsx
│   │   │   │   │   ├── button.tsx
│   │   │   │   │   ├── dialog.tsx
│   │   │   │   │   ├── toast.tsx
│   │   │   │   │   └── ...
│   │   │   │   ├── PortTable.tsx
│   │   │   │   ├── FilterBar.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   └── Settings.tsx
│   │   │   ├── hooks/        # カスタムフック
│   │   │   │   └── usePorts.ts  # SWR wrapper
│   │   │   ├── stores/       # Zustand stores
│   │   │   │   └── useSettingsStore.ts
│   │   │   ├── lib/          # ユーティリティ
│   │   │   │   └── utils.ts  # shadcn/ui utils
│   │   │   └── types/        # 型定義
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.js
│   │   └── components.json   # shadcn/ui config
│   └── cli.ts                # CLIエントリーポイント
├── tests/                    # テスト
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── scripts/                  # ビルド・デプロイスクリプト
│   ├── build.ts
│   └── release.ts
├── Dockerfile                # Docker イメージ
└── docker-compose.yml        # Docker Compose設定
```

---

## 9. UI/UXデザイン

### 9.1 shadcn/ui 採用理由

**shadcn/uiとは**:
- TailwindCSSベースのUIコンポーネント集
- コンポーネントをコピー&ペーストで使用
- ソースコードが手元にあるので自由にカスタマイズ可能
- Radix UIベースでアクセシビリティ◎

**採用理由**:
1. ✅ **開発速度UP**: コンポーネントをコピペで即使える
2. ✅ **一貫性**: TailwindCSSベースで統一感
3. ✅ **カスタマイズ性**: ライブラリではなくソースコード
4. ✅ **アクセシビリティ**: WAI-ARIA準拠（Radix UI）
5. ✅ **モダンなUI**: Drizzle StudioやVercel的な洗練されたデザイン
6. ✅ **型安全**: TypeScript完全対応

**Phase 1で使用するコンポーネント**:
- `Table` - ポート一覧表示
- `Button` - Kill/Refresh ボタン
- `Input` - 検索フィルタ
- `Checkbox` - 複数選択
- `Dialog` - 確認ダイアログ
- `Toast` - 成功/エラー通知
- `Switch` - 自動更新ON/OFF
- `Badge` - ステータス表示（LISTEN/Up等）
- `Select` - ドロップダウン（更新間隔選択等）

### 9.2 画面構成

#### メイン画面（ポート一覧）

```tsx
// PortTable.tsx（shadcn/ui使用例）
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Trash2 } from "lucide-react"

export function PortTable({ ports, onKill, onSelectAll, selectedPids }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selectedPids.length === ports.length}
                onCheckedChange={onSelectAll}
              />
            </TableHead>
            <TableHead>PID</TableHead>
            <TableHead>Port</TableHead>
            <TableHead>Process</TableHead>
            <TableHead>Command</TableHead>
            <TableHead>State</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ports.map((port) => (
            <TableRow key={port.pid}>
              <TableCell>
                <Checkbox
                  checked={selectedPids.includes(port.pid)}
                  onCheckedChange={(checked) => onSelect(port.pid, checked)}
                />
              </TableCell>
              <TableCell className="font-mono text-sm">
                {port.pid}
              </TableCell>
              <TableCell className="font-mono text-sm text-blue-600 dark:text-blue-400">
                {port.port}
              </TableCell>
              <TableCell className="font-medium">
                {port.process}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {port.command}
              </TableCell>
              <TableCell>
                <Badge variant="success">
                  {port.state}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onKill(port.pid)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Kill
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
```

#### Header & FilterBar

```tsx
// Header.tsx
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { RefreshCw, Settings, Moon, Sun } from "lucide-react"

export function Header({ onRefresh, autoRefresh, onToggleAutoRefresh, theme, onToggleTheme }) {
  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4 gap-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔌</span>
          <h1 className="text-xl font-bold">Portman</h1>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <Label htmlFor="auto-refresh">Auto-refresh</Label>
          <Switch
            id="auto-refresh"
            checked={autoRefresh}
            onCheckedChange={onToggleAutoRefresh}
          />
        </div>

        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>

        <Button variant="ghost" size="sm" onClick={onToggleTheme}>
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-4 px-4 pb-4">
        <Input
          placeholder="Search by port or process name..."
          className="max-w-sm"
        />
      </div>
    </div>
  )
}
```

#### 確認ダイアログ

```tsx
// KillDialog.tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function KillDialog({ open, onOpenChange, port, onConfirm }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>プロセスを終了しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            以下のプロセスを終了します：
            <div className="mt-4 rounded-md border p-4 font-mono text-sm">
              PID: {port.pid}<br/>
              Port: {port.port}<br/>
              Process: {port.process}<br/>
              Command: {port.command}
            </div>
            この操作は取り消せません。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground">
            終了する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

### 9.3 カラースキーム

shadcn/uiのデフォルトテーマを使用：

#### ダークモード（デフォルト）
```css
--background: 0 0% 3.9%;
--foreground: 0 0% 98%;
--primary: 210 40% 98%;
--destructive: 0 62.8% 30.6%;
--muted: 217.2 32.6% 17.5%;
```

#### ライトモード
```css
--background: 0 0% 100%;
--foreground: 222.2 84% 4.9%;
--primary: 222.2 47.4% 11.2%;
--destructive: 0 84.2% 60.2%;
--muted: 210 40% 96.1%;
```

### 9.4 レスポンシブ対応

#### モバイルビュー（< 768px）

```tsx
// MobilePortCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function MobilePortCard({ port, onKill }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-blue-600">Port {port.port}</span>
          <Badge variant="success">{port.state}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-sm">
          <span className="text-muted-foreground">PID:</span> {port.pid}
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Process:</span> {port.process}
        </div>
        <div className="text-sm truncate">
          <span className="text-muted-foreground">Command:</span> {port.command}
        </div>
        <Button
          variant="destructive"
          size="sm"
          className="w-full mt-4"
          onClick={() => onKill(port.pid)}
        >
          Kill Process
        </Button>
      </CardContent>
    </Card>
  )
}
```

---

## 10. 実装計画

### 10.1 Phase 1 マイルストーン（1-2週間）

#### Week 1: コアロジック・バックエンド

| Day | タスク | 成果物 |
|-----|--------|--------|
| **Day 1** | プロジェクトセットアップ | リポジトリ、Bun + Hono + React + shadcn/ui |
| **Day 2** | Port Manager実装 | getListeningPorts() - Unix版 |
| **Day 3** | Process Killer実装 | killProcess() - Unix版、権限チェック |
| **Day 4** | ポート自動調整実装 | findAvailablePort()、起動ロジック |
| **Day 5** | CLI モード実装 | `portman list`、`portman kill <pid>` |
| **Day 6** | Hono API実装 | GET /api/ports、DELETE /api/ports/:pid |
| **Day 7** | テスト作成 | ユニットテスト、統合テスト |

#### Week 2: フロントエンド・Docker配布

| Day | タスク | 成果物 |
|-----|--------|--------|
| **Day 8** | shadcn/ui セットアップ | Table, Button, Dialog, Toast等 |
| **Day 9** | PortTable実装 | ポート一覧表示、ソート |
| **Day 10** | Kill機能実装 | 確認ダイアログ、トースト通知 |
| **Day 11** | FilterBar実装 | 検索、フィルタ |
| **Day 12** | 設定画面実装 | 自動更新間隔、テーマ切り替え |
| **Day 13** | Docker配布設定 | Dockerfile、docker-compose.yml、GitHub Actions |
| **Day 14** | ドキュメント・リリース | README、スクリーンショット、v0.1.0公開 |

### 10.2 Phase 2 マイルストーン（2-6週間）

#### Week 3: フィードバック収集・バグ修正

| Week | フォーカス | 主要機能 |
|------|-----------|---------|
| **Week 3** | フィードバック対応 | Issue対応、バグ修正、v0.1.1リリース |
| **Week 4** | Windows対応 | getPortsWindows()、killProcessWindows() |
| **Week 5** | Docker連携 | `--with-docker`フラグ、getDockerPorts() |
| **Week 6** | 高度な機能 | フィルタ強化、ソート、設定画面拡張 |

### 10.3 Phase 3 マイルストーン（必要時）

#### Go + Wails移植

| Week | タスク | 成果物 |
|------|--------|--------|
| **Week 1** | Goバックエンド実装 | Port Manager、Process Killer |
| **Week 2** | Wails統合 | React UIをWailsに統合 |
| **Week 3** | システムトレイ実装 | メニュー、通知 |
| **Week 4** | バイナリ配布 | GitHub Release、Homebrew |

---

## 11. 配布・デプロイ戦略

### 優先度1: Docker（Phase 1）

#### 使い方

```bash
# Docker Run
docker run -p 3033:3033 ghcr.io/yourname/portman

# Docker Compose
services:
  portman:
    image: ghcr.io/yourname/portman:latest
    ports:
      - "3033:3033"
```

#### アップデート

```bash
docker pull ghcr.io/yourname/portman:latest
docker compose up -d
```

#### メリット

- ✅ **最も安全**: イメージが公開、検証可能
- ✅ **最も手軽**: `docker pull`で即起動
- ✅ **環境依存なし**: Docker があれば動く
- ✅ **アップデート簡単**: `docker pull`のみ

---

### 優先度2: Homebrew（Phase 4）

#### Formula

```ruby
# Formula/portman.rb
class Portman < Formula
  desc "Open-source browser-based port manager"
  homepage "https://github.com/yourname/portman"
  url "https://github.com/yourname/portman/releases/download/v1.0.0/portman-darwin-arm64.tar.gz"
  sha256 "..."
  license "MIT"

  def install
    bin.install "portman"
  end

  service do
    run [opt_bin/"portman", "serve"]
    keep_alive true
    log_path var/"log/portman.log"
    error_log_path var/"log/portman.error.log"
  end

  test do
    system "#{bin}/portman", "--version"
  end
end
```

#### 使い方

```bash
# インストール
brew install portman

# 常駐運用
brew services start portman

# アップデート
brew upgrade portman
```

#### メリット

- ✅ **macOS開発者に最適**: 馴染みのあるツール
- ✅ **常駐運用**: システム起動時に自動起動
- ✅ **アップデート簡単**: `brew upgrade`のみ

---

### 優先度3: npx（Phase 1）

#### 使い方

```bash
# お試し（インストール不要）
npx portman@latest

# グローバルインストール
npm install -g portman
portman
```

#### アップデート

```bash
npm update -g portman
```

#### メリット

- ✅ **インストール不要**: `npx`で即起動
- ✅ **お試しに最適**: 気軽に試せる

---

### 優先度4: GitHub Releaseバイナリ（Phase 3）

#### 使い方

```bash
# macOS (ARM64)
curl -L https://github.com/yourname/portman/releases/download/v1.0.0/portman-darwin-arm64 -o portman
chmod +x portman
./portman

# Linux (AMD64)
curl -L https://github.com/yourname/portman/releases/download/v1.0.0/portman-linux-amd64 -o portman
chmod +x portman
./portman

# Windows (AMD64)
# GitHub Releaseからportman-windows-amd64.exeをダウンロード
portman-windows-amd64.exe
```

#### GitHub Actions（自動ビルド・リリース）

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    strategy:
      matrix:
        include:
          - os: macos-latest
            target: darwin-arm64
          - os: ubuntu-latest
            target: linux-amd64
          - os: windows-latest
            target: windows-amd64

    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1

      - name: Build
        run: |
          bun install
          bun run build
          bun compile --target ${{ matrix.target }} --output portman-${{ matrix.target }}

      - name: Upload Release Asset
        uses: actions/upload-release-asset@v1
        with:
          upload_url: ${{ github.event.release.upload_url }}
          asset_path: ./portman-${{ matrix.target }}
          asset_name: portman-${{ matrix.target }}
```

---

### 配布方法比較表

| 配布方法 | 対象 | インストール | 起動速度 | アップデート | セキュリティ |
|---------|------|-------------|---------|-------------|-------------|
| **Docker** | 全開発者 | `docker pull` | 普通 | `docker pull` | ✅ イメージ検証可能 |
| **Homebrew** | macOSユーザー | `brew install` | 高速 | `brew upgrade` | ✅ Formula公開 |
| **npx** | 開発者（試用） | 不要 | 普通 | `npx @latest` | ✅ npm公開 |
| **バイナリ** | 全環境 | ダウンロード | 超高速 | 手動DL | ✅ GitHub Release |

**推奨配布方法**:
1. **Docker** - メイン配布方法（Phase 1）
2. **Homebrew** - macOS常駐運用（Phase 4）
3. **npx** - お試し用（Phase 1）
4. **バイナリ** - Go + Wails版（Phase 3）

---

## 12. ローンチ戦略

### 12.1 ドキュメント準備

#### README.md構成

```markdown
# 🔌 Portman

> **Open-source, browser-based port manager for developers**

[![Docker](https://img.shields.io/docker/pulls/yourname/portman)](https://hub.docker.com/r/yourname/portman)
[![npm](https://img.shields.io/npm/v/portman)](https://www.npmjs.com/package/portman)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[Demo GIF or Screenshot]

---

## ✨ Why Portman?

### 🔓 **Open Source, Open Security**
- **100% Open Source** - Verify the code, audit the security
- **docker.sock access OFF by default** - Enable explicitly with `--with-docker`
- **Kill own processes only by default** - Safe by design

### 🌐 **Modern Developer Experience**
- **Browser-based UI** - No installation, just `docker pull`
- **Real-time updates** - Auto-refresh every 5 seconds
- **CLI mode** - `portman list` / `portman kill <pid>`
- **Auto port adjustment** - 3033 → 3034 → 3035 ... if port is in use

### 🚀 **Easy to Use**
```bash
# Docker
docker run -p 3033:3033 ghcr.io/yourname/portman

# npx
npx portman

# Homebrew (Phase 4)
brew install portman
```

---

## 🎯 Use Cases

- ✅ Fix "port already in use" errors
- ✅ Clean up development environment
- ✅ Monitor Docker container ports
- ✅ Kill multiple processes at once

---

## 📦 Installation

[Installation Guide](docs/installation.md)

---

## 🔒 Security

See [SECURITY.md](SECURITY.md) for our security policy.

- localhost-only binding by default
- Docker socket access disabled by default
- Kill own processes only by default
- No telemetry/data collection

---

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## 📄 License

MIT © [Your Name](https://github.com/yourname)
```

---

### 12.2 コミュニティ投稿

#### Product Hunt

**タイトル**: Portman - Open-source port manager with browser UI

**Tagline**: Say goodbye to "port already in use" errors, safely

**説明**:
```
Portman is an **open-source**, browser-based port manager for developers.

🔓 **Why Open Source Matters:**
- Closed-source tools + docker.sock = security risk
- Verify the code, audit the security
- No black-box binaries with root-equivalent access

✨ **Features:**
- Browser-based UI (like pgweb, but for ports)
- Real-time updates
- Docker support (opt-in with `--with-docker`)
- CLI mode (`portman list` / `portman kill <pid>`)
- Auto port adjustment (3033 → 3034 → ...)

🚀 **Quick Start:**
docker run -p 3033:3033 ghcr.io/yourname/portman

Perfect for web developers, DevOps engineers, and anyone frustrated with `lsof` 😅
```

#### Hacker News

**タイトル**: Show HN: Portman – Open-source browser-based port manager

**本文**:
```
Hi HN!

I built Portman, an open-source, browser-based port manager.

GitHub: https://github.com/yourname/portman
Demo: [GIF or live demo link]

**Background:**
I use Claude Code and often have background processes left running, causing "port already in use" errors. Existing tools work but have issues:

- lsof/netstat: command-line, not visual
- Market apps (Open Ports, etc.): **closed-source + docker.sock = security risk**
- fzf/gum: require installation, TUI learning curve

**Why Open Source Matters:**
docker.sock access = root-equivalent permissions. Giving that to a closed-source binary is dangerous. That's why Portman is 100% open source.

**Features:**
- Browser UI (React + shadcn/ui)
- Docker support (opt-in with `--with-docker`)
- CLI mode (no port usage)
- Auto port adjustment (3033 → 3034 → ...)
- localhost-only binding by default

**Tech stack:** Bun + Hono + React + shadcn/ui

Looking forward to feedback!
```

---

### 12.3 マーケティングタイムライン

**Week 1: ソフトローンチ**
- Day 1: Docker image公開（ghcr.io）
- Day 2: npm publish
- Day 3: Product Hunt投稿
- Day 4: Hacker News投稿
- Day 5: Reddit投稿（r/programming, r/webdev, r/docker）
- Day 6-7: フィードバック収集、バグ修正

**Week 2: コンテンツマーケティング**
- Dev.to記事投稿（技術詳細）
- Twitter/X定期投稿
- YouTube デモ動画（オプション）

**Week 3-4: コミュニティエンゲージメント**
- GitHub Issues対応
- 機能リクエスト検討
- ドキュメント改善
- v0.2.0開発開始

---

## 13. ライセンス・貢献ガイドライン

### 13.1 ライセンス

**MIT License**

**理由**:
- ✅ 最も普及したOSSライセンス
- ✅ 商用利用可能
- ✅ コントリビューター参加しやすい
- ✅ 企業での利用も安心

---

## 14. 開発スケジュール

### Phase 1（1-2週間）: MVP開発

**Week 1-2**: Bun + Hono + React + shadcn/ui でMVP完成
- Docker配布
- npx対応
- CLI モード

**成果物**: v0.1.0リリース

---

### Phase 2（2-6週間）: 機能拡充

**Week 3-6**: フィードバック反映、Windows対応、Docker連携

**成果物**: v0.2.0リリース

---

### Phase 3（必要時）: ネイティブ化

**Go + Wails移植**
- システムトレイ常駐
- シングルバイナリ配布

**成果物**: v1.0.0リリース

---

### Phase 4: 配布最適化

**Homebrew / Winget / Scoop対応**
- 自動アップデート機能

**成果物**: v1.x.xリリース

---

## 15. リスク・課題

### 15.1 セキュリティリスク

#### リスク: docker.sockへのアクセス

**詳細**:
- docker.sockへのアクセス = root権限相当
- 悪意のあるコードが混入した場合、ホストを完全に侵害可能

**影響度**: 高
**発生確率**: 低（OSSなので監査可能）

**対策**:
- ✅ デフォルトOFF（`--with-docker`で明示有効化）
- ✅ 有効化時も警告表示
- ✅ 読み取り専用操作を優先
- ✅ README に注意事項を大きく記載
- ✅ GitHub Security（CodeQL、Dependabot）

---

### 15.2 技術的リスク

#### リスク: クロスプラットフォーム対応の複雑さ

**詳細**:
- macOS: lsof
- Linux: lsof / ss
- Windows: netstat / Get-NetTCPConnection
- コマンド出力形式が異なる

**影響度**: 中
**発生確率**: 高

**対策**:
- ✅ OS別の処理を明確に分離
- ✅ GitHub Actionsでマトリックステスト
- ✅ Windows対応はPhase 2以降（macOS/Linux先行）

---

### 15.3 競合リスク

#### リスク: 類似ツールの登場

**詳細**:
- 同様のコンセプトのツールが先に公開される

**影響度**: 中
**発生確率**: 低

**対策**:
- ✅ 早期リリース（Week 1-2でMVP公開）
- ✅ 差別化ポイントの明確化（OSS、セキュリティファースト）
- ✅ 継続的な機能追加

---

## 16. 参考資料

### 16.1 既存ツール調査

#### TUIツール
- **fzf**: https://github.com/junegunn/fzf
- **gum**: https://github.com/charmbracelet/gum
- **bandwhich**: https://github.com/imsnif/bandwhich
- **fkill-cli**: https://github.com/sindresorhus/fkill-cli

#### ブラウザベースツール
- **pgweb**: https://github.com/sosedoff/pgweb
- **Drizzle Studio**: https://orm.drizzle.team/drizzle-studio/overview

### 16.2 技術ドキュメント

#### Bun
- 公式ドキュメント: https://bun.sh/docs
- GitHub: https://github.com/oven-sh/bun

#### Hono
- 公式ドキュメント: https://hono.dev/
- GitHub: https://github.com/honojs/hono

#### shadcn/ui
- 公式ドキュメント: https://ui.shadcn.com/
- GitHub: https://github.com/shadcn/ui

---

## 付録A: Phase別チェックリスト

### Phase 1（MVP）
- [ ] プロジェクトセットアップ
- [ ] Port Manager実装（macOS/Linux）
- [ ] Process Killer実装
- [ ] ポート自動調整実装
- [ ] CLI モード実装
- [ ] Hono API実装
- [ ] shadcn/ui セットアップ
- [ ] PortTable実装
- [ ] Kill機能実装
- [ ] Docker配布設定
- [ ] README.md作成
- [ ] v0.1.0リリース

### Phase 2（機能拡充）
- [ ] Windows対応
- [ ] Docker連携（`--with-docker`）
- [ ] 高度なフィルタ・ソート
- [ ] 設定画面
- [ ] v0.2.0リリース

### Phase 3（ネイティブ化）
- [ ] Goバックエンド実装
- [ ] Wails統合
- [ ] システムトレイ実装
- [ ] バイナリ配布
- [ ] v1.0.0リリース

### Phase 4（配布最適化）
- [ ] Homebrew Formula作成
- [ ] Winget対応
- [ ] Scoop対応
- [ ] 自動アップデート機能

---

## 改訂履歴

| バージョン | 日付 | 変更内容 | 著者 |
|-----------|------|---------|------|
| 0.1.0 | 2025-11-06 | 初版作成 | - |
| 0.2.0 | 2025-11-06 | フィードバック反映版（OSS・セキュリティ重視、Phase別戦略、shadcn/ui採用） | - |

---

**このドキュメントは新リポジトリ作成前の計画段階のものです。実装開始後、適宜更新してください。**
