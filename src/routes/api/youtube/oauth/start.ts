import { createFileRoute } from "@tanstack/react-router";
import { buildAuthorizeUrl, getRedirectUri } from "@/lib/youtube/oauth.server";

export const Route = createFileRoute("/api/youtube/oauth/start")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const clientId = process.env.YOUTUBE_CLIENT_ID;
        if (!clientId) {
          return new Response("YOUTUBE_CLIENT_ID not configured", { status: 500 });
        }
        const url = new URL(request.url);
        const redirectUri = getRedirectUri(url.origin);
        const state = crypto.randomUUID();
        const authorizeUrl = buildAuthorizeUrl({ clientId, redirectUri, state });
        return new Response(null, {
          status: 302,
          headers: {
            Location: authorizeUrl,
            "Set-Cookie": `lumi_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600; Secure`,
          },
        });
      },
    },
  },
});