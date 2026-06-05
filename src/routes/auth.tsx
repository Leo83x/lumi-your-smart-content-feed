import { createFileRoute, Link } from "@tanstack/react-router";
import { Wordmark } from "@/components/lumi/Wordmark";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [{ title: "Entrar • lumi." }],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    error: typeof s.error === "string" ? s.error : undefined,
  }),
  component: AuthPage,
});

function AuthPage() {
  const { error } = Route.useSearch();
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8 text-center">
        <Wordmark className="text-3xl mx-auto" />
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Entrar no lumi.</h1>
          <p className="text-sm text-muted-foreground">
            Sua secretária de bolso. Conecte com Google para autorizar o YouTube e começar.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">
            Falha no login: {error}
          </div>
        )}

        <a
          href="/api/youtube/oauth/start"
          className="block w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_0_24px_-6px_oklch(0.89_0.21_130/0.6)] transition hover:scale-[1.02] active:scale-[0.98]"
        >
          Entrar com Google
        </a>

        <p className="text-[11px] text-muted-foreground">
          Ao continuar você autoriza o lumi a ler suas inscrições do YouTube. Nada é compartilhado.
        </p>
        <Link to="/" className="block text-xs text-muted-foreground underline">
          Voltar para o início
        </Link>
      </div>
    </div>
  );
}