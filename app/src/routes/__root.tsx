import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, HeadContent, Scripts, useRouter } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster, TooltipProvider } from "@/ui";
import { supabase } from "@/integrations/supabase/client";
import appCss from "../styles.css?url";
import katexCss from "katex/dist/katex.min.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "TAP2 Coach — Prüfungsvorbereitung FIAE" },
      { name: "description", content: "Lernapp für die IHK-Prüfung Fachinformatiker/in Anwendungsentwicklung: Lernrunden, Kataloge, KI-Tutor." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: katexCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" }, // Icon der Live-App (Rabe)
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

// Keep this root providers-only: canvas preview routes render inside it.
function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('tap-theme');
  }, []);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      // Only react to real sign-out; SIGNED_IN also fires on every tab refocus and caused reload loops.
      if (event !== "SIGNED_OUT") return;
      queryClient.clear();
      router.invalidate();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster>
          <Outlet />
        </Toaster>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
