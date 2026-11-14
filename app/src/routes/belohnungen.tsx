/** Belohnungen (XP, Level, Quests, Login-Kalender, Schatzkammer, Garderobe, Titel) – 1:1 wie in der Live-App. */
import { createFileRoute } from "@tanstack/react-router";
import { Belohnungen } from "@/components/gami/Belohnungen";
export const Route = createFileRoute("/belohnungen")({ component: Belohnungen });
