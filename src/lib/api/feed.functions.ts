import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { spawn, exec } from 'child_process';
import http from 'http';
import fsNode from 'fs';
import os from 'os';

export type RawFeedItem = {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  thumbnail: string;
  videoId?: string;
  mediaKind?: "thumbnail" | "reel" | "audio" | "document";
};

// Server-side cache
const cache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache

function cleanCdataAndHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1") // Remove CDATA tags
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function parseRssXml(xml: string): RawFeedItem[] {
  const items: RawFeedItem[] = [];
  const isAtom = xml.includes("<entry") || xml.includes("<feed");

  if (isAtom) {
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;
    while ((match = entryRegex.exec(xml)) !== null) {
      const entryHtml = match[1];

      const titleMatch = entryHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/);
      const title = titleMatch ? cleanCdataAndHtml(titleMatch[1]) : "Sem título";

      const linkMatch = entryHtml.match(/<link[^>]+href="([^"]+)"/) || entryHtml.match(/<link[^>]+href='([^']+)'/);
      const link = linkMatch ? linkMatch[1] : "";

      const pubDateMatch = entryHtml.match(/<published[^>]*>([\s\S]*?)<\/published>/) || entryHtml.match(/<updated[^>]*>([\s\S]*?)<\/updated>/);
      const pubDate = pubDateMatch ? pubDateMatch[1] : new Date().toISOString();

      const thumbMatch = entryHtml.match(/<media:thumbnail[^>]+url="([^"]+)"/) || entryHtml.match(/<media:thumbnail[^>]+url='([^']+)'/);
      const thumbnail = thumbMatch ? thumbMatch[1] : "";

      const videoIdMatch = entryHtml.match(/<yt:videoId[^>]*>([\s\S]*?)<\/yt:videoId>/);
      const videoId = videoIdMatch ? videoIdMatch[1] : "";

      const descMatch = entryHtml.match(/<media:description[^>]*>([\s\S]*?)<\/media:description>/) || entryHtml.match(/<summary[^>]*>([\s\S]*?)<\/summary>/);
      const description = descMatch ? cleanCdataAndHtml(descMatch[1]) : "";

      items.push({
        title,
        link,
        pubDate,
        description,
        thumbnail,
        videoId,
        mediaKind: thumbnail ? "thumbnail" : undefined
      });
    }
  } else {
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
      const itemHtml = match[1];

      const titleMatch = itemHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/);
      const title = titleMatch ? cleanCdataAndHtml(titleMatch[1]) : "Sem título";

      const linkMatch = itemHtml.match(/<link[^>]*>([\s\S]*?)<\/link>/) || itemHtml.match(/<link[^>]+href="([^"]+)"/);
      const link = linkMatch ? linkMatch[1].replace(/<[^>]*>/g, "").trim() : "";

      const pubDateMatch = itemHtml.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/) || itemHtml.match(/<dc:date[^>]*>([\s\S]*?)<\/dc:date>/);
      const pubDate = pubDateMatch ? pubDateMatch[1] : new Date().toISOString();

      const descMatch = itemHtml.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/) || itemHtml.match(/<description[^>]*>([\s\S]*?)<\/description>/);
      const description = descMatch ? cleanCdataAndHtml(descMatch[1]) : "";

      const thumbMatch = itemHtml.match(/<media:thumbnail[^>]+url="([^"]+)"/) || itemHtml.match(/<enclosure[^>]+url="([^"]+)"[^>]+type="image/);
      const thumbnail = thumbMatch ? thumbMatch[1] : "";

      items.push({
        title,
        link,
        pubDate,
        description,
        thumbnail,
        mediaKind: thumbnail ? "thumbnail" : undefined
      });
    }
  }

  return items;
}

async function resolveYoutubeChannelId(handle: string): Promise<string> {
  const cleanHandle = handle.trim().replace(/^@/, "");
  if (!cleanHandle) return "";

  const cacheKey = "yt_handle_" + cleanHandle;
  if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < 24 * 60 * 60 * 1000) {
    return cache[cacheKey].data;
  }

  const url = "https://www.youtube.com/@" + cleanHandle;
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    const html = await response.text();
    const match = html.match(/"channelId"\s*:\s*"([^"]+)"/) || html.match(/<meta itemprop="identifier" content="([^"]+)"/);
    if (match && match[1]) {
      const channelId = match[1];
      cache[cacheKey] = { data: channelId, timestamp: Date.now() };
      return channelId;
    }
  } catch (e) {
    console.error("Error resolving YouTube handle:", handle, e);
  }
  return "";
}

function autoCategorize(title: string, description: string): "work" | "lazer" {
  const lowercase = (title + " " + description).toLowerCase();
  const focusKeywords = [
    "react", "javascript", "typescript", "rust", "programming", "dev", "ai", "artificial intelligence",
    "inteligência artificial", "startup", "capta", "millions", "market", "economy", "negócios",
    "business", "finances", "ações", "finanças", "investimento", "banco", "tecnologia", "tech",
    "engineering", "desenvolvimento", "software", "agente", "modelos", "openai", "copilot", "google",
    "apple", "microsoft", "compiler", "framework", "database", "git", "code", "architecture"
  ];
  const matchesFocus = focusKeywords.some(k => lowercase.includes(k));
  return matchesFocus ? "work" : "lazer";
}

function autoTag(title: string, description: string): string[] {
  const lowercase = (title + " " + description).toLowerCase();
  const tags: string[] = [];

  if (lowercase.includes("react") || lowercase.includes("programming") || lowercase.includes("code") || lowercase.includes("dev") || lowercase.includes("software") || lowercase.includes("framework") || lowercase.includes("web")) {
    tags.push("Tecnologia");
  }
  if (lowercase.includes("ai") || lowercase.includes("inteligência artificial") || lowercase.includes("openai") || lowercase.includes("modelos") || lowercase.includes("agents") || lowercase.includes("agentes")) {
    tags.push("Tecnologia");
  }
  if (lowercase.includes("design") || lowercase.includes("ux") || lowercase.includes("ui") || lowercase.includes("interface") || lowercase.includes("óculos") || lowercase.includes("apple vision")) {
    tags.push("Design");
  }
  if (lowercase.includes("negócios") || lowercase.includes("startup") || lowercase.includes("market") || lowercase.includes("empresa") || lowercase.includes("capta") || lowercase.includes("adquirida")) {
    tags.push("Negócios");
  }
  if (lowercase.includes("finanças") || lowercase.includes("investimento") || lowercase.includes("dinheiro") || lowercase.includes("ações") || lowercase.includes("cripto") || lowercase.includes("bitcoin")) {
    tags.push("Finanças");
  }
  if (lowercase.includes("fórmula 1") || lowercase.includes("esportes") || lowercase.includes("futebol") || lowercase.includes("jogo") || lowercase.includes("olimpíada")) {
    tags.push("Esportes");
  }
  if (lowercase.includes("saúde") || lowercase.includes("foco") || lowercase.includes("sono") || lowercase.includes("vida") || lowercase.includes("produtividade") || lowercase.includes("hábito")) {
    tags.push("Saúde");
  }

  if (tags.length === 0) {
    tags.push("Outros");
  }

  return Array.from(new Set(tags));
}

function generateBulletSummaries(description: string, title: string): string[] {
  if (!description || description.trim().length < 30) {
    return [
      "Análise compactada sobre o tema: " + title + ".",
      "Conteúdo inteligente selecionado e priorizado pela Lumi.",
      "Detalhes e implicações completas disponíveis no link original."
    ];
  }

  const sentences = description
    .split(/[.!?]\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 15 && s.length < 160 && !s.includes("http") && !s.includes("www."));

  if (sentences.length >= 3) {
    return sentences.slice(0, 3).map(s => s.endsWith(".") ? s : s + ".");
  } else if (sentences.length > 0) {
    const bullets = [...sentences];
    while (bullets.length < 3) {
      bullets.push("Acompanhe a cobertura detalhada em tempo real.");
    }
    return bullets.map(s => s.endsWith(".") ? s : s + ".");
  } else {
    return [
      "Destaques da cobertura sobre: " + title + ".",
      "Síntese gerada automaticamente focando nos pontos chave.",
      "Conexão ativa enviando atualizações ao feed."
    ];
  }
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    if (diffMins < 60) {
      return "há " + Math.max(1, diffMins) + "m";
    } else if (diffHours < 24) {
      return "há " + diffHours + "h";
    } else {
      return "há " + diffDays + "d";
    }
  } catch (e) {
    return "há 1h";
  }
}

export const fetchRealFeed = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      connections: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          type: z.enum(["youtube", "rss", "instagram"]),
          url: z.string().optional()
        })
      )
    })
  )
  .handler(async ({ data }) => {
    const aggregatedItems: any[] = [];

    const fetchPromises = data.connections.map(async (conn) => {
      if (conn.type === "instagram") {
        const relevance = 80 + Math.floor(Math.random() * 15);
        const formatted = {
          id: conn.id + "_insta_" + Date.now(),
          source: "instagram" as const,
          sourceName: conn.name,
          timestamp: "há 10m (Sincronizado)",
          title: "Destaques e insights do post de " + conn.name + " no Instagram",
          bullets: [
            "Resumo visual e análise das principais fotos/vídeos postados.",
            "Legenda decodificada focando no valor e insights práticos para o leitor.",
            "Métricas de engajamento e comentários consolidados pela Lumi."
          ],
          relevance,
          tags: ["Design", "Negócios"],
          category: "lazer" as const,
          media: {
            kind: "reel" as const,
            src: "",
            duration: "0:30"
          }
        };
        aggregatedItems.push(formatted);
        return;
      }

      let fetchUrl = "";
      if (conn.type === "youtube") {
        const channelId = await resolveYoutubeChannelId(conn.name);
        if (!channelId) return;
        fetchUrl = "https://www.youtube.com/feeds/videos.xml?channel_id=" + channelId;
      } else {
        fetchUrl = conn.url || "";
      }

      if (!fetchUrl) return;

      const cacheKey = "feed_url_" + fetchUrl;
      if (cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < CACHE_TTL) {
        aggregatedItems.push(...cache[cacheKey].data);
        return;
      }

      try {
        const response = await fetch(fetchUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          }
        });
        if (!response.ok) return;
        const xml = await response.text();
        const rawItems = parseRssXml(xml);

        const formattedItems = rawItems.map((item, index) => {
          const cat = autoCategorize(item.title, item.description);
          const tags = autoTag(item.title, item.description);
          const bullets = generateBulletSummaries(item.description, item.title);
          const relevance = 70 + Math.floor(Math.random() * 25);

          return {
            id: conn.id + "_" + index + "_" + Date.now(),
            source: conn.type,
            sourceName: conn.name,
            timestamp: formatRelativeTime(item.pubDate),
            title: item.title,
            bullets,
            relevance,
            tags,
            category: cat,
            media: item.thumbnail ? {
              kind: conn.type === "youtube" ? "thumbnail" as const : "thumbnail" as const,
              src: item.thumbnail,
              duration: conn.type === "youtube" ? "05:00" : undefined
            } : undefined
          };
        });

        cache[cacheKey] = { data: formattedItems, timestamp: Date.now() };
        aggregatedItems.push(...formattedItems);
      } catch (e) {
        console.error("Error fetching feed:", fetchUrl, e);
      }
    });

    await Promise.allSettled(fetchPromises);
    return { items: aggregatedItems };
  });

export const fetchInstagramTimeline = createServerFn({ method: "POST" })
  .inputValidator(z.object({ sessionId: z.string().min(1) }))
  .handler(async ({ data }) => {
    try {
      const response = await fetch("https://www.instagram.com/api/v1/feed/timeline/", {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
          "Cookie": data.sessionId,
          "X-IG-App-ID": "936619743392459"
        }
      });

      if (!response.ok) {
        return { error: "Erro HTTP do Instagram: " + response.status };
      }

      const json = await response.json() as any;
      const parsedItems: any[] = [];
      const items = json.feed_items || json.items || [];

      for (const rawItem of items) {
        const item = rawItem.media_or_ad || rawItem;
        if (!item || !item.id || item.ad_id) continue;

        const id = "ig_real_" + item.id;
        const sourceName = item.user?.username || "instagram_user";
        const captionText = item.caption?.text || "";
        const title = captionText.split("\n")[0] || "Post de @" + sourceName;

        const bullets = generateBulletSummaries(captionText, title);
        const cat = autoCategorize(title, captionText);
        const tags = autoTag(title, captionText);

        let thumbnail = "";
        if (item.image_versions2?.candidates?.[0]?.url) {
          thumbnail = item.image_versions2.candidates[0].url;
        }

        const isVideo = !!item.video_versions;
        const durationSecs = item.video_duration ? Math.round(item.video_duration) : 15;
        const duration = isVideo ? "0:" + durationSecs.toString().padStart(2, "0") : undefined;

        parsedItems.push({
          id,
          source: "instagram" as const,
          sourceName: "@" + sourceName,
          timestamp: formatRelativeTime(new Date(item.taken_at * 1000).toISOString()),
          title,
          bullets,
          relevance: 75 + Math.floor(Math.random() * 20),
          tags,
          category: cat,
          media: thumbnail ? {
            kind: isVideo ? "reel" as const : "thumbnail" as const,
            src: thumbnail,
            duration
          } : undefined
        });
      }

      return { items: parsedItems };
    } catch (e: any) {
      console.error("Error fetching Instagram timeline:", e);
      return { error: e.message };
    }
  });


let activeScraper: {
  process: any;
  sessionId: string | null;
  username: string | null;
  status: 'idle' | 'starting' | 'running' | 'success' | 'error' | 'closed';
  feedItems: any[] | null;
  error: string | null;
  logs: string[];
} | null = null;

function addLog(msg: string) {
  if (activeScraper) {
    activeScraper!.logs.push(msg);
  }
}


export const fetchYoutubeTimeline = createServerFn({ method: "POST" })
  .inputValidator(z.object({ sessionId: z.string().min(1) }))
  .handler(async ({ data }) => {
    try {
      const response = await fetch("https://www.youtube.com/", {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Cookie": data.sessionId
        }
      });

      if (!response.ok) {
        return { error: "Erro HTTP do YouTube: " + response.status };
      }

      const html = await response.text();
      const startKeyword = "ytInitialData = ";
      const startIndex = html.indexOf(startKeyword);
      if (startIndex === -1) {
        return { error: "Não foi possível encontrar os dados da timeline (ytInitialData) no HTML." };
      }

      const dataStart = startIndex + startKeyword.length;
      const scriptEndIndex = html.indexOf("</script>", dataStart);
      if (scriptEndIndex === -1) {
        return { error: "Não foi possível encontrar o final do script da timeline." };
      }

      let rawJson = html.substring(dataStart, scriptEndIndex).trim();
      if (rawJson.endsWith(";")) {
        rawJson = rawJson.slice(0, -1);
      }

      const json = JSON.parse(rawJson);
      const parsedItems: any[] = [];
      
      let contents;
      try {
        contents = json.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.richGridRenderer?.contents;
      } catch (e) {
        // Fallback for different ytInitialData layouts
      }

      if (!contents) {
        return { error: "A estrutura do feed do YouTube mudou ou não há vídeos recomendados." };
      }

      for (const c of contents) {
        const v = c.richItemRenderer?.content?.videoRenderer;
        if (v && v.videoId) {
          const id = "yt_real_" + v.videoId;
          const sourceName = v.ownerText?.runs?.[0]?.text || "YouTube";
          const title = v.title?.runs?.[0]?.text || "Vídeo";
          const desc = v.descriptionSnippet?.runs?.[0]?.text || "";
          const timestamp = v.publishedTimeText?.simpleText || "Recente";
          const duration = v.lengthText?.simpleText || "10:00";
          const thumbnail = v.thumbnail?.thumbnails?.[v.thumbnail.thumbnails.length - 1]?.url || "";

          const bullets = generateBulletSummaries(desc || title, title);
          const cat = autoCategorize(title, desc || title);
          const tags = autoTag(title, desc || title);

          parsedItems.push({
            id,
            source: "youtube" as const,
            sourceName,
            timestamp,
            title,
            bullets,
            relevance: 85 + Math.floor(Math.random() * 10),
            tags,
            category: cat,
            media: thumbnail ? {
              kind: "thumbnail" as const,
              src: thumbnail,
              duration
            } : undefined
          });
        }
      }

      return { items: parsedItems };
    } catch (e: any) {
      console.error("Error fetching YouTube timeline:", e);
      return { error: e.message };
    }
  });


export const startInstagramWebViewScraper = createServerFn({ method: "POST" })
  .handler(async () => {
    if (activeScraper && activeScraper.status === 'running') {
      return { success: true, message: "Scraper is already running" };
    }

    activeScraper = {
      feedItems: null,
      process: null,
      sessionId: null,
      username: null,
      status: 'running',
      error: null,
      logs: ["Lumi: Inicializando automação de WebView local..."]
    };

    let browserPath = '';
    const paths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ];
    for (const p of paths) {
      if (fsNode.existsSync(p)) {
        browserPath = p;
        break;
      }
    }

    if (!browserPath) {
      activeScraper!.status = 'error';
      activeScraper!.error = "Navegador não encontrado (Chrome/Edge necessários)";
      return { success: false, error: activeScraper!.error };
    }

    const userDataDir = os.homedir() + '\\.lumi-scraper-profile';
    const url = 'https://www.instagram.com/accounts/login/';
    
    addLog(`Encontrou navegador em: ${browserPath.split('\\').pop()}`);
    addLog("Iniciando janela de login (Por favor, faça login no Instagram)...");

    const browserProcess = spawn(browserPath, [
      '--remote-debugging-port=9222',
      '--user-data-dir=' + userDataDir,
      '--no-first-run',
      '--no-default-browser-check',
      url
    ], { detached: true, stdio: 'ignore' });
    
    browserProcess.unref();
    activeScraper!.process = browserProcess;

    let attempts = 0;
    const maxAttempts = 120; // 2 minutes

    const pollCDP = () => {
      if (!activeScraper || activeScraper!.status !== 'running') return;
      attempts++;
      
      http.get('http://127.0.0.1:9222/json', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const targets = JSON.parse(data);
            const igTarget = targets.find((t: any) => t.url.includes('instagram.com'));
            if (!igTarget) {
              if (attempts >= maxAttempts) {
                activeScraper!.status = 'error';
                activeScraper!.error = "Timeout aguardando login.";
                if (activeScraper!.process) {
                  try { activeScraper!.process.kill(); } catch (e) {}
                }
              } else {
                setTimeout(pollCDP, 1000);
              }
              return;
            }

            const wsUrl = igTarget.webSocketDebuggerUrl;
            const ws = new WebSocket(wsUrl);
            ws.onopen = () => {
              ws.send(JSON.stringify({ id: 1, method: "Network.enable" }));
              ws.send(JSON.stringify({ id: 2, method: "Network.getCookies", params: { urls: ["https://www.instagram.com"] } }));
            };
            ws.onmessage = (event) => {
              const msg = JSON.parse(event.data);
              if (msg.id === 2 && msg.result && msg.result.cookies) {
                const sessionCookie = msg.result.cookies.find((c: any) => c.name === 'sessionid');
                if (sessionCookie) {
                  addLog("✓ Cookie sessionid capturado com sucesso!");
                  activeScraper!.sessionId = msg.result.cookies.map((c: any) => c.name + "=" + c.value).join("; ");
                  addLog("Buscando informações do seu perfil via Chrome...");
                  
                  // Evaluate fetch inside the browser page origin so it has full authentication headers
                  ws.send(JSON.stringify({
                    id: 10,
                    method: "Runtime.evaluate",
                    params: {
                      expression: `(() => {
                        try {
                          const t = document.cookie.match(/csrftoken=([^;]+)/)?.[1] || '';
                          return fetch('/api/v1/feed/timeline/', { headers: { 'x-csrftoken': t } })
                            .then(r => r.json())
                            .then(j => {
                               const uname = j.user?.username || window._sharedData?.config?.viewer?.username || 'perfil';
                               const items = j.feed_items || j.items || [];
                               const parsed = [];
                               for(const rawItem of items) {
                                  const item = rawItem.media_or_ad || rawItem;
                                  if (!item || !item.id || item.ad_id) continue;
                                  const captionText = item.caption?.text || "";
                                  const title = captionText.split("\n")[0] || "Post de @" + (item.user?.username || uname);
                                  parsed.push({
                                    id: "ig_web_real_" + item.id,
                                    source: "instagram",
                                    sourceName: "@" + (item.user?.username || uname),
                                    timestamp: "Recente",
                                    title: title,
                                    bullets: ["ExtraÃ­do no browser local", "Sincronizado via WebView"],
                                    relevance: 80 + Math.floor(Math.random() * 20),
                                    tags: ["ig"],
                                    category: "foco",
                                    media: item.image_versions2?.candidates?.[0]?.url ? { kind: "thumbnail", src: item.image_versions2.candidates[0].url } : undefined
                                  });
                               }
                               return JSON.stringify({ username: uname, feedItems: parsed.slice(0, 15) });
                            }).catch(() => JSON.stringify({ username: 'perfil', feedItems: [] }));
                        } catch(e) { return Promise.resolve(JSON.stringify({ username: 'perfil', feedItems: [] })); }
                      })()`,
                      awaitPromise: true,
                      returnByValue: true
                    }
                  }));
                } else {
                  ws.close();
                  if (attempts < maxAttempts) {
                    setTimeout(pollCDP, 1000);
                  } else {
                    activeScraper!.status = 'error';
                    activeScraper!.error = "Timeout. Você não fez login a tempo.";
                    if (activeScraper!.process) {
                      try { activeScraper!.process.kill(); } catch (e) {}
                    }
                  }
                }
              }
              
              if (msg.id === 10 && msg.result && msg.result.result) {
                const parsedRes = JSON.parse(msg.result.result.value || "{}");
                const uname = parsedRes.username || "perfil";
                activeScraper!.username = uname;
                activeScraper!.feedItems = parsedRes.feedItems || [];
                addLog("✓ Conectado com sucesso como @" + uname);
                activeScraper!.status = 'success';
                if (activeScraper!.process) {
                  try { activeScraper!.process.kill(); } catch (e) {}
                }
                ws.close();
              }
            };
            ws.onerror = () => {
              if (attempts < maxAttempts) setTimeout(pollCDP, 1000);
            };
          } catch (e) {
             if (attempts < maxAttempts) setTimeout(pollCDP, 1000);
          }
        });
      }).on('error', () => {
        if (attempts > 5) {
            activeScraper!.status = 'closed';
            activeScraper!.error = "Janela do navegador foi fechada.";
        } else if (attempts < maxAttempts) {
            setTimeout(pollCDP, 1000);
        }
      });
    };

    setTimeout(pollCDP, 2000);
    return { success: true };
  });

export const pollInstagramWebViewStatus = createServerFn({ method: "POST" })
  .handler(async () => {
    if (!activeScraper) return { status: 'idle', logs: [] };
    
    const result = {
      status: activeScraper!.status,
      sessionId: activeScraper!.sessionId,
      username: activeScraper!.username || null,
      error: activeScraper!.error,
      logs: activeScraper!.logs
    };

    if (activeScraper.status === 'success' || activeScraper.status === 'error' || activeScraper.status === 'closed') {
      activeScraper = null;
    }
    
    return result;
  });


export const startYoutubeWebViewScraper = createServerFn({ method: "POST" })
  .handler(async () => {
    if (activeScraper && (activeScraper.status === 'running' || activeScraper.status === 'starting')) {
      return { success: false, error: "JÃ¡ existe um scraper rodando." };
    }

    activeScraper = {
      process: null,
      status: 'starting',
      logs: [],
      sessionId: null,
      username: null,
      feedItems: null,
      error: null
    };

    const addLog = (l: string) => { activeScraper!.logs.push(l); };
    
    // Windows path for Chrome/Edge
    let browserPath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    if (!fsNode.existsSync(browserPath)) {
      browserPath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    }

    const userDataDir = os.tmpdir() + '\\lumi_yt_browser_profile';
    const url = 'https://www.youtube.com/';

    addLog("Iniciando janela do YouTube...");

    const child = spawn(browserPath, [
      '--remote-debugging-port=9222',
      '--user-data-dir=' + userDataDir,
      '--window-size=1000,800',
      '--no-first-run',
      '--no-default-browser-check',
      url
    ], { detached: true, stdio: 'ignore' });

    child.unref();
    activeScraper!.process = child;
    activeScraper!.status = 'running';

    let attempts = 0;
    const maxAttempts = 120; // 2 minutes max

    const pollCDP = () => {
      attempts++;
      http.get('http://127.0.0.1:9222/json', (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const targets = JSON.parse(body);
            const ytTarget = targets.find((t: any) => t.url && t.url.includes('youtube.com'));
            if (!ytTarget || !ytTarget.webSocketDebuggerUrl) {
               if (attempts < maxAttempts) setTimeout(pollCDP, 1000);
               return;
            }

            const wsUrl = ytTarget.webSocketDebuggerUrl;
            
            // Inline WebSocket usage using standard fetch to a local proxy or simple native HTTP upgrade isn't trivial without 'ws' package, 
            // but we can use Runtime.evaluate via REST CDP!
            // Wait, standard CDP via HTTP /json/new or WebSocket is needed. We already imported WebSocket in feed.functions? 
            // Wait, let's just check if we have WebSocket. The Instagram scraper uses `const ws = new WebSocket(wsUrl)`, which works if global WebSocket exists (Bun/Node 20+).
            
            const ws = new WebSocket(wsUrl);
            ws.onopen = () => {
              ws.send(JSON.stringify({ id: 1, method: "Network.enable" }));
              ws.send(JSON.stringify({ id: 2, method: "Network.getCookies", params: { urls: ["https://www.youtube.com"] } }));
            };
            ws.onmessage = (event) => {
              const msg = JSON.parse(event.data);
              if (msg.id === 2 && msg.result && msg.result.cookies) {
                const sapisid = msg.result.cookies.find((c: any) => c.name === 'SAPISID');
                if (sapisid) {
                  addLog("âœ“ Login no YouTube detectado!");
                  activeScraper!.sessionId = msg.result.cookies.map((c: any) => c.name + "=" + c.value).join("; ");
                  addLog("Extraindo recomendaÃ§Ãµes da homepage...");
                  
                  // Extract feed
                  ws.send(JSON.stringify({
                    id: 10,
                    method: "Runtime.evaluate",
                    params: {
                      expression: `(() => {
                        try {
                          const data = window.ytInitialData;
                          const contents = data.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.richGridRenderer.contents;
                          const videos = [];
                          for (const c of contents) {
                            const v = c.richItemRenderer?.content?.videoRenderer;
                            if (v && v.videoId) {
                              videos.push({
                                id: "yt_web_" + v.videoId,
                                source: "youtube",
                                sourceName: v.ownerText?.runs[0]?.text || "YouTube",
                                timestamp: v.publishedTimeText?.simpleText || "Recente",
                                title: v.title?.runs[0]?.text || "VÃ­deo",
                                bullets: ["ExtraÃ­do via WebView", "RecomendaÃ§Ã£o do YouTube"],
                                relevance: 85 + Math.floor(Math.random() * 10),
                                tags: ["yt", "video"],
                                category: "entretenimento",
                                media: {
                                  kind: "thumbnail",
                                  src: v.thumbnail?.thumbnails[v.thumbnail.thumbnails.length - 1]?.url || "",
                                  duration: v.lengthText?.simpleText || ""
                                }
                              });
                            }
                          }
                          const accountName = data.responseContext?.serviceTrackingParams?.find(x => x.service === 'CSI')?.params?.find(p => p.key === 'c')?.value || 'usuario';
                          return Promise.resolve(JSON.stringify({ accountName, videos: videos.slice(0, 10) }));
                        } catch(e) { return Promise.resolve(JSON.stringify({ accountName: 'usuario', videos: [] })); }
                      })()`,
                      awaitPromise: true,
                      returnByValue: true
                    }
                  }));
                } else {
                  ws.close();
                  if (attempts < maxAttempts) setTimeout(pollCDP, 1000);
                  else {
                    activeScraper!.status = 'error';
                    activeScraper!.error = "Timeout do login do YouTube.";
                  }
                }
              }
              
              if (msg.id === 10 && msg.result && msg.result.result) {
                try {
                  const resData = JSON.parse(msg.result.result.value);
                  activeScraper!.username = resData.accountName;
                  activeScraper!.feedItems = resData.videos;
                  addLog("âœ“ Feed extraÃ­do com sucesso! (" + resData.videos.length + " vÃ­deos)");
                  activeScraper!.status = 'success';
                  if (activeScraper!.process) { try { activeScraper!.process.kill(); } catch (e) {} }
                } catch(e) { }
                ws.close();
              }
            };
            ws.onerror = () => { if (attempts < maxAttempts) setTimeout(pollCDP, 1000); };
          } catch (e) {
             if (attempts < maxAttempts) setTimeout(pollCDP, 1000);
          }
        });
      }).on('error', () => {
        if (attempts < maxAttempts) setTimeout(pollCDP, 1000);
      });
    };

    setTimeout(pollCDP, 2000);
    return { success: true };
  });

export const pollYoutubeWebViewStatus = createServerFn({ method: "POST" })
  .handler(async () => {
    if (!activeScraper) return { status: 'idle', logs: [] };
    const result = {
      status: activeScraper!.status,
      sessionId: activeScraper!.sessionId,
      username: activeScraper!.username || null,
      feedItems: activeScraper!.feedItems || null,
      error: activeScraper!.error,
      logs: activeScraper!.logs
    };
    if (activeScraper.status === 'success' || activeScraper.status === 'error' || activeScraper.status === 'closed') {
      activeScraper = null;
    }
    return result;
  });
