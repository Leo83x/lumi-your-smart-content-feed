## Objetivo

Levar o lumi. para produção com feed real do **YouTube** (inscrições do usuário + canais favoritados manualmente) e **RSS**, usando o seu Supabase próprio. Instagram fica para uma próxima iteração.

## Passo 1 — Você cria as credenciais (eu te guio)

### A) Supabase próprio
Preciso de 3 valores do seu projeto Supabase (Settings → API):
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY` (anon)
- `SUPABASE_SERVICE_ROLE_KEY` (secret)

Vou pedir via formulário seguro de secrets quando você der OK.

### B) Google OAuth (YouTube Data API v3)
Passo a passo no Google Cloud Console:
1. https://console.cloud.google.com → crie um projeto "lumi".
2. **APIs & Services → Library** → habilite **YouTube Data API v3**.
3. **OAuth consent screen** → External → preencha nome, email, logo. Em *Scopes*, adicione `https://www.googleapis.com/auth/youtube.readonly`. Adicione seu email como Test user.
4. **Credentials → Create credentials → OAuth client ID** → tipo **Web application**.
   - Authorized redirect URI: vou te dar o valor exato depois que o backend estiver de pé (algo como `https://connector-gateway.lovable.dev/...`).
5. Copie **Client ID** e **Client Secret**.

Você me envia esses dois quando estiverem prontos.

## Passo 2 — Schema do banco (migrations)

Tabelas em `public` (com RLS por `auth.uid()`):
- `profiles` — id, name, interests[], daily_minutes, whatsapp
- `oauth_connections` — user_id, provider ('youtube'), access_token, refresh_token, expires_at, scope
- `youtube_channels` — user_id, channel_id, title, thumbnail, source ('subscription'|'manual')
- `rss_sources` — user_id, url, title
- `feed_items` — id, user_id, source, source_name, external_id, title, summary, url, media_kind, media_src, relevance_score, category, created_at, feedback
- `waitlist` — name, email (público p/ insert)

## Passo 3 — Backend (TanStack server functions)

- **Auth**: email/senha + Google sign-in (managed broker) na rota `/auth`. Reescrever onboarding/feed/settings sob `_authenticated/`.
- **OAuth YouTube**: fluxo próprio (não connector — connectors do Google são da workspace, não do end-user). Rotas:
  - `GET /api/youtube/oauth/start` — redireciona para Google.
  - `GET /api/youtube/oauth/callback` — troca code por tokens, salva em `oauth_connections`.
- **Sincronização** (server functions chamadas do feed):
  - `syncYoutubeSubscriptions` — `youtube/v3/subscriptions?mine=true` → preenche `youtube_channels`.
  - `addManualChannel(query|url)` — `youtube/v3/search` ou parse de URL.
  - `refreshFeed` — para cada canal, pega últimos vídeos via `playlistItems` (uploads playlist), insere em `feed_items` deduplicando por `external_id`. Para RSS, fetch + parse XML.
- **Relevância**: heurística simples na v1 (match de tags do `profiles.interests` + recência). IA fica para próxima iteração.

## Passo 4 — Frontend

- Tela `/auth` (login/cadastro + Google).
- Onboarding salva em `profiles` (Supabase) ao invés de localStorage.
- `/settings`: botão **"Conectar YouTube"**, lista de canais (subs + manuais com botão remover), campo para adicionar canal manual e feed RSS.
- `/feed`: troca mock por `useSuspenseQuery` em `getFeedItems` server fn. Mantém UI atual (cards, reel, insights, neon).
- Botão de refresh manual + auto-refresh a cada navegação.

## Passo 5 — Deploy

- Configurar secrets em produção (Supabase + Google OAuth).
- Adicionar redirect URI de produção no Google Console.
- Publicar via Lovable.

## Fora de escopo desta iteração

- Instagram (precisa de revisão Meta + conta Business).
- WhatsApp daily digest (requer Twilio/Meta WhatsApp Business — posso adicionar depois).
- IA de filtragem (heurística agora; LLM via Lovable AI Gateway depois).

## Detalhes técnicos

- Tokens OAuth do usuário salvos cifrados no Supabase (RLS impede leitura cross-user; service role apenas em server fns).
- Refresh automático do access_token quando `expires_at < now()`.
- `feed_items.external_id` único por `(user_id, source, external_id)` para deduplicar.
- Rate limits: YouTube tem cota de 10k unidades/dia — `subscriptions.list` (1) + `playlistItems.list` (1) por canal cabe folgado para v1.

## O que preciso de você para começar

1. OK para ativar o fluxo? Respondendo "sim, vamos" eu começo pelos passos 2-3 (schema + backend stub) enquanto você cria as credenciais Google.
2. Quando tiver `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, me avise para eu abrir o form de secrets.
