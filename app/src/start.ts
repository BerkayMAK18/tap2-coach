import { createStart } from "@tanstack/react-start";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { securityHeaders } from "@/integrations/security-headers";

export const startInstance = createStart(() => ({
  // Server: Sicherheits-Header an jede Antwort hängen.
  requestMiddleware: [securityHeaders],
  // Browser: Supabase-Token an jeden Server-Funktions-Aufruf hängen (sonst Unauthorized).
  functionMiddleware: [attachSupabaseAuth],
}));
