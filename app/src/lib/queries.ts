import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const sessionsQuery = () =>
  queryOptions({
    queryKey: ["sessions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("learning_sessions").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const sessionQuery = (id: string) =>
  queryOptions({
    queryKey: ["session", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("learning_sessions").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

export const messagesQuery = (id: string) =>
  queryOptions({
    queryKey: ["messages", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("session_messages").select("*").eq("session_id", id).order("created_at", { ascending: true });
      if (error) throw error;
      const paths = data.flatMap((m) => [
        ...((m.images as string[]) ?? []),
        ...(((m.attachments as { path: string; type: string }[]) ?? []).filter((a) => a.type.startsWith("image/")).map((a) => a.path)),
      ]);
      const urls: Record<string, string> = {};
      if (paths.length) {
        const { data: signed } = await supabase.storage.from("attachments").createSignedUrls(paths, 3600);
        for (const s of signed ?? []) if (s.path && s.signedUrl) urls[s.path] = s.signedUrl;
      }
      return { messages: data, urls };
    },
  });

export const graphQuery = () =>
  queryOptions({
    queryKey: ["graph"],
    queryFn: async () => {
      const [p, l] = await Promise.all([
        supabase.from("propositions").select("*").order("created_at", { ascending: true }),
        supabase.from("proposition_links").select("*"),
      ]);
      if (p.error) throw p.error;
      if (l.error) throw l.error;
      return { props: p.data, links: l.data };
    },
  });
