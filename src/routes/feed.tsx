import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Wordmark } from "@/components/lumi/Wordmark";
import { MOCK_FEED, type FeedItem } from "@/lib/lumi/mockFeed";

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
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
          <Wordmark className="text-xl" />
          <div className="flex items-center gap-2">
            <button
              aria-label="Notificações"
              className="relative grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground"
            >
              <BellIcon />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
            </button>
            <Link
              to="/settings"
              className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground"
              aria-label="Configurações"
            >
              <GearIcon />
            </Link>
          </div>
        </div>

        <div className="mx-auto max-w-2xl px-5 pb-4">
          <div className="inline-flex rounded-[20px] border border-border bg-card p-1">
            <ModeButton active={mode === "foco"} onClick={() => setMode("foco")}>
              Modo Foco
            </ModeButton>
            <ModeButton active={mode === "lazer"} onClick={() => setMode("lazer")}>
              Modo Lazer
            </ModeButton>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-5 pt-6">
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
              className="h-full rounded-full bg-primary"
              style={{ width: `${item.relevance}%` }}
            />
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">{item.relevance}%</span>
        </div>
        <div className="flex items-center gap-1">
          <FeedbackBtn active={feedback === "up"} onClick={() => onFeedback("up")} label="Útil">
            ▲
          </FeedbackBtn>
          <FeedbackBtn active={feedback === "down"} onClick={() => onFeedback("down")} label="Não relevante">
            ▼
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
