import { afterEach, describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { config } from "../../src/config";
import {
  clearSessionCookie,
  setSessionCookie,
} from "../../src/auth/session-cookie";

function app(): express.Express {
  const a = express();
  a.get("/set", (_req, res) => {
    setSessionCookie(res, "abc", 60_000);
    res.end();
  });
  a.get("/clear", (_req, res) => {
    clearSessionCookie(res);
    res.end();
  });
  return a;
}

const original = {
  secure: config.cookieSecure,
  name: config.sessionCookieName,
};
afterEach(() => {
  config.cookieSecure = original.secure;
  config.sessionCookieName = original.name;
});

function cookie(res: request.Response): string {
  const header = res.headers["set-cookie"] as unknown as string[];
  return header[0]!;
}

describe("session cookie", () => {
  it("is not Secure by default (local http)", async () => {
    const c = cookie(await request(app()).get("/set"));
    expect(c).toContain("HttpOnly");
    expect(c).toContain("SameSite=Lax");
    expect(c).toContain("Path=/");
    expect(c).not.toContain("Secure");
  });

  it("sets Secure; HttpOnly; SameSite=Lax; Path=/ when COOKIE_SECURE is on", async () => {
    config.cookieSecure = true;
    config.sessionCookieName = "__Host-ea_sid";
    const c = cookie(await request(app()).get("/set"));
    expect(c.startsWith("__Host-ea_sid=abc")).toBe(true);
    expect(c).toContain("; Secure");
    expect(c).toContain("HttpOnly");
    expect(c).toContain("SameSite=Lax");
    expect(c).toContain("Path=/");
    expect(c).not.toContain("Domain");
  });

  it("clears with the same attributes so a Secure cookie is removed", async () => {
    config.cookieSecure = true;
    config.sessionCookieName = "__Host-ea_sid";
    const c = cookie(await request(app()).get("/clear"));
    expect(c.startsWith("__Host-ea_sid=;")).toBe(true);
    expect(c).toContain("Expires=Thu, 01 Jan 1970");
    expect(c).toContain("; Secure");
    expect(c).toContain("HttpOnly");
    expect(c).toContain("SameSite=Lax");
    expect(c).toContain("Path=/");
  });
});
