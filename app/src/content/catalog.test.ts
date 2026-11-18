/**
 * Prüft die exportierten Kataloge: Format (Zod), eindeutige IDs, gültige Themen, ID-Schema wie in der Live-App.
 * Schlägt dieser Test fehl, darf der Export nicht in die App – sonst könnten Lernstände verloren gehen.
 */
import { describe, expect, it } from "vitest";
import tap2 from "./generated/tap2.json";
import index from "./generated/index.json";
import lf11a from "./generated/event-lf11a.json";
import wpf from "./generated/event-wpf.json";
import fisi from "./fisi.json";
import { CatalogIndex, EventCatalog, Tap2Catalog } from "./schema";
import { allQ, catalogFor, FISI, NORMALIZE_CTX, topicsFor } from "./catalog";
import { blank, normalize } from "@/lib/state";

describe("Kataloge", () => {
  const core = Tap2Catalog.parse(tap2);
  const rawSystemIntegration = Tap2Catalog.parse(fisi);
  const systemIntegration = Tap2Catalog.parse(FISI);
  const events = [lf11a, wpf].map((e) => EventCatalog.parse(e));

  it("haben ein gültiges Format", () => {
    expect(CatalogIndex.parse(index).kataloge.length).toBe(1 + events.length);
    expect(systemIntegration.id).toBe("tap2-fisi");
  });

  it("FISI-Fragen verwenden eigene, eindeutige IDs und bekannte Themen", () => {
    const existing = new Set(core.questions.map((q) => q.id));
    const topics = new Set(systemIntegration.topics.map((t) => t.id));
    expect(rawSystemIntegration.questions).toHaveLength(24);
    expect(systemIntegration.questions.length).toBeGreaterThanOrEqual(400);
    systemIntegration.questions.forEach((q) => {
      expect(q.id.startsWith("fisi:")).toBe(true);
      expect(existing.has(q.id), q.id).toBe(false);
      expect(topics.has(q.topic), q.id).toBe(true);
    });
    expect(new Set(systemIntegration.topics.map((topic) => topic.teil))).toEqual(new Set(["Teil 2", "SoWi"]));
    expect(systemIntegration.questions.filter((q) => q.topic === "si-sicherheit")).toHaveLength(26);
    expect(systemIntegration.questions.filter((q) => q.topic === "si-betrieb")).toHaveLength(26);
  });

  it("CIDR-Fragen rechnen mit korrekten Netz- und Hostwerten", () => {
    const hostCount = systemIntegration.questions.find((q) => q.id === "fisi:mc:cidr-host-01");
    const network = systemIntegration.questions.find((q) => q.id === "fisi:mc:cidr-network-01");
    expect(hostCount?.type === "mc" && hostCount.opts[hostCount.right]).toBe("254");
    expect(network?.type === "mc" && network.opts[network.right]).toBe("10.12.34.0");
    expect(systemIntegration.questions.filter((q) => q.topic === "si-adressierung")).toHaveLength(222);
  });

  it("wechselt Katalogdaten, ohne den FIAE-Standard zu verändern", () => {
    expect(catalogFor().id).toBe("tap2-fiae");
    expect(catalogFor("fisi").id).toBe("tap2-fisi");
    expect(topicsFor("fisi").every((t) => t.id.startsWith("si-"))).toBe(true);
    expect(allQ(blank()).map((q) => q.id)).toEqual(core.questions.map((q) => q.id));
    expect(allQ(blank(), "fisi").map((q) => q.id)).toEqual(systemIntegration.questions.map((q) => q.id));
    expect(normalize({ v: 7, custom: { "si-netzwerk": [{ id: "c1731000000002", f: "Frage", b: "Antwort" }] } }, NORMALIZE_CTX).custom["si-netzwerk"]).toHaveLength(1);
    systemIntegration.topics.forEach((topic) => expect(core.icons[topic.ic ?? ""], topic.id).toBeTruthy());
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
    const ids = [...core.questions.map((q) => q.id), ...systemIntegration.questions.map((q) => q.id), ...events.flatMap((e) => e.kapitel.flatMap((k) => k.items.map((q) => q.id)))];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ordnen jede Frage einem bekannten Thema zu", () => {
    const topics = new Set(core.topics.map((t) => t.id));
    core.questions.forEach((q) => expect(topics.has(q.topic), q.id).toBe(true));
  });

  it("haben bei Auswahlfragen eine gültige richtige Antwort", () => {
    [...core.questions, ...systemIntegration.questions, ...events.flatMap((e) => e.kapitel.flatMap((k) => k.items))].forEach((q) => {
      if (q.type === "mc") {
        expect(q.right, q.id).toBeGreaterThanOrEqual(0);
        expect(q.right, q.id).toBeLessThan(q.opts.length);
        expect(new Set(q.opts).size, q.id).toBe(q.opts.length);
      }
    });
  });

  it("SQL- und Code-Karten verweisen auf vorhandene Karten, Notationshilfen existieren", () => {
    const ids = new Set(core.questions.map((q) => q.id));
    Object.keys(core.codeLang).forEach((id) => expect(ids.has(id), id).toBe(true));
    Object.keys(core.sqlDb.cards).forEach((id) => expect(core.codeLang[id], id).toBe("sql"));
    expect(core.sqlDb.tables.map((t) => t[0])).toEqual(["Kunde", "Artikel", "Bestellung", "Position", "Mitarbeiter", "Konto"]);
    core.pakete.forEach((p) => { if (p.svg) expect(core.notation[p.svg], p.id).toBeTruthy(); });
  });

  it("WPF ist deaktiviert, LF11a aktiv", () => {
    expect(events.find((e) => e.id === "wpf")?.enabled).toBe(false);
    expect(events.find((e) => e.id === "lf11a")?.enabled).toBe(true);
  });
});
