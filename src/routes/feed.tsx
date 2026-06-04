import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Wordmark } from "@/components/lumi/Wordmark";
import { MOCK_FEED, type FeedItem } from "@/lib/lumi/mockFeed";
import ytThumb from "@/assets/yt-thumb-react.jpg";
import reelPoster from "@/assets/reel-aggregator.jpg";
import {
  Bell,
  Settings as SettingsIcon,
  Rss,
  Library,
  Link2,
  Crown,
  Sparkles,
  Play,
  Volume2,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Feed · lumi." },
      { name: "description", content: "Seu feed unificado e curado." },
    ],
  }),
  component: FeedPage,
});

type Mode = "foco" | "lazer";

function FeedPage() {
  const [mode, setMode] = useState<Mode>("foco");
  const [feedback, setFeedback] = useState<Record<string, "up" | "down">>({});

  return (
    <div className="min-h-screen bg-background pb-20 text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
          <Wordmark className="text-xl" />
          <div className="flex items-center gap-2">
            <button
              aria-label="Notificações"
              className="relative grid h-9 w-9 place-items-center rounded-full border border-primary/30 bg-card text-foreground shadow-[0_0_18px_-4px_oklch(0.89_0.21_130/0.55)] transition hover:border-primary/60"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_oklch(0.89_0.21_130/0.9)]" />
            </button>
            <Link
              to="/settings"
              aria-label="Configurações"
              className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              <SettingsIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="mx-auto max-w-2xl px-5 pb-3">
          <div className="inline-flex rounded-[20px] border border-border bg-card p-1 shadow-[0_0_22px_-10px_oklch(0.89_0.21_130/0.6)]">
            <ModeButton active={mode === "foco"} onClick={() => setMode("foco")}>
              Modo Foco
            </ModeButton>
            <ModeButton active={mode === "lazer"} onClick={() => setMode("lazer")}>
              Modo Lazer
            </ModeButton>
          </div>
        </div>

        <GlobalNav />
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-5 pt-6">
        <InsightsStrip />

        {MOCK_FEED.map((item, idx) => (
          <FeedCard
            key={item.id}
            item={item}
            showDiscoveryBadge={(idx + 1) % 3 === 0}
            feedback={feedback[item.id]}
            onFeedback={(v) =>
              setFeedback((f) => ({ ...f, [item.id]: f[item.id] === v ? (undefined as any) : v }))
            }
          />
        ))}
        <p className="pt-8 text-center text-xs text-muted-foreground">
          Você chegou ao fim do seu feed de hoje. Bom descanso ✦
        </p>
      </main>
    </div>
  );
}

function GlobalNav() {
  const items = [
    { label: "Feed", icon: Rss, active: true },
    { label: "Curadorias", icon: Library, active: false },
    { label: "Conexões", icon: Link2, active: false },
    { label: "Assinatura", icon: Crown, active: false },
  ];
  return (
    <nav className="border-t border-border/60 bg-background/70">
      <div className="mx-auto flex max-w-2xl items-stretch justify-between gap-1 px-3 py-2">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <button
              key={it.label}
              className={`group relative flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 transition ${
                it.active
                  ? "text-primary"
                  : "text-[oklch(0.92_0.19_95)] hover:bg-card/60"
              }`}
            >
              {it.active && (
                <span className="absolute inset-x-3 -top-[1px] h-px bg-primary shadow-[0_0_12px_oklch(0.89_0.21_130/0.9)]" />
              )}
              <Icon
                className={`h-[18px] w-[18px] ${
                  it.active
                    ? "drop-shadow-[0_0_6px_oklch(0.89_0.21_130/0.85)]"
                    : "drop-shadow-[0_0_5px_oklch(0.92_0.19_95/0.55)]"
                }`}
                strokeWidth={2.2}
              />
              <span className="text-[11px] font-medium tracking-wide">{it.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function InsightsStrip() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[oklch(0.92_0.19_95/0.35)] bg-gradient-to-br from-[oklch(0.92_0.19_95/0.08)] via-card to-card p-4 shadow-[0_0_30px_-12px_oklch(0.92_0.19_95/0.6)]">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[oklch(0.92_0.19_95/0.18)] blur-3xl" />
      <div className="relative">
        <div className="flex items-center gap-2">
          <Sparkles
            className="h-4 w-4 text-[oklch(0.92_0.19_95)] drop-shadow-[0_0_6px_oklch(0.92_0.19_95/0.9)]"
            strokeWidth={2.4}
          />
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[oklch(0.92_0.19_95)]">
            Insights
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-foreground/90">
          Hoje seu tema dominante é <span className="font-semibold text-foreground">engenharia & IA</span>. A
          lumi. priorizou 3 leituras profundas e cortou 12 distrações.
        </p>
        <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="rounded-full border border-[oklch(0.92_0.19_95/0.4)] px-2 py-0.5 text-[oklch(0.92_0.19_95)]">
            17 min economizados
          </span>
          <span>•</span>
          <span>5 fontes filtradas</span>
        </div>
      </div>
    </section>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-[16px] px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function FeedCard({
  item,
  showDiscoveryBadge,
  feedback,
  onFeedback,
}: {
  item: FeedItem;
  showDiscoveryBadge: boolean;
  feedback?: "up" | "down";
  onFeedback: (v: "up" | "down") => void;
}) {
  if (item.media?.kind === "reel") {
    return (
      <ReelCard
        item={item}
        showDiscoveryBadge={showDiscoveryBadge}
        feedback={feedback}
        onFeedback={onFeedback}
      />
    );
  }

  return (
    <article className="relative rounded-xl border border-border bg-card p-5">
      {showDiscoveryBadge && (
        <span className="absolute -top-2 right-4 rounded-[20px] border border-primary/40 bg-background px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-primary">
          30% descoberta
        </span>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span
          className={`grid h-6 w-6 place-items-center rounded-md ${
            item.source === "youtube" ? "bg-[#FF0000]/15 text-[#FF5252]" : "bg-primary/15 text-primary"
          }`}
          aria-label={item.source}
        >
          {item.source === "youtube" ? <YouTubeIcon /> : <RssIcon />}
        </span>
        <span className="font-medium text-foreground">{item.sourceName}</span>
        <span>·</span>
        <span>{item.timestamp}</span>
      </div>

      {item.media?.kind === "thumbnail" && (
        <div className="relative mt-4 overflow-hidden rounded-[12px] border border-border">
          <img
            src={ytThumb}
            alt={item.title}
            width={1280}
            height={720}
            loading="lazy"
            className="aspect-video w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <button
            aria-label="Reproduzir"
            className="absolute inset-0 grid place-items-center"
          >
            <span className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_0_30px_oklch(0.89_0.21_130/0.7)]">
              <Play className="h-6 w-6 translate-x-[1px] fill-current" />
            </span>
          </button>
          {item.media.duration && (
            <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white">
              {item.media.duration}
            </span>
          )}
        </div>
      )}

      <h3 className="mt-3 text-lg font-semibold leading-snug text-foreground">{item.title}</h3>

      <div className="mt-4 rounded-[10px] border border-border bg-background/50 p-4">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-primary">
          lumi. resumo
        </div>
        <ul className="space-y-1.5">
          {item.bullets.map((b, i) => (
            <li key={i} className="flex gap-2 text-sm text-foreground/90">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary shadow-[0_0_10px_oklch(0.89_0.21_130/0.9)]"
              style={{ width: `${item.relevance}%` }}
            />
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">{item.relevance}%</span>
        </div>
        <div className="flex items-center gap-1">
          <FeedbackBtn active={feedback === "up"} onClick={() => onFeedback("up")} label="Útil">
            <ThumbsUp className="h-3.5 w-3.5" />
          </FeedbackBtn>
          <FeedbackBtn active={feedback === "down"} onClick={() => onFeedback("down")} label="Não relevante">
            <ThumbsDown className="h-3.5 w-3.5" />
          </FeedbackBtn>
        </div>
      </div>
    </article>
  );
}

function ReelCard({
  item,
  showDiscoveryBadge,
  feedback,
  onFeedback,
}: {
  item: FeedItem;
  showDiscoveryBadge: boolean;
  feedback?: "up" | "down";
  onFeedback: (v: "up" | "down") => void;
}) {
  return (
    <article className="relative rounded-2xl border border-[oklch(0.92_0.19_95/0.45)] bg-card p-5 shadow-[0_0_35px_-12px_oklch(0.92_0.19_95/0.55)]">
      {showDiscoveryBadge && (
        <span className="absolute -top-2 right-4 rounded-[20px] border border-primary/40 bg-background px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-primary">
          30% descoberta
        </span>
      )}

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-primary/15 text-primary">
            <Rss className="h-3 w-3" />
          </span>
          <span className="font-medium text-foreground">{item.sourceName}</span>
          <span>·</span>
          <span>{item.timestamp}</span>
        </div>
        <span className="rounded-full border border-[oklch(0.92_0.19_95/0.45)] bg-[oklch(0.92_0.19_95/0.08)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[oklch(0.92_0.19_95)]">
          Reel premium
        </span>
      </div>

      <div className="mt-4 flex gap-4">
        {/* Vertical reel player */}
        <div className="relative shrink-0">
          <div className="absolute -inset-[2px] rounded-[20px] bg-gradient-to-b from-[oklch(0.92_0.19_95/0.9)] via-primary/60 to-[oklch(0.92_0.19_95/0.9)] opacity-80 blur-[4px]" />
          <div className="relative overflow-hidden rounded-[18px] border border-[oklch(0.92_0.19_95/0.5)]">
            <img
              src={reelPoster}
              alt={item.title}
              width={576}
              height={1024}
              loading="lazy"
              className="h-[260px] w-[146px] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
            <button
              aria-label="Reproduzir reel"
              className="absolute inset-0 grid place-items-center"
            >
              <span className="grid h-12 w-12 place-items-center rounded-full bg-[oklch(0.92_0.19_95)] text-background shadow-[0_0_24px_oklch(0.92_0.19_95/0.8)]">
                <Play className="h-5 w-5 translate-x-[1px] fill-current" />
              </span>
            </button>
            <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.92_0.19_95)] shadow-[0_0_6px_oklch(0.92_0.19_95)]" />
              Reel
            </div>
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] text-white/90">
              <span className="tabular-nums">{item.media?.duration}</span>
              <Volume2 className="h-3 w-3" />
            </div>
          </div>
        </div>

        {/* Filtered content */}
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-snug text-foreground">
            {item.title}
          </h3>
          <div className="mt-3 rounded-[10px] border border-border bg-background/60 p-3">
            <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-[oklch(0.92_0.19_95)]">
              lumi. resumo
            </div>
            <ul className="space-y-1">
              {item.bullets.map((b, i) => (
                <li key={i} className="flex gap-1.5 text-xs leading-snug text-foreground/90">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[oklch(0.92_0.19_95)]" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary shadow-[0_0_10px_oklch(0.89_0.21_130/0.9)]"
              style={{ width: `${item.relevance}%` }}
            />
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">{item.relevance}%</span>
        </div>
        <div className="flex items-center gap-1">
          <FeedbackBtn active={feedback === "up"} onClick={() => onFeedback("up")} label="Útil">
            <ThumbsUp className="h-3.5 w-3.5" />
          </FeedbackBtn>
          <FeedbackBtn active={feedback === "down"} onClick={() => onFeedback("down")} label="Não relevante">
            <ThumbsDown className="h-3.5 w-3.5" />
          </FeedbackBtn>
        </div>
      </div>
    </article>
  );
}

function FeedbackBtn({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={`grid h-8 w-8 place-items-center rounded-full border text-xs transition ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function YouTubeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.6 3.6 12 3.6 12 3.6s-7.6 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.8.5 9.4.5 9.4.5s7.6 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6z" /></svg>
  );
}
function RssIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a9 9 0 0 1 9 9" /><path d="M4 4a16 16 0 0 1 16 16" /><circle cx="5" cy="19" r="1" /></svg>
  );
}
