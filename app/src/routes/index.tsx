import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "TAP2 Coach — Anwendungsentwicklung lernen" },
      { name: "description", content: "Dein FIAE-Lernplan mit Python, SQL, KI-Tutor und Wissensgraph." },
      { property: "og:title", content: "TAP2 Coach — Anwendungsentwicklung lernen" },
      { property: "og:description", content: "Dein FIAE-Lernplan mit Python, SQL, KI-Tutor und Wissensgraph." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    throw redirect({ to: data.session ? "/dashboard" : "/auth", replace: true });
  },
});
