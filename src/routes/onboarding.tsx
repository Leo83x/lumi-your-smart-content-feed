import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Wordmark } from "@/components/lumi/Wordmark";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Onboarding · lumi." },
      { name: "description", content: "Configure seu perfil em 5 passos." },
    ],
  }),
  component: Onboarding,
});

const INTERESTS = [
  "Tecnologia",
  "Negócios",
  "Esportes",
  "Política",
  "Entretenimento",
  "Saúde",
  "Design",
  "Finanças",
  "Outros",
];
const PLATFORMS = ["YouTube", "Instagram", "X", "LinkedIn", "Newsletters", "Podcasts"];
const TIMES = ["15 min", "30 min", "1 hora", "Sem limite"];

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[20px] border px-4 py-2 text-sm transition ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:border-primary/40"
      }`}
    >
      {label}
    </button>
  );
}

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [dailyLimit, setDailyLimit] = useState<string>("");
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [whatsapp, setWhatsapp] = useState("");

  function toggle(list: string[], setList: (v: string[]) => void, val: string) {
    setList(list.includes(val) ? list.filter((v) => v !== val) : [...list, val]);
  }

  const canNext =
    (step === 1 && name.trim().length > 0) ||
    (step === 2 && interests.length > 0) ||
    (step === 3 && dailyLimit) ||
    (step === 4 && platforms.length > 0) ||
    step === 5;

  function next() {
    if (step < 5) {
      setStep(step + 1);
      return;
    }
    localStorage.setItem(
      "lumi_profile",
      JSON.stringify({ name, interests, dailyLimit, platforms, whatsapp }),
    );
    navigate({ to: "/feed" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-2xl items-center justify-between px-6 py-6">
        <Wordmark className="text-xl" />
        <span className="text-xs text-muted-foreground">passo {step} de 5</span>
      </header>

      <div className="mx-auto max-w-2xl px-6">
        <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
      </div>

      <main className="mx-auto max-w-2xl px-6 pt-12 pb-32">
        {step === 1 && (
          <Section title="Qual seu nome?" subtitle="Vamos personalizar sua experiência.">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu primeiro nome"
              className="w-full rounded-xl border border-border bg-card px-4 py-4 text-lg outline-none focus:ring-2 focus:ring-primary"
            />
          </Section>
        )}

        {step === 2 && (
          <Section
            title="O que você quer acompanhar?"
            subtitle="Selecione quantos quiser."
          >
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((i) => (
                <Chip
                  key={i}
                  label={i}
                  active={interests.includes(i)}
                  onClick={() => toggle(interests, setInterests, i)}
                />
              ))}
            </div>
          </Section>
        )}

        {step === 3 && (
          <Section
            title="Quanto tempo por dia você quer gastar consumindo conteúdo?"
            subtitle="A gente respeita seu limite."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {TIMES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setDailyLimit(t)}
                  className={`rounded-xl border px-4 py-4 text-left transition ${
                    dailyLimit === t
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <span className="block text-lg font-medium">{t}</span>
                </button>
              ))}
            </div>
          </Section>
        )}

        {step === 4 && (
          <Section title="Quais plataformas você usa?" subtitle="Vamos integrar com elas.">
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <Chip
                  key={p}
                  label={p}
                  active={platforms.includes(p)}
                  onClick={() => toggle(platforms, setPlatforms, p)}
                />
              ))}
            </div>
          </Section>
        )}

        {step === 5 && (
          <Section
            title="Seu número do WhatsApp"
            subtitle="Para receber o digest diário. Opcional — pode pular."
          >
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+55 11 99999-9999"
              className="w-full rounded-xl border border-border bg-card px-4 py-4 text-lg outline-none focus:ring-2 focus:ring-primary"
            />
          </Section>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-6 py-4">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="rounded-[20px] border border-border px-4 py-2 text-sm text-muted-foreground disabled:opacity-30"
          >
            Voltar
          </button>
          <button
            onClick={next}
            disabled={!canNext}
            className="rounded-[20px] bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
          >
            {step === 5 ? "Concluir" : "Continuar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-8">{children}</div>
    </div>
  );
}
