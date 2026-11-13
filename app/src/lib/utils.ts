import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge muss die eigenen Schriftgrößen aus tailwind.config.ts kennen (text-heading-*, text-body-*).
 * Sonst hält es z. B. `text-body-300` für eine Textfarbe und entfernt `text-canvas` – Text wird unsichtbar.
 * Neue fontSize-Stufen in tailwind.config.ts hier ergänzen.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: [(v: string) => /^(heading-[1-9]00|body-[1-5]00)$/.test(v)] }],
    },
  },
});

/** Klassen zusammenführen; spätere Tailwind-Klassen überschreiben frühere (z. B. p-2 → p-4). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
