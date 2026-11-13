/**
 * Einstieg der App: Router starten. Seiten liegen dateibasiert in src/routes/ (TanStack Router),
 * routeTree.gen.ts erzeugt das Vite-Plugin automatisch – nicht von Hand bearbeiten.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import "./styles.css";

const router = createRouter({ routeTree, defaultPreload: "intent", scrollRestoration: true });

declare module "@tanstack/react-router" {
  interface Register { router: typeof router }
}

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
