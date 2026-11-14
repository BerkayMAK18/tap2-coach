/** Bestätigungsdialog: ask() wartet auf die Antwort, ein neuer Dialog bricht den offenen ab. */
import { describe, expect, it } from "vitest";
import { ask, done, useConfirm } from "./ask";

describe("ask", () => {
  it("bestätigt / abgebrochen", async () => {
    const p = ask({ title: "Sitzung schließen?", danger: true });
    expect(useConfirm.getState().q?.title).toBe("Sitzung schließen?");
    done(true); await expect(p).resolves.toBe(true); expect(useConfirm.getState().q).toBeNull();
    const p2 = ask({ title: "x" }); done(false); await expect(p2).resolves.toBe(false);
  });
  it("ein neuer Dialog bricht einen offenen ab", async () => {
    const a = ask({ title: "a" }), b = ask({ title: "b" });
    await expect(a).resolves.toBe(false); expect(useConfirm.getState().q?.title).toBe("b");
    done(true); await expect(b).resolves.toBe(true);
  });
});
