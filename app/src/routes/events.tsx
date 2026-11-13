/** Platzhalter, bis „Events“ aus der Live-App portiert ist (docs/PORTIERUNG.md). */
import { createFileRoute } from "@tanstack/react-router";
import { Pending } from "@/ui-main/Pending";
export const Route = createFileRoute("/events")({ component: () => <Pending title="Events" /> });
