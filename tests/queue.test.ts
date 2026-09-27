import { describe, expect, it } from "vitest";
import { isTemporaryMetaFailure } from "@/lib/queue/campaign-queue";
describe("retry", () => { it("repete 429 e 5xx", () => { expect(isTemporaryMetaFailure(429)).toBe(true); expect(isTemporaryMetaFailure(503)).toBe(true); }); it("não repete erro permanente 400", () => expect(isTemporaryMetaFailure(400, 131026)).toBe(false)); });
