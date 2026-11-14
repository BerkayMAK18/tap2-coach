/**
 * Rangliste – wie in der Live-App (Mitmachen, Name ändern, Austragen, XP übertragen) auf derselben Tabelle tap2_lb
 * und mit derselben ID (Prüfsumme des Sync-Schlüssels bzw. Gerätetokens). Gleiche Regeln und Tageslimits wie für alle.
 */
import { createFileRoute } from "@tanstack/react-router";
import { Rangliste } from "@/components/gami/Rangliste";
export const Route = createFileRoute("/rangliste")({ component: Rangliste });
