/** Belohnungen (XP, Level, Quests, Login-Kalender, Schatzkammer, Garderobe, Titel) – Original-Modul der Live-App. */
import { createFileRoute } from "@tanstack/react-router";
import { LegacyView } from "@/components/LegacyView";
export const Route = createFileRoute("/belohnungen")({ component: () => <LegacyView fn="view" /> });
