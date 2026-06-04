import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/lumi/Wordmark";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Configurações · lumi." },
      { name: "description", content: "Edite seu perfil, horários e plano." },
    ],
  }),
  component: Settings,
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
const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex"];

function Settings() {
  const [interests, setInterests] = useState<string[]>([]);
  const [whatsapp, setWhatsapp] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("18:00");
  const [plan] = useState<"free" | "pro">("free");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem("lumi_profile") || "{}");
      if (p.interests) setInterests(p.interests);
      if (p.whatsapp) setWhatsapp(p.whatsapp);
      const s = JSON.parse(localStorage.getItem("lumi_schedule") || "{}");
      if (s.start) setStart(s.start);
      if (s.end) setEnd(s.end);
    } catch {}
  }, []);

  function toggle(v: string) {
    setInterests((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));
  }

  function save() {
    const prev = JSON.parse(localStorage.getItem("lumi_profile") || "{}");
    localStorage.setItem(
      "lumi_profile",
      JSON.stringify({ ...prev, interests, whatsapp }),
    );
    localStorage.setItem("lumi_schedule", JSON.stringify({ start, end }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="min-h-screen bg-background pb-28 text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
          <Link to="/feed" className="text-sm text-muted-foreground hover:text-foreground">
            ← Feed
          </Link>
          <Wordmark className="text-base" />
          <div className="w-12" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-5 pt-8">
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>

        <Section title="Interesses">
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((i) => (
              <button
                key={i}
                onClick={() => toggle(i)}
                className={`rounded-[20px] border px-4 py-2 text-sm transition ${
                  interests.includes(i)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:border-primary/40"
                }`}
              >
                {i}
              </button>
            ))}
          </div>
        </Section>

        <Section
          title="Modo Trabalho"
          subtitle="Horário Seg–Sex em que vamos priorizar conteúdo de Foco."
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1.5">
              {DAYS.map((d) => (
                <span
                  key={d}
                  className="rounded-md border border-border bg-card px-2 py-1 text-xs text-muted-foreground"
                >
                  {d}
                </span>
              ))}
            </div>
            <TimeInput value={start} onChange={setStart} />
            <span className="text-muted-foreground">até</span>
            <TimeInput value={end} onChange={setEnd} />
          </div>
        </Section>

        <Section title="WhatsApp" subtitle="Onde você recebe o digest diário.">
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="+55 11 99999-9999"
            className="w-full rounded-xl border border-border bg-card px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
          />
        </Section>

        <Section title="Plano">
          <div className="grid gap-3 sm:grid-cols-2">
            <PlanCard
              name="Free"
              price="R$ 0"
              features={["20 cards por dia", "1 digest diário", "Suporte por email"]}
              active={plan === "free"}
            />
            <PlanCard
              name="Pro"
              price="R$ 19,90/mês"
              features={["Cards ilimitados", "Múltiplos digests", "Modo Foco avançado"]}
              active={false}
              highlight
            />
          </div>
        </Section>
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-5 py-4">
          <span className="text-xs text-muted-foreground">
            {saved ? "Salvo ✓" : "Mudanças não salvas"}
          </span>
          <button
            onClick={save}
            className="rounded-[20px] bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Salvar
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
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-[10px] border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
    />
  );
}

function PlanCard({
  name,
  price,
  features,
  active,
  highlight,
}: {
  name: string;
  price: string;
  features: string[];
  active: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight ? "border-primary/60 bg-primary/5" : "border-border bg-background"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold">{name}</span>
        {active && (
          <span className="rounded-[20px] bg-primary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary-foreground">
            Atual
          </span>
        )}
      </div>
      <div className="mt-1 text-lg font-bold">{price}</div>
      <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
        {features.map((f) => (
          <li key={f} className="flex gap-2">
            <span className="text-primary">✓</span>
            {f}
          </li>
        ))}
      </ul>
      {!active && (
        <button
          className={`mt-4 w-full rounded-[20px] px-4 py-2 text-sm font-medium ${
            highlight
              ? "bg-primary text-primary-foreground hover:opacity-90"
              : "border border-border text-foreground hover:bg-secondary"
          }`}
        >
          {highlight ? "Fazer upgrade" : "Selecionar"}
        </button>
      )}
    </div>
  );
}
