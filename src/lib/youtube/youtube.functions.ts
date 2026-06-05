import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const syncYoutubeSubscriptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getSupabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getValidAccessToken, fetchAllSubscriptions, fetchUploadsPlaylistIds } = await import(
      "./api.server"
    );

    const token = await getValidAccessToken(context.userId);
    const subs = await fetchAllSubscriptions(token);
    const channelIds = subs.map((s) => s.snippet.resourceId.channelId);
    const meta = await fetchUploadsPlaylistIds(token, channelIds);

    const admin = getSupabaseAdmin();
    const rows = subs
      .map((s) => {
        const id = s.snippet.resourceId.channelId;
        const m = meta.get(id);
        if (!m) return null;
        return {
          user_id: context.userId,
          channel_id: id,
          title: m.title,
          thumbnail: m.thumbnail,
          source: "subscription" as const,
          uploads_playlist_id: m.uploads,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (rows.length > 0) {
      const { error } = await admin
        .from("youtube_channels")
        .upsert(rows, { onConflict: "user_id,channel_id" });
      if (error) throw error;
    }
    return { added: rows.length };
  });

export const refreshFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getSupabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getValidAccessToken, fetchLatestUploads } = await import("./api.server");

    const admin = getSupabaseAdmin();
    const { data: channels } = await admin
      .from("youtube_channels")
      .select("channel_id, title, uploads_playlist_id")
      .eq("user_id", context.userId);
    if (!channels || channels.length === 0) return { inserted: 0 };

    const token = await getValidAccessToken(context.userId);

    // Fetch user interests for relevance scoring
    const { data: profile } = await admin
      .from("profiles")
      .select("interests")
      .eq("id", context.userId)
      .single();
    const interests = (profile?.interests ?? []).map((s: string) => s.toLowerCase());

    const rows: Array<Record<string, unknown>> = [];
    for (const ch of channels) {
      if (!ch.uploads_playlist_id) continue;
      try {
        const items = await fetchLatestUploads(token, ch.uploads_playlist_id, 8);
        for (const it of items) {
          const s = it.snippet;
          const text = `${s.title} ${s.description}`.toLowerCase();
          const interestMatches = interests.filter((i: string) => text.includes(i)).length;
          const ageHours =
            (Date.now() - new Date(s.publishedAt).getTime()) / (1000 * 60 * 60);
          const recency = Math.max(0, 40 - ageHours / 6);
          const relevance = Math.min(100, 50 + interestMatches * 12 + recency);
          rows.push({
            user_id: context.userId,
            source: "youtube",
            source_name: s.channelTitle,
            external_id: s.resourceId.videoId,
            title: s.title,
            summary: s.description?.slice(0, 280) ?? "",
            url: `https://www.youtube.com/watch?v=${s.resourceId.videoId}`,
            media_kind: "thumbnail",
            media_src:
              s.thumbnails?.high?.url ?? s.thumbnails?.medium?.url ?? "",
            published_at: s.publishedAt,
            relevance_score: Math.round(relevance),
            category: "work",
          });
        }
      } catch (e) {
        console.error("uploads fetch failed", ch.channel_id, e);
      }
    }

    if (rows.length === 0) return { inserted: 0 };
    const { error } = await admin
      .from("feed_items")
      .upsert(rows, { onConflict: "user_id,source,external_id", ignoreDuplicates: true });
    if (error) throw error;
    return { inserted: rows.length };
  });

export const getFeedItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("feed_items")
      .select("*")
      .order("published_at", { ascending: false })
      .limit(60);
    if (error) throw error;
    return { items: data ?? [] };
  });

export const listYoutubeChannels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("youtube_channels")
      .select("*")
      .order("title");
    if (error) throw error;
    return { channels: data ?? [] };
  });

export const removeChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ channelId: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("youtube_channels")
      .delete()
      .eq("channel_id", data.channelId);
    if (error) throw error;
    return { ok: true };
  });

export const addManualChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ query: z.string().min(1).max(200) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { getValidAccessToken, fetchUploadsPlaylistIds } = await import("./api.server");
    const { getSupabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Extract channel ID from URL if given, otherwise treat as handle/id
    let channelId = "";
    const urlMatch = /youtube\.com\/(?:channel\/)?(UC[A-Za-z0-9_-]{20,})/.exec(data.query);
    if (urlMatch) channelId = urlMatch[1];

    const token = await getValidAccessToken(context.userId);

    if (!channelId) {
      // Resolve via search
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=1&q=${encodeURIComponent(data.query)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error("YouTube search failed");
      const json = (await res.json()) as { items: Array<{ snippet: { channelId: string } }> };
      channelId = json.items?.[0]?.snippet?.channelId ?? "";
    }
    if (!channelId) throw new Error("Channel not found");

    const meta = await fetchUploadsPlaylistIds(token, [channelId]);
    const m = meta.get(channelId);
    if (!m) throw new Error("Channel metadata not found");

    const admin = getSupabaseAdmin();
    const { error } = await admin.from("youtube_channels").upsert(
      {
        user_id: context.userId,
        channel_id: channelId,
        title: m.title,
        thumbnail: m.thumbnail,
        source: "manual",
        uploads_playlist_id: m.uploads,
      },
      { onConflict: "user_id,channel_id" },
    );
    if (error) throw error;
    return { channelId, title: m.title };
  });