import { describe, expect, it } from "vitest";
import { resolveSeedSecrets, SeedGuardError } from "../../prisma/seed-guard";

const PW_A = "a-long-admin-password";
const PW_B = "a-long-analyst-password";

describe("resolveSeedSecrets", () => {
  it("uses legacy local defaults when EA_DATA_CLASSIFICATION is unset", () => {
    const s = resolveSeedSecrets({});
    expect(s.guarded).toBe(false);
    expect(s.adminPassword).toBe("admin12345");
    expect(s.analystPassword).toBe("analyst12345");
    expect(s.producerSecret("web-portal")).toBe("web-portal-demo-secret");
  });

  it("local mode still honours env overrides", () => {
    const s = resolveSeedSecrets({
      SEED_ADMIN_PASSWORD: PW_A,
      SEED_PRODUCER_SECRET_WEB_PORTAL: "x",
    });
    expect(s.adminPassword).toBe(PW_A);
    expect(s.producerSecret("web-portal")).toBe("x");
  });

  it("refuses any classification other than synthetic", () => {
    for (const v of ["production", "real", "Synthetic"]) {
      expect(() =>
        resolveSeedSecrets({
          EA_DATA_CLASSIFICATION: v,
          SEED_ADMIN_PASSWORD: PW_A,
          SEED_ANALYST_PASSWORD: PW_B,
        }),
      ).toThrow(SeedGuardError);
    }
  });

  it("requires both passwords in synthetic mode", () => {
    expect(() =>
      resolveSeedSecrets({ EA_DATA_CLASSIFICATION: "synthetic" }),
    ).toThrow(/required/);
    expect(() =>
      resolveSeedSecrets({
        EA_DATA_CLASSIFICATION: "synthetic",
        SEED_ADMIN_PASSWORD: PW_A,
      }),
    ).toThrow(/required/);
  });

  it("rejects short passwords in synthetic mode", () => {
    expect(() =>
      resolveSeedSecrets({
        EA_DATA_CLASSIFICATION: "synthetic",
        SEED_ADMIN_PASSWORD: "short",
        SEED_ANALYST_PASSWORD: PW_B,
      }),
    ).toThrow(/at least/);
  });

  it("accepts synthetic mode with env passwords and random producer secrets", () => {
    const s = resolveSeedSecrets({
      EA_DATA_CLASSIFICATION: "synthetic",
      SEED_ADMIN_PASSWORD: PW_A,
      SEED_ANALYST_PASSWORD: PW_B,
    });
    expect(s.guarded).toBe(true);
    expect(s.adminPassword).toBe(PW_A);
    const p1 = s.producerSecret("web-portal");
    expect(p1).toMatch(/^[0-9a-f]{64}$/);
    expect(s.producerSecret("web-portal")).not.toBe(p1);
  });

  it("synthetic mode uses a supplied producer secret", () => {
    const s = resolveSeedSecrets({
      EA_DATA_CLASSIFICATION: "synthetic",
      SEED_ADMIN_PASSWORD: PW_A,
      SEED_ANALYST_PASSWORD: PW_B,
      SEED_PRODUCER_SECRET_MOBILE_APP: "given",
    });
    expect(s.producerSecret("mobile-app")).toBe("given");
  });
});
