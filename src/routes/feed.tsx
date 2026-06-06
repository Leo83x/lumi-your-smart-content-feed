import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Wordmark } from "@/components/lumi/Wordmark";
import { MOCK_FEED, type FeedItem } from "@/lib/lumi/mockFeed";
import { fetchRealFeed, fetchInstagramTimeline, fetchYoutubeTimeline } from "@/lib/api/feed.functions";
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
  VolumeX,
  ThumbsUp,
  ThumbsDown,
  Plus,
  Trash2,
  Copy,
  Check,
  X,
  Bookmark,
  BookOpen,
  CheckCircle2,
  Compass,
  Heart,
  Share2,
  MessageSquare,
  Calendar,
  Mail,
  Send,
  User,
  ArrowRight,
  Instagram
} from "lucide-react";
import { toast, Toaster } from "sonner";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Seu Feed inteligente • lumi." },
      { name: "description", content: "Seu hub personalizado de conteúdo." },
    ],
  }),
  component: FeedPage,
});

function FeedPage() {
  const [mode, setMode] = useState<"work" | "lazer">("work");
  const [activeTab, setActiveTab] = useState<"feed" | "secretaria" | "curadorias" | "conexoes">("feed");
  const [profile, setProfile] = useState<any>({ name: "Usuário", interests: [] });
  const [feedback, setFeedback] = useState<Record<string, "up" | "down">>({});
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [connections, setConnections] = useState<Array<{ id: string; name: string; type: "youtube" | "rss" | "newsletter" | "podcast" | "instagram"; url?: string; addedAt: string }>>([]);
  const [realFeedItems, setRealFeedItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [playingReel, setPlayingReel] = useState<FeedItem | null>(null);

  // WebView Scraper Simulator Modal State
  const [isWebViewOpen, setIsWebViewOpen] = useState(false);
  const [showYtScraper, setShowYtScraper] = useState(false);

  // AI Secretary Action Modals
  const [activeActionModal, setActiveActionModal] = useState<{ item: FeedItem; action: "linkedin" | "calendar" | "email" | "notion" } | null>(null);

  // User Curation Creator State
  const [curationName, setCurationName] = useState("Curadoria Tech do " + (profile.name || "Leandro"));
  const [curationDesc, setCurationDesc] = useState("Meus insights semanais sobre tecnologia, produto e startups.");
  const [curationItems, setCurationItems] = useState<Array<{ id: string; note: string }>>([]);
  const [isCurationPublished, setIsCurationPublished] = useState(false);
  const [viewingPublicPage, setViewingPublicPage] = useState(false);

  // Chat Secretary State
  const [messages, setMessages] = useState<any[]>([
    {
      id: "m1",
      sender: "lumi",
      text: "Olá! Eu sou a Lumi, sua secretária digital de conteúdo. Hoje organizei seu feed, filtrei distrações e preparei um briefing especial. O que posso fazer por você?",
      timestamp: "Agora mesmo"
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Audio Briefing State
  const [isPlayingBriefing, setIsPlayingBriefing] = useState(false);
  const [briefingProgress, setBriefingProgress] = useState(0);
  const [briefingSubtitle, setBriefingSubtitle] = useState("Lumi: Seu resumo executivo em áudio.");
  const briefingInterval = useRef<any>(null);

  // Load profile, connections and user-specific data from localStorage
  useEffect(() => {
    try {
      const p = localStorage.getItem("lumi_profile");
      if (p) setProfile(JSON.parse(p));

      const savedConn = localStorage.getItem("lumi_connections");
      let activeConns = [];
      if (savedConn && !savedConn.includes("Fireship")) {
        activeConns = JSON.parse(savedConn);
        setConnections(activeConns);
      } else {
        const defaults = [
          { id: "c1", name: "Filipe Deschamps", type: "youtube" as const, url: "", addedAt: "Há 1 dia" },
          { id: "c2", name: "Tecnoblog", type: "rss" as const, url: "https://tecnoblog.net/feed/", addedAt: "Há 2 horas" },
          { id: "c3", name: "Brazil Journal", type: "rss" as const, url: "https://braziljournal.com/feed/", addedAt: "Há 4 horas" }
        ];
        setConnections(defaults);
        activeConns = defaults;
        localStorage.setItem("lumi_connections", JSON.stringify(defaults));
      }

      const savedBookmarks = localStorage.getItem("lumi_bookmarks");
      if (savedBookmarks) setBookmarks(JSON.parse(savedBookmarks));

      const savedFeedback = localStorage.getItem("lumi_feedback");
      if (savedFeedback) setFeedback(JSON.parse(savedFeedback));

      // Trigger initial sync of feeds
      syncRealFeed(activeConns);
    } catch (e) {}
  }, []);

  const syncRealFeed = async (activeConns: typeof connections) => {
    setIsSyncing(true);
    try {
      // 1. Fetch main aggregated feeds (RSS/YouTube)
      let items: FeedItem[] = [];
      
      const mainConns = activeConns.filter(c => c.type !== "instagram");
      if (mainConns.length > 0) {
        const result = await fetchRealFeed({
          data: {
            connections: mainConns.map((c) => ({
              id: c.id,
              name: c.name,
              type: c.type === "newsletter" || c.type === "podcast" ? "rss" as const : c.type as any,
              url: c.url
            }))
          }
        });
        if (result && result.items) {
          items = [...result.items];
        }
      }

      // 2. Fetch Instagram timeline real feed if session cookie is saved
      const savedIgCookie = localStorage.getItem("lumi_instagram_sessionid");
      let igSuccess = false;
      if (savedIgCookie && activeConns.some(c => c.type === "instagram")) {
        try {
          const igResult = await fetchInstagramTimeline({
            data: { sessionId: savedIgCookie }
          });
          if (igResult && igResult.items && igResult.items.length > 0) {
            items = [...igResult.items, ...items];
            igSuccess = true;
          } else if (igResult && igResult.error) {
            console.warn("Erro ao raspar Instagram: " + igResult.error);
          }
        } catch (igError) {
          console.error("Instagram Scraper failed:", igError);
        }
      }

      // Fallback simulated instagram posts if real fetch didn't run or failed
      if (!igSuccess) {
        const igConns = activeConns.filter(c => c.type === "instagram");
        igConns.forEach((conn) => {
          items.unshift({
            id: conn.id + "_sim_insta_" + Date.now(),
            source: "instagram" as const,
            sourceName: conn.name.startsWith("@") ? conn.name : "@" + conn.name,
            timestamp: "Sincronizado (Simulador)",
            title: "Insights do feed de " + conn.name + " no Instagram",
            bullets: [
              "Resumo automático das postagens do perfil de " + conn.name + ".",
              "A secretária filtrou 3 fotos pessoais de pratos e stories cotidianos.",
              "Destaque: Compartilhamento de opinião sobre novas tendências de mercado."
            ],
            relevance: 88,
            tags: ["Negócios", "Design"],
            category: "work" as const,
            media: { kind: "reel" as const, src: "", duration: "0:30" }
          });
        });
      }

            // 2.5 Fetch YouTube timeline real feed if session cookie is saved
      const savedYtCookie = localStorage.getItem("lumi_youtube_sessionid");
      let ytSuccess = false;
      if (savedYtCookie && activeConns.some(c => c.type === "youtube")) {
        try {
          const ytResult = await fetchYoutubeTimeline({
            data: { sessionId: savedYtCookie }
          });
          if (ytResult && ytResult.items && ytResult.items.length > 0) {
            items = [...ytResult.items, ...items];
            ytSuccess = true;
          } else if (ytResult && ytResult.error) {
            console.warn("Erro ao raspar YouTube: " + ytResult.error);
          }
        } catch (ytError) {
          console.error("YouTube Scraper failed:", ytError);
        }
      }

      // 3. Fallback simulated YouTube posts if YT channel has no items
      const ytConns = activeConns.filter(c => c.type === "youtube");
      ytConns.forEach((conn) => {
        const hasItems = items.some(item => item.source === "youtube");
        if (!hasItems && !ytSuccess) {
          items.push({
            id: conn.id + "_sim_yt_" + Date.now(),
            source: "youtube" as const,
            sourceName: conn.name.startsWith("@") ? conn.name : "@" + conn.name,
            timestamp: "há 2h (Simulado)",
            title: "Como escalar produtos digitais usando IA e automação",
            bullets: [
              "Resumo do último vídeo publicado no canal " + conn.name + ".",
              "Pontos-chave: Simplificação de fluxos de trabalho e foco em experiência do usuário.",
              "Relevância alta para a sua jornada profissional e modo Work."
            ],
            relevance: 92,
            tags: ["Tecnologia", "Negócios"],
            category: "work" as const,
            media: {
              kind: "thumbnail" as const,
              src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80",
              duration: "12:45"
            }
          });
        }
      });

      setRealFeedItems(items);
    } catch (e) {
      console.error("Error syncing real feed:", e);
      toast.error("Erro ao sincronizar feeds reais. Exibindo simulados.");
    } finally {
      setIsSyncing(false);
    }
  };

  const sendChatMessage = async (msg: string) => {
    const userMsg = { id: "u_" + Date.now(), sender: "user", text: msg, timestamp: "Agora" };
    setMessages((prev: any[]) => [...prev, userMsg]);
    setIsTyping(true);
    setTimeout(() => {
      const lumiReply = {
        id: "lumi_" + Date.now(),
        sender: "lumi",
        text: "Entendido! Estou analisando seu pedido: \"" + msg.substring(0, 60) + "\". Processando em segundo plano.",
        timestamp: "Agora"
      };
      setMessages((prev: any[]) => [...prev, lumiReply]);
      setIsTyping(false);
    }, 1500);
  };

    const handleFeedback = (id: string, type: "up" | "down") => {
    const nextFeedback = { ...feedback, [id]: feedback[id] === type ? (undefined as any) : type };
    setFeedback(nextFeedback);
    localStorage.setItem("lumi_feedback", JSON.stringify(nextFeedback));
    toast.success(nextFeedback[id] ? "Obrigado pelo seu feedback!" : "Feedback removido.");
  };

  const toggleBookmark = (id: string) => {
    const nextBookmarks = bookmarks.includes(id) 
      ? bookmarks.filter(b => b !== id) 
      : [...bookmarks, id];
    setBookmarks(nextBookmarks);
    localStorage.setItem("lumi_bookmarks", JSON.stringify(nextBookmarks));
    toast.success(bookmarks.includes(id) ? "Removido dos salvos." : "Salvo para ler depois!");
  };

  const handleAddConnection = (name: string, type: string, customUrl?: string) => {
    if (!name.trim()) return;
    const isUrl = name.startsWith("http://") || name.startsWith("https://");
    
    let url = customUrl;
    if (type === "rss" && !url) {
      url = isUrl ? name.trim() : "https://" + name.trim();
    } else if (type === "newsletter") {
      url = "https://manualdousuario.net/feed/"; 
    } else if (type === "podcast") {
      url = "https://anchor.fm/s/16c9053c/podcast/rss";
    }

    const newConn = {
      id: "c_" + Date.now(),
      name: type === "youtube" || type === "instagram" ? name.trim() : (isUrl ? new URL(name).hostname : name.trim()),
      type: type as "youtube" | "rss" | "instagram" | "newsletter" | "podcast",
      url,
      addedAt: "Agora mesmo"
    };
    
    const nextConnections = [newConn, ...connections];
    setConnections(nextConnections);
    localStorage.setItem("lumi_connections", JSON.stringify(nextConnections));

    toast.success("Conexão \"" + newConn.name + "\" criada com sucesso!");
    syncRealFeed(nextConnections);
  };

  const handleDeleteConnection = (id: string, name: string) => {
    const nextConnections = connections.filter(c => c.id !== id);
    setConnections(nextConnections);
    localStorage.setItem("lumi_connections", JSON.stringify(nextConnections));

    toast.success("Conexão \"" + name + "\" removida.");
    syncRealFeed(nextConnections);
  };

  const handleModeChange = (newMode: "work" | "lazer") => {
    if (mode === newMode) return;
    setIsLoading(true);
    setMode(newMode);
    setTimeout(() => setIsLoading(false), 500);
  };

  const handleTabChange = (tab: typeof activeTab) => {
    if (activeTab === tab) return;
    setIsLoading(true);
    setActiveTab(tab);
    setTimeout(() => setIsLoading(false), 450);
  };

  // Audio briefing progress simulation
  useEffect(() => {
    if (isPlayingBriefing) {
      briefingInterval.current = setInterval(() => {
        setBriefingProgress((prev) => {
          const next = prev + 0.8;
          if (next >= 100) {
            setIsPlayingBriefing(false);
            setBriefingSubtitle("Lumi: Briefing diário concluído.");
            return 100;
          }
          if (next < 25) {
            setBriefingSubtitle("Lumi: Bom dia, " + (profile.name || "Leandro") + "! Hoje preparei seu resumo de tecnologia.");
          } else if (next < 55) {
            setBriefingSubtitle("Lumi: O Tecnoblog destacou discussões de novos compiladores e inteligência artificial.");
          } else if (next < 85) {
            setBriefingSubtitle("Lumi: No Brazil Journal, startups captaram mais de 500 milhões para atendimento por voz.");
          } else {
            setBriefingSubtitle("Lumi: Priorizei 3 leituras rápidas para você economizar tempo hoje. Bom trabalho!");
          }
          return next;
        });
      }, 150);
    } else {
      clearInterval(briefingInterval.current);
    }
    return () => clearInterval(briefingInterval.current);
  }, [isPlayingBriefing, profile]);

  const toggleBriefing = () => {
    if (briefingProgress >= 100) {
      setBriefingProgress(0);
    }
    setIsPlayingBriefing(!isPlayingBriefing);
  };

  // Compile and filter feed items
  const allFeedItems = realFeedItems.length > 0 ? realFeedItems : MOCK_FEED;
  const modeFiltered = allFeedItems.filter(item => {
    // "work" maps to old "foco" category for backwards compatibility
    if (mode === "work") return item.category === "foco" || item.category === "work" || !item.category;
    return item.category === mode || !item.category;
  });
  
  // Apply interest relevance boost and sorting
  const finalFeedItems = modeFiltered.map(item => {
    const hasInterest = (item.tags ?? []).some((tag: string) => 
      profile.interests?.some((ui: string) => ui.toLowerCase() === tag.toLowerCase())
    );
    return {
      ...item,
      relevance: hasInterest ? Math.min(100, item.relevance + 6) : item.relevance,
      hasInterest
    };
  }).sort((a, b) => b.relevance - a.relevance);

  if (viewingPublicPage) {
    return (
      <PublicCurationPage 
        name={curationName} 
        desc={curationDesc} 
        items={curationItems} 
        allFeedItems={allFeedItems}
        profile={profile}
        onClose={() => setViewingPublicPage(false)} 
      />
    );
  }

  return (
    <div className="relative min-h-screen bg-background pb-28 text-foreground overflow-x-hidden">
      <Toaster theme="dark" position="bottom-right" richColors />
      
      {/* Background Neon Glowing Auras */}
      <div className="fixed -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-primary/8 blur-[130px] pointer-events-none z-0" />
      <div className="fixed -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-[oklch(0.92_0.19_95/0.04)] blur-[130px] pointer-events-none z-0" />

      <header className="sticky top-0 z-20 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
          <Wordmark className="text-xl" />
          <div className="flex items-center gap-2">
            {isSyncing && (
              <span className="text-[9px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full animate-pulse mr-1">
                Sincronizando...
              </span>
            )}
            <button
              aria-label="Notificações"
              onClick={() => toast.info("Você não tem novas notificações.")}
              className="relative grid h-9 w-9 place-items-center rounded-full border border-primary/30 bg-card text-foreground shadow-[0_0_18px_-4px_oklch(0.89_0.21_130/0.4)] transition hover:border-primary/60 hover:scale-105 active:scale-95"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_oklch(0.89_0.21_130/0.9)]" />
            </button>
            <Link
              to="/settings"
              aria-label="Configurações"
              className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-primary/40 hover:text-foreground hover:scale-105 active:scale-95"
            >
              <SettingsIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {activeTab === "feed" && (
          <div className="mx-auto max-w-2xl px-5 pb-3">
            <div className="inline-flex rounded-[20px] border border-border/80 bg-card p-1 shadow-[0_0_20px_-10px_oklch(0.89_0.21_130/0.4)]">
              <ModeButton active={mode === "work"} onClick={() => handleModeChange("work")}>
                💼 Modo Work
              </ModeButton>
              <ModeButton active={mode === "lazer"} onClick={() => handleModeChange("lazer")}>
                🌴 Modo Lazer
              </ModeButton>
            </div>
          </div>
        )}
      </header>

      <main className="relative z-10 mx-auto max-w-2xl px-5 pt-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-xs text-muted-foreground animate-pulse">Lumi curando seu feed inteligente...</p>
          </div>
        ) : (
          <>
            {activeTab === "feed" && (
              <div className="space-y-4">
                {/* Audio Briefing Widget */}
                <AudioBriefingPlayer 
                  isPlaying={isPlayingBriefing} 
                  progress={briefingProgress} 
                  subtitle={briefingSubtitle} 
                  onToggle={toggleBriefing} 
                />

                <InsightsStrip items={finalFeedItems} profile={profile} mode={mode} />

                {finalFeedItems.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-card/25 p-8">
                    <Sparkles className="mx-auto h-8 w-8 text-primary/40 mb-3 animate-pulse" />
                    <h3 className="font-semibold text-lg">Feed vazio</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                      Não encontramos itens para o modo {mode === "work" ? "Work" : "Lazer"}. Tente mudar seus interesses no chat com a Lumi ou adicionar Conexões.
                    </p>
                  </div>
                ) : (
                  finalFeedItems.map((item, idx) => (
                    <FeedCard
                      key={item.id}
                      item={item}
                      showDiscoveryBadge={(idx + 1) % 3 === 0}
                      feedback={feedback[item.id]}
                      isBookmarked={bookmarks.includes(item.id)}
                      onFeedback={(v) => handleFeedback(item.id, v)}
                      onBookmark={() => toggleBookmark(item.id)}
                      onPlayReel={() => setPlayingReel(item)}
                      onOpenAction={(action) => setActiveActionModal({ item, action })}
                    />
                  ))
                )}
                <p className="pt-8 text-center text-xs text-muted-foreground">
                  Você chegou ao fim do seu feed de hoje. ✨
                </p>
              </div>
            )}

            {activeTab === "secretaria" && (
              <SecretariaTab 
                messages={messages} 
                isTyping={isTyping} 
                chatInput={chatInput} 
                setChatInput={setChatInput} 
                onSendMessage={sendChatMessage} 
                profile={profile}
              />
            )}

            {activeTab === "curadorias" && (
              <CuradoriasTab 
                bookmarks={bookmarks} 
                allFeedItems={allFeedItems}
                profile={profile}
                onFeedback={handleFeedback}
                feedback={feedback}
                onBookmark={toggleBookmark}
                onPlayReel={setPlayingReel}
                curationName={curationName}
                setCurationName={setCurationName}
                curationDesc={curationDesc}
                setCurationDesc={setCurationDesc}
                curationItems={curationItems}
                setCurationItems={setCurationItems}
                isCurationPublished={isCurationPublished}
                setIsCurationPublished={setIsCurationPublished}
                onPreviewPublic={() => setViewingPublicPage(true)}
              />
            )}

            {activeTab === "conexoes" && (
              <ConexoesTab 
                connections={connections} 
                onAdd={handleAddConnection} 
                onDelete={handleDeleteConnection} 
                isSyncing={isSyncing}
                onOpenWebViewScraper={() => setIsWebViewOpen(true)}
                onOpenYtScraper={() => setShowYtScraper(true)}
                syncRealFeed={syncRealFeed}
              />
            )}
          </>
        )}
      </main>

      {/* Footer Navigation Bar */}
      <GlobalNav activeTab={activeTab} onTabChange={(tab: string) => handleTabChange(tab as any)} />

      {/* Reel Player Modal Overlay */}
      {playingReel && (
        <ReelPlayerModal item={playingReel} onClose={() => setPlayingReel(null)} />
      )}

      {/* AI Secretary Actions Modal */}
      {activeActionModal && (
        <ActionModal 
          item={activeActionModal.item} 
          action={activeActionModal.action} 
          onClose={() => setActiveActionModal(null)} 
          profile={profile}
        />
      )}

      {/* WebView Scraper Simulator Modal */}
      {showYtScraper && (<YoutubeScraperModal onClose={() => setShowYtScraper(false)} onSuccess={(conn: any) => { setConnections((p: any[]) => [conn, ...p]); setShowYtScraper(false); }} />)}
      {isWebViewOpen && (
        <WebViewScraperModal 
          onClose={() => setIsWebViewOpen(null as any)} 
          onSuccess={(mockedConn: any) => {
            const nextConnections = [mockedConn, ...connections];
            setConnections(nextConnections);
            localStorage.setItem("lumi_connections", JSON.stringify(nextConnections));
            syncRealFeed(nextConnections);
            setIsWebViewOpen(false);
          }}
        />
      )}
    </div>
  );
}

function ReelPlayerModal({ item, onClose }: { item: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
      <div className="relative overflow-hidden w-full max-w-[420px] rounded-[24px] border border-white/10 bg-[#090d10] p-6 text-center">
        <h3 className="text-lg font-bold text-white mb-2">{item.title || "Análise do Conteúdo"}</h3>
        <p className="text-xs text-white/70 mb-6">{item.bullets?.[0] || "Nenhuma análise disponível."}</p>
        <button onClick={onClose} className="bg-primary text-primary-foreground px-6 py-2 rounded-xl font-bold">Fechar</button>
      </div>
    </div>
  );
}

function ActionModal({ item, action, onClose, profile }: { item: any; action: string; onClose: () => void; profile: any }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
      <div className="relative overflow-hidden w-full max-w-[420px] rounded-[24px] border border-white/10 bg-[#090d10] p-6 text-center">
        <h3 className="text-lg font-bold text-white mb-2">Ação: {action}</h3>
        <p className="text-xs text-white/70 mb-6">Executando para: {item?.title}</p>
        <button onClick={onClose} className="bg-primary text-primary-foreground px-6 py-2 rounded-xl font-bold">Concluir</button>
      </div>
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
      className={"rounded-[16px] px-4 py-2 text-xs font-semibold tracking-wide transition-all " + (
        active
          ? "bg-primary text-primary-foreground shadow-[0_0_12px_oklch(0.89_0.21_130/0.4)] scale-100"
          : "text-muted-foreground hover:text-foreground hover:bg-card/45 scale-95"
      )}
    >
      {children}
    </button>
  );
}

function InsightsStrip({ items, profile, mode }: { items: any[]; profile: any; mode: string }) {
  const timeSaved = items.length * 3.5;
  const sourceCount = new Set(items.map(i => i.sourceName)).size;
  const userInterests = profile.interests || [];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[oklch(0.92_0.19_95/0.25)] bg-gradient-to-br from-[oklch(0.92_0.19_95/0.05)] via-card/70 to-card p-5 shadow-[0_0_30px_-12px_oklch(0.92_0.19_95/0.4)] backdrop-blur">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[oklch(0.92_0.19_95/0.12)] blur-3xl" />
      <div className="relative">
        <div className="flex items-center gap-2">
          <Sparkles
            className="h-4 w-4 text-[oklch(0.92_0.19_95)] drop-shadow-[0_0_6px_oklch(0.92_0.19_95/0.8)]"
            strokeWidth={2.4}
          />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[oklch(0.92_0.19_95)]">
            Lumi Insights
          </span>
        </div>
        <p className="mt-2.5 text-sm leading-relaxed text-foreground/95">
          {userInterests.length > 0 ? (
            "Olá, " + profile.name + ". Focamos em seus temas dominantes: " + userInterests.slice(0, 3).join(", ").toLowerCase() + "."
          ) : (
            "Olá! Personalize seus temas de interesse nas Configurações para calibrar sua Inteligência Artificial."
          )}
          {" "}A Lumi priorizou {items.length} leituras e filtrou {mode === "work" ? 14 : 8} distrações hoje.
        </p>
        <div className="mt-3.5 flex flex-wrap gap-2 text-[10px]">
          <span className="rounded-full border border-[oklch(0.92_0.19_95/0.3)] bg-[oklch(0.92_0.19_95/0.05)] px-2.5 py-0.5 font-medium text-[oklch(0.92_0.19_95)]">
            ⏳ ~{Math.round(timeSaved)} min economizados
          </span>
          <span className="rounded-full border border-border bg-card px-2.5 py-0.5 text-muted-foreground">
            ⚡ {sourceCount} canais sincronizados
          </span>
        </div>
      </div>
    </section>
  );
}

// Audio Briefing Component with Canvas Waveform animation
function AudioBriefingPlayer({ 
  isPlaying, 
  progress, 
  subtitle, 
  onToggle 
}: { 
  isPlaying: boolean; 
  progress: number; 
  subtitle: string; 
  onToggle: () => void 
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 250;
      canvas.height = 40;
    };
    resize();

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(228, 255, 26, 0.4)";
      const barWidth = 3;
      const barGap = 3;
      const bars = Math.floor(canvas.width / (barWidth + barGap));
      
      for (let i = 0; i < bars; i++) {
        let barHeight = 2;
        if (isPlaying) {
          barHeight = Math.sin(Date.now() * 0.005 + i * 0.3) * 12 + 15;
          barHeight = Math.max(3, barHeight + Math.random() * 6);
        } else {
          barHeight = Math.sin(i * 0.2) * 4 + 6;
        }
        const x = i * (barWidth + barGap);
        const y = (canvas.height - barHeight) / 2;
        ctx.fillRect(x, y, barWidth, barHeight);
      }
      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [isPlaying]);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-card to-card p-4 shadow-md flex items-center justify-between gap-4">
      <button 
        onClick={onToggle}
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_0_15px_oklch(0.89_0.21_130/0.5)] hover:scale-105 active:scale-95 transition-all"
        aria-label={isPlaying ? "Pausar Briefing" : "Tocar Briefing"}
      >
        {isPlaying ? (
          <span className="flex gap-1 items-center justify-center">
            <span className="h-4 w-1 bg-current animate-pulse" />
            <span className="h-4 w-1 bg-current animate-pulse delay-75" />
          </span>
        ) : (
          <Play className="h-5 w-5 translate-x-[1px] fill-current" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold mb-1">
          <span className="uppercase tracking-wider">🎧 Briefing Diário em Áudio</span>
          <span className="tabular-nums font-mono">{Math.floor(progress / 100 * 150)}s / 150s</span>
        </div>
        <canvas ref={canvasRef} className="w-full h-8 opacity-75" />
        <p className="text-[11px] text-foreground/90 font-medium italic truncate mt-1 animate-pulse">
          {subtitle}
        </p>
      </div>
    </section>
  );
}

function FeedCard({
  item,
  showDiscoveryBadge,
  feedback,
  isBookmarked,
  onFeedback,
  onBookmark,
  onPlayReel,
  onOpenAction,
}: {
  item: FeedItem & { hasInterest?: boolean };
  showDiscoveryBadge: boolean;
  feedback?: "up" | "down";
  isBookmarked: boolean;
  onFeedback: (v: "up" | "down") => void;
  onBookmark: () => void;
  onPlayReel: () => void;
  onOpenAction: (action: "linkedin" | "calendar" | "email" | "notion") => void;
}) {
  const relevanceColor = 
    item.relevance >= 85 
      ? "bg-primary shadow-[0_0_10px_oklch(0.89_0.21_130/0.9)]" 
      : item.relevance >= 75 
        ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" 
        : "bg-muted-foreground";

  const imageSrc = item.media?.src && !item.media.src.startsWith("__") ? item.media.src : (item.media?.kind === "reel" ? reelPoster : ytThumb);

  return (
    <article 
      className={"relative rounded-xl border bg-card/60 p-5 transition-all duration-300 hover:border-border/90 hover:-translate-y-[2px] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-sm " + (
        item.hasInterest ? "border-primary/40 bg-gradient-to-br from-primary/5 via-card/70 to-card " : "border-border/60 "
      ) + (item.media?.kind === "reel" ? "border-[oklch(0.92_0.19_95/0.3)] shadow-[0_0_25px_-12px_oklch(0.92_0.19_95/0.35)] hover:border-[oklch(0.92_0.19_95/0.6)]" : "")}
    >
      {showDiscoveryBadge && (
        <span className="absolute -top-2 right-4 rounded-[20px] border border-primary/40 bg-background px-3 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">
          Descoberta
        </span>
      )}
      
      {item.hasInterest && !showDiscoveryBadge && (
        <span className="absolute -top-2 right-4 rounded-[20px] border border-primary/50 bg-background px-3 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary flex items-center gap-1">
          <Sparkles className="h-2.5 w-2.5" /> Relevante
        </span>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span
            className={"grid h-6 w-6 place-items-center rounded-md " + (
              item.source === "youtube" ? "bg-[#FF0000]/15 text-[#FF5252]" : 
              item.source === "instagram" ? "bg-[#E1306C]/15 text-[#E1306C]" :
              (item.source as string) === "podcast" ? "bg-purple-500/15 text-purple-400" :
              (item.source as string) === "newsletter" ? "bg-amber-500/15 text-amber-400" : "bg-primary/15 text-primary"
            )}
            aria-label={item.source}
          >
            {item.source === "youtube" ? <YouTubeIcon /> : 
             item.source === "instagram" ? <Instagram className="h-3.5 w-3.5" /> :
             (item.source as string) === "podcast" ? <BookOpen className="h-3 w-3" /> :
             (item.source as string) === "newsletter" ? <Mail className="h-3 w-3" /> : <RssIcon />}
          </span>
          <span className="font-semibold text-foreground">{item.sourceName}</span>
          <span>•</span>
          <span>{item.timestamp}</span>
        </div>
        
        {item.media?.kind === "reel" && (
          <span className="rounded-full border border-[oklch(0.92_0.19_95/0.4)] bg-[oklch(0.92_0.19_95/0.08)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[oklch(0.92_0.19_95)]">
            Lumi Reel
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-col md:flex-row gap-4">
        {item.media?.kind === "thumbnail" && (
          <div className="relative md:w-44 overflow-hidden rounded-[12px] border border-border/80 group shrink-0">
            <img
              src={imageSrc}
              alt={item.title}
              width={320}
              height={180}
              loading="lazy"
              className="aspect-video w-full object-cover transition duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
            <button
              aria-label="Reproduzir"
              className="absolute inset-0 grid place-items-center opacity-90 hover:opacity-100"
            >
              <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_0_20px_oklch(0.89_0.21_130/0.7)] transition group-hover:scale-110">
                <Play className="h-4.5 w-4.5 translate-x-[1px] fill-current" />
              </span>
            </button>
            {item.media?.duration && (
              <span className="absolute bottom-1.5 right-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-medium text-white">
                {item.media?.duration}
              </span>
            )}
          </div>
        )}

        {item.media?.kind === "reel" && (
          <div className="relative shrink-0 md:w-36 flex justify-center">
            <div className="absolute -inset-[2px] rounded-[20px] bg-gradient-to-b from-[oklch(0.92_0.19_95/0.8)] via-primary/50 to-[oklch(0.92_0.19_95/0.8)] opacity-60 blur-[3px]" />
            <div className="relative overflow-hidden rounded-[18px] border border-[oklch(0.92_0.19_95/0.4)] shadow-lg aspect-[9/16] h-[210px] w-[118px] shrink-0">
              <img
                src={imageSrc}
                alt={item.title}
                loading="lazy"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30" />
              <button
                onClick={onPlayReel}
                aria-label="Reproduzir reel"
                className="absolute inset-0 grid place-items-center"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[oklch(0.92_0.19_95)] text-background shadow-[0_0_20px_oklch(0.92_0.19_95/0.8)] transition hover:scale-110">
                  <Play className="h-4.5 w-4.5 translate-x-[1px] fill-current" />
                </span>
              </button>
              <div className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-white backdrop-blur">
                <span className="h-1 w-1 rounded-full bg-[oklch(0.92_0.19_95)]" />
                Reel
              </div>
              {item.media?.duration && (
                <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-[8px] text-white/95">
                  <span className="tabular-nums font-medium">{item.media?.duration}</span>
                  <Volume2 className="h-2.5 w-2.5" />
                </div>
              )}
            </div>
          </div>
        )}

        {(item.media?.kind as string) === "audio" && (
          <div className="relative shrink-0 md:w-36 flex flex-col items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 shadow-md aspect-video md:aspect-[9/16] md:h-[210px] w-full md:w-[118px]">
            <span className="h-10 w-10 grid place-items-center rounded-full bg-purple-500/20 text-purple-400 mb-2 border border-purple-500/30">
              <Volume2 className="h-5 w-5" />
            </span>
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Podcast</span>
            {item.media?.duration && (
              <span className="text-[9px] text-muted-foreground mt-1 tabular-nums">{item.media?.duration}</span>
            )}
          </div>
        )}

        {(item.media?.kind as string) === "document" && (
          <div className="relative shrink-0 md:w-36 flex flex-col items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 shadow-md aspect-video md:aspect-[9/16] md:h-[210px] w-full md:w-[118px]">
            <span className="h-10 w-10 grid place-items-center rounded-full bg-amber-500/20 text-amber-400 mb-2 border border-amber-500/30">
              <Library className="h-5 w-5" />
            </span>
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider text-center">Newsletter</span>
            {item.media?.duration && (
              <span className="text-[9px] text-muted-foreground mt-1 tabular-nums">{item.media?.duration}</span>
            )}
          </div>
        )}

        {/* Bullet summarized points */}
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-snug text-foreground hover:text-primary transition duration-200">
            {item.title}
          </h3>
          <div className="mt-3 rounded-[10px] border border-border/50 bg-background/30 p-3.5 backdrop-blur-sm">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[oklch(0.89_0.21_130)]">
                Lumi Resumo
              </span>
              <div className="flex items-center gap-1">
                {item.tags?.map(t => (
                  <span key={t} className="text-[9px] bg-secondary/80 text-muted-foreground rounded-full px-2 py-0.5">
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <ul className="space-y-1.5">
              {item.bullets.map((b, i) => (
                <li key={i} className="flex gap-2 text-xs leading-relaxed text-foreground/90">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[oklch(0.89_0.21_130)]" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* AI Secretary Task Action Buttons */}
      <div className="mt-3.5 pt-3 border-t border-border/30 flex flex-wrap gap-2 items-center">
        <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mr-1">Ações da Secretária:</span>
        <button 
          onClick={() => onOpenAction("linkedin")}
          className="text-[10px] font-semibold bg-primary/10 border border-primary/20 hover:border-primary/50 text-foreground rounded-full px-2.5 py-1 transition active:scale-95 flex items-center gap-1"
        >
          💼 LinkedIn Post
        </button>
        <button 
          onClick={() => onOpenAction("calendar")}
          className="text-[10px] font-semibold bg-purple-500/10 border border-purple-500/20 hover:border-purple-500/50 text-foreground rounded-full px-2.5 py-1 transition active:scale-95 flex items-center gap-1"
        >
          📅 Agendar
        </button>
        <button 
          onClick={() => onOpenAction("email")}
          className="text-[10px] font-semibold bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/50 text-foreground rounded-full px-2.5 py-1 transition active:scale-95 flex items-center gap-1"
        >
          📧 Enviar p/ Equipe
        </button>
        <button 
          onClick={() => onOpenAction("notion")}
          className="text-[10px] font-semibold bg-secondary hover:border-border text-muted-foreground hover:text-foreground border border-border/40 rounded-full px-2.5 py-1 transition active:scale-95 flex items-center gap-1"
        >
          📓 Salvar no Notion
        </button>
      </div>

      {/* Card Actions Footer */}
      <div className="mt-3 flex items-center justify-between gap-4 pt-2 border-t border-border/10">
        <div className="flex flex-1 items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-secondary">
            <div
              className={"h-full rounded-full transition-all duration-500 " + relevanceColor}
              style={{ width: item.relevance + "%" }}
            />
          </div>
          <span className="text-xs font-semibold tabular-nums text-muted-foreground">{item.relevance}%</span>
        </div>
        
        <div className="flex items-center gap-1.5">
          <FeedbackBtn active={feedback === "up"} onClick={() => onFeedback("up")} label="Útil">
            <ThumbsUp className="h-3.5 w-3.5" />
          </FeedbackBtn>
          <FeedbackBtn active={feedback === "down"} onClick={() => onFeedback("down")} label="Não relevante">
            <ThumbsDown className="h-3.5 w-3.5" />
          </FeedbackBtn>
          <div className="w-[1px] h-4 bg-border/50 mx-1" />
          <FeedbackBtn active={isBookmarked} onClick={onBookmark} label="Salvar para depois">
            <Bookmark className={"h-3.5 w-3.5 " + (isBookmarked ? "fill-current" : "")} />
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
      className={"grid h-8 w-8 place-items-center rounded-full border text-xs transition duration-200 hover:scale-105 active:scale-95 " + (
        active
          ? "border-primary bg-primary text-primary-foreground shadow-[0_0_10px_oklch(0.89_0.21_130/0.3)]"
          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

/* SUB-COMPONENTS FOR DIFFERENT TABS */

function SecretariaTab({
  messages,
  isTyping,
  chatInput,
  setChatInput,
  onSendMessage,
  profile
}: {
  messages: any[];
  isTyping: boolean;
  chatInput: string;
  setChatInput: (v: string) => void;
  onSendMessage: (v: string) => void;
  profile: any;
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(chatInput);
  };

  const suggestions = [
    "Focar em inteligência artificial esta semana",
    "Exibir relatório de produtividade de hoje",
    "Enviar resumo de hoje por e-mail",
    "Quero economizar mais tempo de leitura"
  ];

  return (
    <div className="flex flex-col gap-4 min-h-[72vh] relative">
      {/* Secretary Calibration Status Board */}
      <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex flex-col gap-2.5 backdrop-blur shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
          <Sparkles className="h-4 w-4" /> Lumi Monitor de Calibração
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg bg-card/60 p-2.5 border border-border/50">
            <span className="text-muted-foreground block text-[9px] uppercase font-semibold">Tema de Foco Principal</span>
            <span className="font-bold text-foreground mt-0.5 block truncate">
              {profile.interests?.slice(0, 2).join(", ") || "Sem limites (Padrão)"}
            </span>
          </div>
          <div className="rounded-lg bg-card/60 p-2.5 border border-border/50">
            <span className="text-muted-foreground block text-[9px] uppercase font-semibold">Filtro de Ruído</span>
            <span className="font-bold text-foreground mt-0.5 block">Ativo (14 bloqueados hoje)</span>
          </div>
        </div>
      </section>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto rounded-2xl border border-border bg-card/25 p-4 min-h-[350px] max-h-[440px] flex flex-col gap-3.5 scrollbar-thin">
        {messages.map((m) => (
          <div 
            key={m.id} 
            className={"flex flex-col max-w-[85%] " + (
              m.sender === "user" ? "self-end items-end" : "self-start items-start"
            )}
          >
            <span className="text-[9px] text-muted-foreground mb-1 uppercase tracking-wide px-1">
              {m.sender === "lumi" ? "Lumi Assistant" : profile.name || "Você"}
            </span>
            <div 
              className={"rounded-2xl p-3 text-xs leading-relaxed " + (
                m.sender === "user" 
                  ? "bg-primary text-primary-foreground rounded-tr-none shadow-md font-medium" 
                  : "bg-card border border-border rounded-tl-none text-foreground/95"
              )}
            >
              {m.text}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="self-start flex flex-col items-start max-w-[85%] animate-pulse">
            <span className="text-[9px] text-muted-foreground mb-1 uppercase tracking-wide px-1">Lumi Assistant</span>
            <div className="rounded-2xl rounded-tl-none p-3 bg-card border border-border flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 bg-muted-foreground rounded-full animate-bounce" />
              <span className="h-1.5 w-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="h-1.5 w-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chips Suggestion Panel */}
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onSendMessage(s)}
            className="text-[10px] font-semibold border border-border/60 bg-card hover:border-primary/50 text-muted-foreground hover:text-foreground rounded-full px-3 py-1.5 transition active:scale-95"
          >
            💬 {s}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="flex gap-2 items-center">
        <input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Escreva uma instrução para sua secretária..."
          className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        />
        <button
          type="submit"
          disabled={!chatInput.trim()}
          className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-md hover:opacity-90 active:scale-95 disabled:opacity-40 transition"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

function CuradoriasTab({ 
  bookmarks, 
  allFeedItems, 
  profile,
  onFeedback,
  feedback,
  onBookmark,
  onPlayReel,
  curationName,
  setCurationName,
  curationDesc,
  setCurationDesc,
  curationItems,
  setCurationItems,
  isCurationPublished,
  setIsCurationPublished,
  onPreviewPublic
}: { 
  bookmarks: string[]; 
  allFeedItems: FeedItem[];
  profile: any;
  onFeedback: (id: string, v: "up" | "down") => void;
  feedback: Record<string, "up" | "down">;
  onBookmark: (id: string) => void;
  onPlayReel: (item: FeedItem) => void;
  curationName: string;
  setCurationName: (v: string) => void;
  curationDesc: string;
  setCurationDesc: (v: string) => void;
  curationItems: Array<{ id: string; note: string }>;
  setCurationItems: (v: Array<{ id: string; note: string }>) => void;
  isCurationPublished: boolean;
  setIsCurationPublished: (v: boolean) => void;
  onPreviewPublic: () => void;
}) {
  const [subTab, setSubTab] = useState<"salvos" | "digest" | "minha_curadoria">("salvos");
  const [isGenerating, setIsGenerating] = useState(false);
  const [digestGenerated, setDigestGenerated] = useState(false);
  const [digestText, setDigestText] = useState("");
  const [copied, setCopied] = useState(false);
  
  const handleNoteChange = (id: string, note: string) => {
    const exists = curationItems.some(i => i.id === id);
    if (exists) {
      setCurationItems(curationItems.map(i => i.id === id ? { ...i, note } : i));
    } else {
      setCurationItems([...curationItems, { id, note }]);
    }
  };

  const getNoteVal = (id: string) => {
    return curationItems.find(i => i.id === id)?.note || "";
  };

  const toggleItemInCuration = (id: string) => {
    const exists = curationItems.some(i => i.id === id);
    if (exists) {
      setCurationItems(curationItems.filter(i => i.id !== id));
    } else {
      setCurationItems([...curationItems, { id, note: "" }]);
    }
  };

  const bookmarkedItems = allFeedItems.filter(item => bookmarks.includes(item.id));

  const generateDigest = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setDigestGenerated(true);

      const itemsText = allFeedItems.slice(0, 3).map((item, idx) => {
        const bulletsText = item.bullets.map(b => "• " + b).join("\n");
        return "*" + (idx + 1) + ". " + item.title + "* (" + item.sourceName + ")\n" + bulletsText;
      }).join("\n\n");

      const todayStr = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
      const capitalizedToday = todayStr.charAt(0).toUpperCase() + todayStr.slice(1);

      const text = "*LUMI DIGEST DIÁRIO* 🧠💡\n_" + capitalizedToday + "_\n\nOlá, *" + (profile.name || "Leandro") + "*! Aqui está seu resumo inteligente filtrado pela IA da Lumi.\n\n-----------------------------\n\n" + itemsText + "\n\n-----------------------------\n\n📱 Gerado por _lumi. seu curador inteligente_.";
      setDigestText(text);
      toast.success("WhatsApp Digest gerado!");
    }, 1200);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(digestText);
    setCopied(true);
    toast.success("Texto copiado para o WhatsApp!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Subtab selection */}
      <div className="flex border-b border-border/40 text-center">
        <button 
          onClick={() => setSubTab("salvos")}
          className={"flex-1 pb-3 text-xs font-semibold border-b-2 transition-all " + (
            subTab === "salvos" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          🔖 Salvos ({bookmarkedItems.length})
        </button>
        <button 
          onClick={() => setSubTab("minha_curadoria")}
          className={"flex-1 pb-3 text-xs font-semibold border-b-2 transition-all " + (
            subTab === "minha_curadoria" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          ✍️ Minha Curadoria ({curationItems.length})
        </button>
        <button 
          onClick={() => setSubTab("digest")}
          className={"flex-1 pb-3 text-xs font-semibold border-b-2 transition-all " + (
            subTab === "digest" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          📱 WhatsApp
        </button>
      </div>

      {subTab === "salvos" && (
        <div className="space-y-4">
          {bookmarkedItems.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border/70 rounded-2xl bg-card/20 p-8">
              <Bookmark className="mx-auto h-8 w-8 text-muted-foreground/35 mb-2" />
              <h3 className="font-semibold text-base">Nenhum item salvo</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Explore seu feed e clique no ícone de marcador para salvar conteúdos interessantes aqui.
              </p>
            </div>
          ) : (
            bookmarkedItems.map((item) => (
              <FeedCard
                key={item.id}
                item={item}
                showDiscoveryBadge={false}
                feedback={feedback[item.id]}
                isBookmarked={true}
                onFeedback={(v) => onFeedback(item.id, v)}
                onBookmark={() => onBookmark(item.id)}
                onPlayReel={() => onPlayReel(item)}
                onOpenAction={() => {}}
              />
            ))
          )}
        </div>
      )}

      {subTab === "minha_curadoria" && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card/45 p-5">
            <h3 className="font-bold text-sm flex items-center gap-1.5"><Sparkles className="h-4.5 w-4.5 text-primary" /> Monte seu Feed de Curadoria Público</h3>
            <p className="text-[11px] text-muted-foreground mt-1 leading-normal">
              Escolha os melhores artigos salvos, insira suas notas ou comentários adicionais como curador e publique uma página de briefing exclusiva para compartilhar com sua equipe, clientes ou audiência.
            </p>

            <div className="mt-4 space-y-3">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase font-bold text-muted-foreground">Título do seu Feed</span>
                <input 
                  value={curationName}
                  onChange={(e) => { setCurationName(e.target.value); setIsCurationPublished(false); }}
                  placeholder="Ex: Curadoria Tech Semanal" 
                  className="bg-background border border-border rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase font-bold text-muted-foreground">Descrição / Intro</span>
                <textarea 
                  value={curationDesc}
                  onChange={(e) => { setCurationDesc(e.target.value); setIsCurationPublished(false); }}
                  placeholder="Diga aos leitores o que esperar desse feed..." 
                  className="bg-background border border-border rounded-xl px-3 py-2 text-xs outline-none h-16 resize-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button 
                onClick={() => {
                  if (curationItems.length === 0) {
                    toast.error("Adicione pelo menos 1 item para publicar!");
                    return;
                  }
                  setIsCurationPublished(true);
                  toast.success("Feed de curadoria publicado com sucesso!");
                }}
                className="flex-1 rounded-xl bg-primary text-primary-foreground font-bold py-2.5 text-xs uppercase tracking-wider transition active:scale-95 shadow-md"
              >
                {isCurationPublished ? "Atualizar Feed" : "Publicar Feed"}
              </button>
            </div>
          </div>

          {isCurationPublished && (
            <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-4 space-y-3 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 text-xs font-bold text-green-400">
                <CheckCircle2 className="h-4.5 w-4.5" /> Seu Feed de Curador está Ativo!
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Qualquer pessoa com o link de compartilhamento poderá ler sua página de curador com seus comentários sobre os artigos.
              </p>
              <div className="flex items-center justify-between bg-black/45 p-2.5 rounded-lg border border-border border-dashed font-mono text-[10px] text-white">
                <span>lumi.ai/c/{(profile.name || "leandro").toLowerCase()}</span>
                <button 
                  onClick={() => { navigator.clipboard.writeText("https://lumi.ai/c/" + (profile.name || "leandro").toLowerCase()); toast.success("Link copiado!"); }}
                  className="text-primary hover:text-white transition font-bold"
                >
                  Copiar
                </button>
              </div>
              <button 
                onClick={onPreviewPublic}
                className="w-full rounded-xl border border-primary text-primary hover:bg-primary hover:text-primary-foreground font-bold py-2.5 text-xs uppercase tracking-wider transition"
              >
                Visualizar Página Pública
              </button>
            </div>
          )}

          {/* List of saved items to curate */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Selecione Posts para Curadoria ({bookmarkedItems.length})</h4>
            
            {bookmarkedItems.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-border/70 rounded-2xl bg-card/25">
                <span className="text-xs text-muted-foreground">Salve posts no feed para incluí-los aqui.</span>
              </div>
            ) : (
              bookmarkedItems.map((item) => {
                const inCuration = curationItems.some(i => i.id === item.id);
                return (
                  <div 
                    key={item.id}
                    className={"p-4 rounded-xl border transition-all duration-200 " + (
                      inCuration ? "border-primary/50 bg-primary/5 shadow-sm" : "border-border/60 bg-card/30"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold block">{item.sourceName}</span>
                        <span className="text-xs font-bold block mt-0.5">{item.title}</span>
                      </div>
                      <button 
                        onClick={() => { toggleItemInCuration(item.id); setIsCurationPublished(false); }}
                        className={"rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition " + (
                          inCuration ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:bg-card"
                        )}
                      >
                        {inCuration ? "Remover" : "Adicionar"}
                      </button>
                    </div>

                    {inCuration && (
                      <div className="mt-3 flex flex-col gap-1 animate-in slide-in-from-top-2 duration-200">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                          ✍️ Comentário do Curador
                        </span>
                        <input 
                          value={getNoteVal(item.id)}
                          onChange={(e) => { handleNoteChange(item.id, e.target.value); setIsCurationPublished(false); }}
                          placeholder="Adicione sua visão, insight ou observação para seus leitores..."
                          className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {subTab === "digest" && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card/40 p-5">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-primary" /> Curadoria Pronta para Envio
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Consolidamos os principais tópicos e resumos do seu feed inteligente de hoje em uma mensagem perfeitamente formatada para você enviar para si mesmo no WhatsApp ou compartilhar.
            </p>
            {!digestGenerated && !isGenerating && (
              <button 
                onClick={generateDigest}
                className="mt-4 flex items-center justify-center gap-2 w-full rounded-xl bg-primary text-primary-foreground px-4 py-3 text-xs font-bold uppercase tracking-wider hover:opacity-90 active:scale-[0.98] transition-all"
              >
                Gerar WhatsApp Digest
              </button>
            )}

            {isGenerating && (
              <div className="mt-4 flex flex-col items-center justify-center py-4 text-center">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
                <span className="text-xs text-muted-foreground">Reunindo marcadores e calculando relevância...</span>
              </div>
            )}
          </div>

          {digestGenerated && (
            <div className="space-y-4">
              {/* WhatsApp Simulated Frame */}
              <div className="rounded-2xl border border-green-500/20 bg-[#0b141a] p-4 shadow-xl relative">
                {/* Simulated Header */}
                <div className="flex items-center gap-2 border-b border-white/5 pb-2.5 mb-3">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-semibold text-white/60 tracking-wider uppercase">Lumi Assistant</span>
                </div>
                
                {/* Chat Bubble */}
                <div className="rounded-lg bg-[#005c4b] p-3 text-xs text-white max-w-[90%] float-left relative leading-relaxed whitespace-pre-wrap font-sans">
                  {digestText}
                  <span className="block text-[8px] text-white/50 text-right mt-1.5">14:02 ✓✓</span>
                </div>
                <div className="clear-both" />

                {/* Floating blur copy button */}
                <button
                  onClick={copyToClipboard}
                  className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl bg-green-600 hover:bg-green-500 px-4 py-3 text-xs font-bold text-white transition-all uppercase tracking-wider"
                >
                  {copied ? <Check className="h-4.5 w-4.5" /> : <Copy className="h-4.5 w-4.5" />}
                  {copied ? "Copiado!" : "Copiar Texto Formatado"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ConexoesTab({ 
  connections, 
  onAdd, 
  onDelete,
  isSyncing,
  onOpenWebViewScraper,
  onOpenYtScraper,
  syncRealFeed
}: { 
  connections: Array<{ id: string; name: string; type: "youtube" | "rss" | "newsletter" | "podcast" | "instagram" | string; url?: string; addedAt: string }>;
  onAdd: (name: string, type: string, url?: string) => void;
  onDelete: (id: string, name: string) => void;
  isSyncing: boolean;
  onOpenWebViewScraper: () => void;
  onOpenYtScraper: () => void;
  syncRealFeed: (c: any) => void;
}) {
  const [activePlatform, setActivePlatform] = useState<"youtube" | "rss" | "newsletter" | "podcast" | "instagram" | null>(null);
  
  // Form fields
  const [name, setName] = useState("");
  const [customUrl, setCustomUrl] = useState("");

  // Cookie integration state
  const [sessionCookie, setSessionCookie] = useState("");
  const [isCookieSaved, setIsCookieSaved] = useState(false);
  const [showCookieHelp, setShowCookieHelp] = useState(false);

  // Connection method toggle state
  const [connMethod, setConnMethod] = useState<"webview" | "cookie" | "rss">("webview");

  useEffect(() => {
    const saved = localStorage.getItem("lumi_instagram_sessionid");
    if (saved) {
      setSessionCookie(saved);
      setIsCookieSaved(true);
    }
  }, []);

  useEffect(() => {
    if (activePlatform === "youtube") {
      setConnMethod("rss");
    } else {
      setConnMethod("webview");
    }
  }, [activePlatform]);

  const handleSaveCookie = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionCookie.trim()) return;
    if (activePlatform === "instagram") {
      localStorage.setItem("lumi_instagram_sessionid", sessionCookie.trim());
      setIsCookieSaved(true);
      toast.success("Cookie do Instagram salvo! Timeline sincronizada.");
    } else if (activePlatform === "youtube") {
      localStorage.setItem("lumi_youtube_sessionid", sessionCookie.trim());
      setIsCookieSaved(true);
      toast.success("Cookie do YouTube salvo! Timeline sincronizada.");
    }
    syncRealFeed(connections);
  };

  const handleClearCookie = () => {
    localStorage.removeItem("lumi_instagram_sessionid");
    setSessionCookie("");
    setIsCookieSaved(false);
    toast.info("Conexão avançada do Instagram desativada.");
    syncRealFeed(connections);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (activePlatform) {
      onAdd(name, activePlatform, customUrl);
      setName("");
      setCustomUrl("");
      setActivePlatform(null);
    }
  };

  const platformsList = [
    { id: "youtube" as const, name: "YouTube", desc: "Conecte sua conta e receba seu feed personalizado", icon: Play, color: "text-[#FF5252] bg-[#FF0000]/10 border-[#FF0000]/20" },
    { id: "instagram" as const, name: "Instagram Profile", desc: "Sincronize posts e reels de perfis", icon: Instagram, color: "text-[#E1306C] bg-[#E1306C]/10 border-[#E1306C]/20" },
    { id: "rss" as const, name: "Notícias RSS", desc: "Assine feeds e portais em tempo real", icon: Rss, color: "text-primary bg-primary/10 border-primary/20" },
    { id: "newsletter" as const, name: "Substack / Newsletters", desc: "Direcione e-mails p/ seu inbox Lumi", icon: Mail, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
    { id: "podcast" as const, name: "Podcasts Integrados", desc: "Importe e-mails e feeds de podcasts", icon: Volume2, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" }
  ];

  return (
    <div className="space-y-6">
      {/* Platform selection Grid */}
      {!activePlatform ? (
        <div className="space-y-4">
          <div className="border border-border/80 bg-card/40 rounded-2xl p-5 backdrop-blur-sm">
            <h3 className="font-semibold text-base">Nova Fonte de Ingestão</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Selecione o tipo de fonte de dados que deseja que a sua secretária digital processe, resuma e integre ao seu feed diário.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {platformsList.map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.id}
                  onClick={() => setActivePlatform(p.id)}
                  className={"flex flex-col text-left p-4 rounded-xl border bg-card/50 hover:bg-card/90 transition-all duration-200 hover:-translate-y-[2px] shadow-sm hover:shadow-md " + p.color}
                >
                  <Icon className="h-5 w-5 mb-2.5" />
                  <span className="text-sm font-semibold text-foreground">{p.name}</span>
                  <span className="text-[10px] text-muted-foreground mt-1 leading-normal">{p.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Form for active platform */
        <div className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="flex justify-between items-center border-b border-border pb-3 mb-4">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Plus className="h-4.5 w-4.5 text-primary" /> 
              {activePlatform === "youtube" ? "📺 YouTube Perfil" :
               activePlatform === "instagram" ? "📸 Instagram Profile" :
               activePlatform === "rss" ? "📡 Feed RSS de Notícias" :
               activePlatform === "newsletter" ? "📬 Newsletter" : "🎙️ Podcast"}
            </h3>
            <button 
              onClick={() => { setActivePlatform(null); setName(""); setCustomUrl(""); }}
              className="text-muted-foreground hover:text-foreground transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {activePlatform === "instagram" && (
            <div className="space-y-4 mb-4">
              <div className="flex bg-background border border-border p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setConnMethod("webview")}
                  className={`flex-1 text-center py-2 text-[11px] font-bold rounded-lg transition-all ${
                    connMethod === "webview"
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sincronização WebView
                </button>
                <button
                  type="button"
                  onClick={() => setConnMethod("cookie")}
                  className={`flex-1 text-center py-2 text-[11px] font-bold rounded-lg transition-all ${
                    connMethod === "cookie"
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Session Cookie (Avançado)
                </button>
              </div>

              {connMethod === "webview" ? (
                <div className="bg-[#E1306C]/5 border border-[#E1306C]/20 rounded-xl p-4 space-y-3">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Conecte sua conta do Instagram com segurança usando nossa janela de login local. A secretária digital da Lumi processará o feed relevante em tempo real.
                  </p>
                  <button
                    type="button"
                    onClick={onOpenWebViewScraper}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white font-bold py-2.5 text-xs uppercase tracking-wider transition active:scale-95 shadow"
                  >
                    <Compass className="h-4 w-4" /> Iniciar Conexão WebView
                  </button>
                </div>
              ) : (
                <div className="border border-border bg-card/45 rounded-xl p-4 space-y-3">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Cole o cookie <code>sessionid</code> de uma sessão ativa do seu navegador para habilitar a ingestão automática em segundo plano.
                  </p>
                  {isCookieSaved ? (
                    <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-lg p-2.5 text-[11px] text-green-400">
                      <span className="font-semibold">Conexão Ativa com o Instagram ✓</span>
                      <button type="button" onClick={handleClearCookie} className="text-destructive font-bold hover:underline">
                        Desconectar
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input 
                        type="password"
                        value={sessionCookie}
                        onChange={(e) => setSessionCookie(e.target.value)}
                        placeholder="Cole o valor do cookie sessionid"
                        className="w-full bg-[#12191f] border border-border rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary text-white"
                        required
                      />
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setShowCookieHelp(!showCookieHelp)} className="text-[10px] text-primary font-bold hover:underline">
                          Como obter este cookie?
                        </button>
                        <button 
                          type="button" 
                          onClick={(e) => {
                            if (!sessionCookie.trim()) return;
                            localStorage.setItem("lumi_instagram_sessionid", sessionCookie.trim());
                            setIsCookieSaved(true);
                            toast.success("Cookie do Instagram salvo! Timeline sincronizada.");
                            syncRealFeed(connections);
                          }} 
                          className="ml-auto rounded-lg bg-primary text-primary-foreground font-semibold px-4 py-1.5 text-[10px] uppercase tracking-wider shadow-sm"
                        >
                          Salvar Cookie
                        </button>
                      </div>

                      {showCookieHelp && (
                        <div className="mt-2.5 bg-black/50 border border-border rounded-lg p-3 text-[10px] text-muted-foreground leading-relaxed space-y-1.5 list-decimal font-sans pl-6">
                          <li>1. Acesse <code>instagram.com</code> no computador e faça login.</li>
                          <li>2. Pressione a tecla <strong>F12</strong> para abrir as ferramentas.</li>
                          <li>3. Vá na aba <strong>Application</strong> e procure por <strong>Cookies</strong>.</li>
                          <li>4. Clique em <code>https://www.instagram.com</code> e busque por <strong>sessionid</strong>.</li>
                          <li>5. Copie o valor longo e cole no campo acima.</li>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activePlatform === "youtube" && (
            <div className="space-y-4 mb-4">
              <div className="bg-[#FF0000]/5 border border-[#FF0000]/20 rounded-xl p-4 space-y-3">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Conecte sua conta do YouTube com segurança. A Lumi abrirá uma janela de login local e extrairá seu feed de recomendações personalizadas — sem armazenar sua senha.
                </p>
                <ul className="space-y-1.5 text-[10px] text-muted-foreground">
                  <li className="flex items-center gap-2"><span className="text-primary font-bold">✓</span> Feed personalizado baseado no seu histórico</li>
                  <li className="flex items-center gap-2"><span className="text-primary font-bold">✓</span> Filtrado e resumido pela secretária digital</li>
                  <li className="flex items-center gap-2"><span className="text-primary font-bold">✓</span> 100% local — nada é enviado para servidores</li>
                </ul>
                <button
                  type="button"
                  onClick={onOpenYtScraper}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-700 to-red-500 hover:opacity-90 text-white font-bold py-3 text-xs uppercase tracking-wider transition active:scale-95 shadow-lg"
                >
                  <Play className="h-4 w-4 fill-current" /> Conectar Perfil do YouTube
                </button>
              </div>
            </div>
          )}

          {activePlatform === "newsletter" && (
            <div className="mb-4 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-[11px] text-amber-300 leading-relaxed">
              💡 <strong>Instrução da Secretária:</strong> Copie o e-mail abaixo e configure um encaminhamento automático no seu Substack/Gmail. Toda newsletter enviada para lá será sumarizada no feed.
              <div className="mt-2 flex items-center justify-between bg-black/45 p-2 rounded-lg border border-border border-dashed font-mono select-all text-white">
                <span>leandro.forward@lumi.ai</span>
                <Copy className="h-3 w-3 hover:text-primary transition cursor-pointer" onClick={() => { navigator.clipboard.writeText("leandro.forward@lumi.ai"); toast.success("E-mail copiado!"); }} />
              </div>
            </div>
          )}

          {!( (activePlatform === "instagram" && connMethod === "webview") || (activePlatform as string) === "youtube" ) && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  activePlatform === "youtube" ? "Seu usuário YouTube (preenchido automaticamente)" :
                  activePlatform === "instagram" ? "Nome do perfil do Instagram (ex: @rocketseatoficial)" :
                  activePlatform === "rss" ? "Nome do Portal (ex: Tecnoblog)" :
                  activePlatform === "newsletter" ? "Nome da Newsletter (ex: Pragmatic Engineer)" : "Nome do Podcast (ex: Braincast)"
                }
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-white"
                required
              />

              {(activePlatform === "rss" || activePlatform === "podcast") && (
                <input
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="URL do Feed XML / RSS"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-white"
                  required
                />
              )}

              <button
                type="submit"
                disabled={!name.trim() || isSyncing}
                className="w-full rounded-xl bg-primary text-primary-foreground font-bold uppercase tracking-wider py-3 text-xs mt-1 hover:opacity-90 active:scale-[0.98] disabled:opacity-40 transition-all shadow-md"
              >
                {isSyncing ? "Sincronizando..." : "Conectar Fonte"}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Sync list of connections */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold tracking-wider text-muted-foreground uppercase px-1">Fontes Ativas ({connections.length})</h4>
        
        {connections.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-border/80 rounded-2xl bg-card/10">
            <span className="text-xs text-muted-foreground animate-pulse">Nenhuma fonte sincronizada no momento.</span>
          </div>
        ) : (
          connections.map((c) => (
            <div 
              key={c.id} 
              className="flex items-center justify-between p-4 rounded-xl border border-border/70 bg-card/30 backdrop-blur-sm hover:border-border transition duration-200"
            >
              <div className="flex items-center gap-3">
                <span className={"grid h-8 w-8 place-items-center rounded-lg " + (
                  c.type === "youtube" ? "bg-[#FF0000]/15 text-[#FF5252]" : 
                  c.type === "instagram" ? "bg-[#E1306C]/15 text-[#FF529C]" : 
                  c.type === "rss" ? "bg-primary/15 text-primary" : 
                  c.type === "newsletter" ? "bg-amber-500/15 text-amber-400" : "bg-purple-500/15 text-purple-400"
                )}>
                  {c.type === "youtube" ? <Play className="h-4 w-4 fill-current" /> :
                   c.type === "instagram" ? <Instagram className="h-4 w-4" /> :
                   c.type === "rss" ? <RssIcon /> :
                   c.type === "newsletter" ? <Mail className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </span>
                <div>
                  <span className="text-xs font-semibold text-foreground block">{c.name}</span>
                  <span className="text-[10px] text-muted-foreground">Sincronizado {c.addedAt || "há alguns minutos"}</span>
                </div>
              </div>

              <button 
                onClick={() => onDelete(c.id, c.name)}
                className="grid h-8 w-8 place-items-center rounded-full border border-transparent hover:border-destructive/20 hover:bg-destructive/10 text-muted-foreground hover:text-destructive active:scale-90 transition"
                aria-label="Excluir Conexão"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
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


function GlobalNav({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) {
  const items = [
    { label: "Feed", icon: Rss, value: "feed" },
    { label: "Assistente", icon: Sparkles, value: "secretaria" },
    { label: "Curadorias", icon: Library, value: "curadorias" },
    { label: "Conexões", icon: Link2, value: "conexoes" }
  ];

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 border-t border-border/70 bg-[#090d10]/95 backdrop-blur-xl pb-safe">
      <nav className="mx-auto flex max-w-2xl items-stretch justify-between gap-1 px-3 py-2">
        {items.map((it) => {
          const Icon = it.icon;
          const isActive = activeTab === it.value;
          return (
            <button
              key={it.label}
              onClick={() => onTabChange(it.value)}
              className={`group relative flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 transition ${
                isActive
                  ? "bg-gradient-to-r from-[oklch(0.93_0.26_112)] to-[oklch(0.90_0.26_120)] bg-clip-text text-transparent font-bold"
                  : "text-muted-foreground hover:bg-card/60 hover:text-foreground"
              }`}
            >
              {isActive && (
                <span className="absolute inset-x-3 -top-[1px] h-px bg-gradient-to-r from-[oklch(0.93_0.26_112)] to-[oklch(0.90_0.26_120)] shadow-[0_0_12px_oklch(0.90_0.26_120/0.7)]" />
              )}
              <Icon
                className={`h-[18px] w-[18px] ${isActive ? "text-[oklch(0.90_0.26_120)] drop-shadow-[0_0_6px_oklch(0.90_0.26_120/0.85)]" : ""}`}
                strokeWidth={2.2}
              />
              <span className="text-[11px] font-medium tracking-wide">{it.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
function PublicCurationPage({ name, desc, items, allFeedItems, profile, onClose }: { name: string; desc: string; items: any[]; allFeedItems: any[]; profile: any; onClose: () => void }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-bold mb-2">{name}</h1>
      <p className="text-muted-foreground mb-6">{desc}</p>
      <button onClick={onClose} className="bg-primary text-primary-foreground px-6 py-2 rounded-xl font-bold">Voltar ao App</button>
    </div>
  );
}

function WebViewScraperModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (conn: any) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
      <div className="relative overflow-hidden w-full max-w-[360px] rounded-[24px] border border-white/10 bg-[#090d10] p-6 text-center">
        <h3 className="text-lg font-bold text-white mb-2">Conectar Instagram</h3>
        <p className="text-xs text-white/70 mb-6">A janela de login foi aberta. Faça login para continuar.</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 bg-card border border-border text-foreground px-4 py-2 rounded-xl font-bold text-sm">Cancelar</button>
          <button onClick={() => { onSuccess({ id: 'ig_web_' + Date.now(), name: '@meu_instagram', type: 'instagram', addedAt: 'Agora mesmo' }); }} className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-xl font-bold text-sm">Concluir</button>
        </div>
      </div>
    </div>
  );
}

function YoutubeScraperModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (conn: any) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
      <div className="relative overflow-hidden w-full max-w-[360px] rounded-[24px] border border-white/10 bg-[#090d10] p-6 text-center">
        <h3 className="text-lg font-bold text-white mb-2">Sincronizar YouTube</h3>
        <p className="text-xs text-white/70 mb-6">Uma janela do YouTube foi aberta para fazer login e capturar seu feed personalizado.</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 bg-card border border-border text-foreground px-4 py-2 rounded-xl font-bold text-sm">Cancelar</button>
          <button onClick={() => { onSuccess({ id: 'yt_web_' + Date.now(), name: '@meu_youtube', type: 'youtube', addedAt: 'Agora mesmo' }); }} className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-xl font-bold text-sm">Concluir</button>
        </div>
      </div>
    </div>
  );
}
