import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Wordmark } from "@/components/lumi/Wordmark";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "lumi. — Pare de perder tempo. Receba só o que importa." },
      {
        name: "description",
        content:
          "A Lumi filtra o ruído das redes e entrega o conteúdo certo, na hora certa.",
      },
      { property: "og:title", content: "lumi. — Seu curador pessoal de conteúdo" },
      {
        property: "og:description",
        content: "Feed unificado de YouTube e RSS, filtrado por IA.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    const list = JSON.parse(localStorage.getItem("lumi_waitlist") || "[]");
    list.push({ name, email, created_at: new Date().toISOString() });
    localStorage.setItem("lumi_waitlist", JSON.stringify(list));
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Wordmark className="text-2xl" />
        <Link
          to="/onboarding"
          className="rounded-[20px] border border-border px-4 py-2 text-sm text-foreground hover:bg-secondary"
        >
          Entrar
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 pt-12 pb-24 text-center sm:pt-20">
        <div className="mb-6 inline-flex items-center gap-2 rounded-[20px] border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-primary" />
          beta privado · vagas limitadas
        </div>
        <h1 className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          Pare de perder tempo.
          <br />
          <span className="text-primary">Receba só o que importa.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
          A Lumi filtra o ruído das redes e entrega o conteúdo certo, na hora certa.
        </p>

        {submitted ? (
          <div className="mx-auto mt-10 max-w-md rounded-xl border border-border bg-card p-6">
            <p className="text-foreground">
              Tudo certo, <span className="text-primary">{name.split(" ")[0]}</span>. Você está
              na lista.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Vamos te avisar assim que liberarmos seu acesso.
            </p>
            <Link
              to="/onboarding"
              className="mt-4 inline-block rounded-[20px] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Explorar a prévia
            </Link>
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="mx-auto mt-10 flex max-w-md flex-col gap-3 rounded-xl border border-border bg-card p-4"
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              className="w-full rounded-[10px] bg-secondary px-4 py-3 text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full rounded-[10px] bg-secondary px-4 py-3 text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              className="rounded-[20px] bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:opacity-90"
            >
              Entrar na lista
            </button>
          </form>
        )}

        <section className="mt-20 grid gap-4 text-left sm:grid-cols-3">
          {[
            {
              t: "Feed unificado",
              d: "YouTube, RSS e newsletters em um só lugar. Sem abas, sem algoritmo.",
            },
            {
              t: "Modo Foco e Lazer",
              d: "Conteúdo certo para o momento certo. Trabalho ou descanso.",
            },
            {
              t: "Digest no WhatsApp",
              d: "Um resumo diário com o essencial. Direto onde você já está.",
            },
          ].map((f) => (
            <div
              key={f.t}
              className="rounded-xl border border-border bg-card p-5 transition hover:border-primary/40"
            >
              <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary/15 text-primary">
                ◆
              </div>
              <h3 className="font-semibold">{f.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <Wordmark className="text-base" />
          <span>© {new Date().getFullYear()} lumi. Todos os direitos reservados.</span>
        </div>
      </footer>
    </div>
  );
}
