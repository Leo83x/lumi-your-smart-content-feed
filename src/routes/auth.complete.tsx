import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/complete")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    email: typeof s.email === "string" ? s.email : "",
    token: typeof s.token === "string" ? s.token : "",
    next: typeof s.next === "string" ? s.next : "/feed",
  }),
  component: AuthComplete,
});

function AuthComplete() {
  const { email, token, next } = Route.useSearch();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!email || !token) {
        setError("missing_token");
        return;
      }
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "magiclink",
      });
      if (cancelled) return;
      if (error) {
        setError(error.message);
        return;
      }
      navigate({ to: next as "/feed", replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [email, token, next, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-center space-y-3">
        {error ? (
          <>
            <p className="text-sm text-destructive">Não consegui completar o login: {error}</p>
            <a href="/auth" className="text-xs underline text-muted-foreground">
              Tentar novamente
            </a>
          </>
        ) : (
          <>
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-xs text-muted-foreground">Finalizando login…</p>
          </>
        )}
      </div>
    </div>
  );
}