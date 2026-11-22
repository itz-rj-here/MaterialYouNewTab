import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../server/app.js";

const app = createApp();

describe("Security & Error Handling Middleware", () => {
  it("includes security headers on responses", async () => {
    const res = await request(app).get("/api/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["content-security-policy"]).toBeDefined();
  });

  it("returns structured 404 error for non-existent API endpoints", async () => {
    const res = await request(app).get("/api/non-existent-endpoint");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("ROUTE_NOT_FOUND");
    expect(res.body.error.message).toBeDefined();
  });

  it("serves index.html with 200 OK at root", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.text).toContain("<!DOCTYPE html>");
    expect(res.text).toContain("New Tab");
  });
});
