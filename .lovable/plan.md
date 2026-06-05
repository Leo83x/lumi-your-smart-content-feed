## Plano de produção — lumi.

Você mantém seu **Supabase próprio** e o login no app será feito **só com o Google do YouTube**: o mesmo consentimento que autoriza o feed também identifica o usuário. Sem tela de email/senha, sem botão "Sign in with Google" separado.

### 1. Você prepara (em paralelo enquanto eu codo)

**Supabase (Settings → API):**
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY` (anon)
- `SUPABASE_SERVICE_ROLE_KEY`

**Google Cloud Console:**
1. Crie projeto "lumi" em https://console.cloud.google.com
2. APIs & Services → Library → habilite **YouTube Data API v3**
3. OAuth consent screen → External; adicione seu email como Test user; scopes:
   - `openid`, `email`, `profile` (identidade)
   - `https://www.googleapis.com/auth/youtube.readonly` (feed)
4. Credentials → OAuth client ID → Web application
   - Authorized redirect URIs: te passo os 2 valores exatos (preview + prod) assim que o backend estiver de pé
5. Copie **Client ID** e **Client Secret**

Eu vou pedir 5 secrets pelo form seguro quando estiver pronto: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`.

### 2. Schema do banco (SQL pra você rodar no SQL Editor)

Vou te entregar o SQL completo num único bloco. Tabelas (todas com RLS por `auth.uid()`):

- `profiles` — id (FK auth.users), name, interests[], daily_minutes, whatsapp, google_email
- `oauth_connections` — user_id, provider='youtube', access_token, refresh_token, expires_at, scope, google_sub
- `youtube_channels` — user_id, channel_id, title, thumbnail, source ('subscription'|'manual'), uploads_playlist_id
- `rss_sources` — user_id, url, title
- `feed_items` — id, user_id, source, source_name, external_id, title, summary, url, media_kind, media_src, duration, published_at, relevance_score, category, feedback ; UNIQUE(user_id, source, external_id)
- `waitlist` — name, email (insert público)

Inclui `GRANT`s explícitos pra `authenticated` e `service_role` (RLS sozinha não é suficiente no PostgREST).

### 3. Auth — Google-only via OAuth próprio

Como o login é o **mesmo** Google que dá acesso ao YouTube, NÃO uso `supabase.auth.signInWithOAuth` nem o broker do Lovable. Faço fluxo OAuth próprio que:

1. `GET /api/youtube/oauth/start` → redireciona pro Google com scopes `openid email profile youtube.readonly` + `access_type=offline&prompt=consent` (garante refresh_token).
2. `GET /api/youtube/oauth/callback` → troca code por tokens, decodifica `id_token` pra pegar `sub`/`email`, cria/atualiza o usuário no Supabase via Admin API (`auth.admin.createUser` ou `getUserByEmail`), gera uma sessão (magic link `generateLink type='magiclink'` ou `signInWithIdToken`), salva tokens em `oauth_connections`, redireciona pro `/feed`.
3. Sessão fica no `localStorage` do Supabase normalmente; resto do app usa `requireSupabaseAuth`.

Telas:
- `/` (público) — landing atual
- `/auth` — só um botão **"Entrar com Google"** que vai pro `/api/youtube/oauth/start`
- `_authenticated/onboarding` — salva em `profiles`
- `_authenticated/feed` — feed real
- `_authenticated/settings` — gerenciar canais e RSS

### 4. Backend — server functions

- `syncYoutubeSubscriptions` — `youtube/v3/subscriptions?mine=true` + resolve `uploads_playlist_id` (1× via `channels.list`)
- `addManualChannel(urlOrHandle)` — `channels.list` por handle/ID
- `removeChannel(channelId)`
- `addRssSource(url)` / `removeRssSource(id)`
- `refreshFeed` — pra cada canal: `playlistItems.list(uploads_playlist_id, maxResults=10)` → upsert em `feed_items` deduplicando. Pra RSS: fetch + parse XML. Aplica relevância heurística (match com `profiles.interests` + recência).
- `getFeedItems({ category? })` — leitura usada pelo `/feed`
- Refresh automático do access_token quando `expires_at < now()` usando `refresh_token`

### 5. Frontend (mantém UI atual, troca a fonte dos dados)

- `/feed` deixa de usar `MOCK_FEED`, passa a usar `useSuspenseQuery(getFeedItems)` com botão "Atualizar agora" chamando `refreshFeed`
- Cards de YouTube usam thumbnail real do `feed_items.media_src`
- Reel premium continua existindo (formato visual, alimentado por items de YouTube curtos < 60s)
- INSIGHTS continua estático na v1
- `/settings` ganha seção "Conectar YouTube" (se ainda não conectou) + lista de canais com remover + form pra adicionar canal manual + form RSS
- `/onboarding` salva em `profiles` ao invés de localStorage

### 6. Deploy

- Publicar via Lovable
- Você adiciona o redirect URI de produção no Google Console
- Atualizo os secrets de produção

### Fora de escopo desta iteração
- Instagram
- WhatsApp daily digest
- IA de filtragem (fica heurística; LLM via Lovable AI Gateway depois)
- Cron de refresh em background (v1 é refresh on-demand ao abrir o feed)

### Detalhes técnicos
- Tokens OAuth ficam no Supabase, RLS impede leitura cross-user, service role usado só dentro de server fns
- `attachSupabaseAuth` registrado em `src/start.ts` pra anexar bearer automaticamente
- Server routes ficam em `src/routes/api/youtube/oauth/{start,callback}.ts`
- `oauth_connections` guarda `google_sub` pra reconectar mesma conta sem duplicar

### O que preciso pra começar a codar agora

Diga **"vamos"** e eu começo pela ordem: schema SQL (te entrego pra rodar) → server routes OAuth → server fns YouTube → tela `/auth` → troca do mock no `/feed`. Vou pedir os 5 secrets no momento certo.