export type FeedItem = {
  id: string;
  source: "youtube" | "rss" | "instagram";
  sourceName: string;
  timestamp: string;
  title: string;
  bullets: string[];
  relevance: number; // 0-100
  category?: "foco" | "work" | "lazer";
  tags?: string[];
  media?: {
    kind: "thumbnail" | "reel";
    src: string;
    duration?: string;
  };
};

export const MOCK_FEED: FeedItem[] = [
  {
    id: "1",
    source: "youtube",
    sourceName: "Fireship",
    timestamp: "há 2h",
    title: "10 novidades absurdas do React 19 que ninguém te contou",
    bullets: [
      "Server Actions agora rodam edge-first com latência sub-50ms.",
      "Compiler elimina 90% os useMemo manuais em apps reais.",
      "Novo hook use() simplifica fetching com Suspense nativo.",
    ],
    relevance: 94,
    category: "work",
    tags: ["Tecnologia"],
    media: { kind: "thumbnail", src: "__YT_THUMB__", duration: "12:48" },
  },
  {
    id: "2",
    source: "rss",
    sourceName: "Stratechery",
    timestamp: "há 5h",
    title: "The Aggregator Endgame: AI assistants as the new operating system",
    bullets: [
      "Modelos generalistas viram a camada de distribuição padrão.",
      "Apps tradicionais se tornam ferramentas chamadas por agentes.",
      "Monetização migra de atenção para resolução de tarefas.",
    ],
    relevance: 88,
    category: "work",
    tags: ["Tecnologia", "Negócios"],
    media: { kind: "reel", src: "__REEL__", duration: "0:47" },
  },
  {
    id: "3",
    source: "youtube",
    sourceName: "Lex Fridman",
    timestamp: "há 8h",
    title: "Conversa de 3h sobre o futuro do trabalho com IA",
    bullets: [
      "Profissões criativas se tornam mais valiosas, não menos.",
      "Camadas intermediárias do conhecimento desaparecem rápido.",
      "Curiosidade vira a habilidade composta mais importante.",
    ],
    relevance: 76,
    category: "lazer",
    tags: ["Outros"],
  },
  {
    id: "4",
    source: "rss",
    sourceName: "The Verge",
    timestamp: "há 12h",
    title: "Apple anuncia novos óculos de realidade mista mais leves",
    bullets: [
      "Peso reduzido para 280g graças a novo chip M5 Ultra.",
      "Bateria integrada na haste, sem cabo externo.",
      "Preço inicial estimado em US$ 1.499.",
    ],
    relevance: 71,
    category: "work",
    tags: ["Design", "Tecnologia"],
  },
  {
    id: "5",
    source: "youtube",
    sourceName: "Ali Abdaal",
    timestamp: "há 1d",
    title: "Como construir um sistema de foco que realmente funciona",
    bullets: [
      "Time-blocking supera listas de tarefas tradicionais.",
      "Energia importa mais que tempo disponível.",
      "Revisões semanais de 20 min mantêm o sistema vivo.",
    ],
    relevance: 82,
    category: "lazer",
    tags: ["Saúde"],
  },
];
