import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import { refreshAccessToken } from "./oauth.server";

const YT = "https://www.googleapis.com/youtube/v3";

export async function getValidAccessToken(userId: string): Promise<string> {
  const admin = getSupabaseAdmin();
  const { data: conn, error } = await admin
    .from("oauth_connections")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .eq("provider", "youtube")
    .single();
  if (error || !conn) throw new Error("YouTube not connected");

  const expiresAt = new Date(conn.expires_at).getTime();
  if (expiresAt - Date.now() > 60_000) return conn.access_token;
  if (!conn.refresh_token) throw new Error("No refresh token");

  const refreshed = await refreshAccessToken({
    refreshToken: conn.refresh_token,
    clientId: process.env.YOUTUBE_CLIENT_ID!,
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET!,
  });
  const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
  await admin
    .from("oauth_connections")
    .update({ access_token: refreshed.access_token, expires_at: newExpiry })
    .eq("user_id", userId)
    .eq("provider", "youtube");
  return refreshed.access_token;
}

async function yt<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${YT}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`YouTube ${path} -> ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

export type YtSubscription = {
  snippet: { resourceId: { channelId: string }; title: string; thumbnails?: { default?: { url: string } } };
};

export async function fetchAllSubscriptions(token: string): Promise<YtSubscription[]> {
  const items: YtSubscription[] = [];
  let pageToken: string | undefined;
  do {
    const url = `/subscriptions?mine=true&part=snippet&maxResults=50${pageToken ? `&pageToken=${pageToken}` : ""}`;
    const page = await yt<{ items: YtSubscription[]; nextPageToken?: string }>(token, url);
    items.push(...(page.items ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken);
  return items;
}

export async function fetchUploadsPlaylistIds(
  token: string,
  channelIds: string[],
): Promise<Map<string, { uploads: string; thumbnail: string; title: string }>> {
  const out = new Map<string, { uploads: string; thumbnail: string; title: string }>();
  for (let i = 0; i < channelIds.length; i += 50) {
    const chunk = channelIds.slice(i, i + 50);
    const res = await yt<{
      items: Array<{
        id: string;
        snippet: { title: string; thumbnails?: { default?: { url: string } } };
        contentDetails: { relatedPlaylists: { uploads: string } };
      }>;
    }>(token, `/channels?part=snippet,contentDetails&id=${chunk.join(",")}`);
    for (const c of res.items) {
      out.set(c.id, {
        uploads: c.contentDetails.relatedPlaylists.uploads,
        thumbnail: c.snippet.thumbnails?.default?.url ?? "",
        title: c.snippet.title,
      });
    }
  }
  return out;
}

export type YtPlaylistItem = {
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    channelTitle: string;
    resourceId: { videoId: string };
    thumbnails?: { medium?: { url: string }; high?: { url: string } };
  };
};

export async function fetchLatestUploads(
  token: string,
  uploadsPlaylistId: string,
  max = 10,
): Promise<YtPlaylistItem[]> {
  const res = await yt<{ items: YtPlaylistItem[] }>(
    token,
    `/playlistItems?part=snippet&maxResults=${max}&playlistId=${uploadsPlaylistId}`,
  );
  return res.items ?? [];
}