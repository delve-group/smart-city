import { describe, expect, it } from "vitest";
import { heatWeight } from "./heat-weight";

describe("heatWeight", () => {
  it("uses a default weight when attendance is unknown", () => {
    expect(heatWeight({})).toBe(0.2);
  });

  it("clamps to the 0.1–1 range", () => {
    expect(heatWeight({ attendance: 0 })).toBe(0.1);
    expect(heatWeight({ attendance: 10_000 })).toBe(1);
    expect(heatWeight({ attendance: 1_000_000 })).toBe(1);
  });

  it("grows with attendance", () => {
    expect(heatWeight({ attendance: 100 })).toBeLessThan(heatWeight({ attendance: 1_000 }));
  });
});
