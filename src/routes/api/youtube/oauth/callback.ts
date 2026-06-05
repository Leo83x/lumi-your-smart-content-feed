import { createFileRoute } from "@tanstack/react-router";
import {
  decodeIdToken,
  exchangeCodeForTokens,
  getRedirectUri,
} from "@/lib/youtube/oauth.server";
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/youtube/oauth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");

        if (error) {
          return redirectTo(url.origin, `/auth?error=${encodeURIComponent(error)}`);
        }
        if (!code) {
          return redirectTo(url.origin, "/auth?error=missing_code");
        }

        const cookieHeader = request.headers.get("cookie") ?? "";
        const cookieState = /lumi_oauth_state=([^;]+)/.exec(cookieHeader)?.[1];
        if (!state || !cookieState || state !== cookieState) {
          return redirectTo(url.origin, "/auth?error=state_mismatch");
        }

        const clientId = process.env.YOUTUBE_CLIENT_ID;
        const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
          return new Response("YOUTUBE credentials missing", { status: 500 });
        }

        const redirectUri = getRedirectUri(url.origin);
        let tokens;
        try {
          tokens = await exchangeCodeForTokens({
            code,
            clientId,
            clientSecret,
            redirectUri,
          });
        } catch (e) {
          console.error(e);
          return redirectTo(url.origin, "/auth?error=token_exchange_failed");
        }

        if (!tokens.id_token) {
          return redirectTo(url.origin, "/auth?error=missing_id_token");
        }
        const identity = decodeIdToken(tokens.id_token);
        if (!identity.email) {
          return redirectTo(url.origin, "/auth?error=missing_email");
        }

        const admin = getSupabaseAdmin();

        // Find or create the Supabase user
        let userId: string | undefined;
        const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
        const found = existing.users.find((u) => u.email?.toLowerCase() === identity.email.toLowerCase());
        if (found) {
          userId = found.id;
        } else {
          const { data: created, error: createErr } = await admin.auth.admin.createUser({
            email: identity.email,
            email_confirm: true,
            user_metadata: {
              full_name: identity.name,
              avatar_url: identity.picture,
              google_sub: identity.sub,
            },
          });
          if (createErr || !created.user) {
            console.error(createErr);
            return redirectTo(url.origin, "/auth?error=user_create_failed");
          }
          userId = created.user.id;
        }

        // Persist OAuth connection
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
        const { error: upsertErr } = await admin
          .from("oauth_connections")
          .upsert(
            {
              user_id: userId,
              provider: "youtube",
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token ?? null,
              expires_at: expiresAt,
              scope: tokens.scope,
              google_sub: identity.sub,
            },
            { onConflict: "user_id,provider" },
          );
        if (upsertErr) {
          console.error(upsertErr);
        }

        // Ensure profile row exists
        await admin
          .from("profiles")
          .upsert(
            {
              id: userId,
              name: identity.name ?? null,
              google_email: identity.email,
            },
            { onConflict: "id" },
          );

        // Generate a magic link and convert it into tokens we can hand to the browser
        const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
          type: "magiclink",
          email: identity.email,
        });
        if (linkErr || !linkData) {
          console.error(linkErr);
          return redirectTo(url.origin, "/auth?error=session_create_failed");
        }

        const props = linkData.properties as {
          hashed_token?: string;
          email_otp?: string;
        };
        const otp = props.email_otp ?? props.hashed_token;
        if (!otp) {
          return redirectTo(url.origin, "/auth?error=missing_otp");
        }

        // Land on /auth/complete with the OTP; client verifies and sets session.
        const params = new URLSearchParams({
          email: identity.email,
          token: otp,
          next: "/feed",
        });
        return new Response(null, {
          status: 302,
          headers: {
            Location: `${url.origin}/auth/complete?${params.toString()}`,
            "Set-Cookie": "lumi_oauth_state=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax",
          },
        });
      },
    },
  },
});

function redirectTo(origin: string, path: string) {
  return new Response(null, {
    status: 302,
    headers: { Location: `${origin}${path}` },
  });
}