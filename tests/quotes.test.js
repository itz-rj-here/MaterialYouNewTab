import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../server/app.js";

const app = createApp();

describe("Quotes API", () => {
  it("GET /api/quotes returns a random quote", async () => {
    const res = await request(app).get("/api/quotes");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.quote).toBeDefined();
    expect(res.body.data.author).toBeDefined();
  });

  it("GET /api/quotes?daily=true returns a daily quote", async () => {
    const res = await request(app).get("/api/quotes?daily=true");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.quote).toBeDefined();
  });

  it("GET /api/quotes?random=false returns all quotes array", async () => {
    const res = await request(app).get("/api/quotes?random=false");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
