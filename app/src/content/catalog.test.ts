/**
 * Prüft die exportierten Kataloge: Format (Zod), eindeutige IDs, gültige Themen, ID-Schema wie in der Live-App.
 * Schlägt dieser Test fehl, darf der Export nicht in die App – sonst könnten Lernstände verloren gehen.
 */
import { describe, expect, it } from "vitest";
import tap2 from "./generated/tap2.json";
import index from "./generated/index.json";
import lf11a from "./generated/event-lf11a.json";
import wpf from "./generated/event-wpf.json";
import { CatalogIndex, EventCatalog, Tap2Catalog } from "./schema";

describe("Kataloge", () => {
  const core = Tap2Catalog.parse(tap2);
  const events = [lf11a, wpf].map((e) => EventCatalog.parse(e));

  it("haben ein gültiges Format", () => {
    expect(CatalogIndex.parse(index).kataloge.length).toBe(1 + events.length);
  });

  it("nutzen die IDs der Live-App", () => {
    const mc = core.questions.filter((q) => q.type === "mc");
    const cards = core.questions.filter((q) => q.type === "card");
    mc.forEach((q, i) => expect(q.id).toBe("m" + i));
    expect(cards[0].id).toBe("k:" + cards[0].deck + "0"); // Karten zählen ab 0 je Deck
    core.open.forEach((o, i) => expect(o.id).toBe("o" + i));
    events.forEach((e) => e.kapitel.forEach((k) => k.items.forEach((q) => expect(q.id.startsWith(`ev:${e.id}:`)).toBe(true))));
  });

  it("haben eindeutige IDs über alle Kataloge", () => {
    const ids = [...core.questions.map((q) => q.id), ...events.flatMap((e) => e.kapitel.flatMap((k) => k.items.map((q) => q.id)))];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ordnen jede Frage einem bekannten Thema zu", () => {
    const topics = new Set(core.topics.map((t) => t.id));
    core.questions.forEach((q) => expect(topics.has(q.topic), q.id).toBe(true));
  });

  it("haben bei Auswahlfragen eine gültige richtige Antwort", () => {
    [...core.questions, ...events.flatMap((e) => e.kapitel.flatMap((k) => k.items))].forEach((q) => {
      if (q.type === "mc") expect(q.right, q.id).toBeLessThan(q.opts.length);
    });
  });

  it("WPF ist deaktiviert, LF11a aktiv", () => {
    expect(events.find((e) => e.id === "wpf")?.enabled).toBe(false);
    expect(events.find((e) => e.id === "lf11a")?.enabled).toBe(true);
  });
});
