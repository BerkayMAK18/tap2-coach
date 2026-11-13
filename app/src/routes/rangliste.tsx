/**
 * Rangliste – Original-Ansicht der Live-App (Mitmachen, Name ändern, Austragen, XP übertragen) auf derselben Tabelle
 * tap2_lb und mit derselben ID (Prüfsumme des Sync-Schlüssels). Gleiche Regeln und Tageslimits wie für alle.
 */
import { createFileRoute } from "@tanstack/react-router";
import { LegacyView } from "@/components/LegacyView";
export const Route = createFileRoute("/rangliste")({ component: () => <LegacyView fn="rangView" /> });
