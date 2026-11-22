import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../server/app.js";

const app = createApp();

describe("Search Suggestions API", () => {
  it("returns empty array when query is empty", async () => {
    const res = await request(app).get("/api/suggestions?q=");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  it("returns suggestions for a standard query", async () => {
    const res = await request(app).get("/api/suggestions?q=github&engine=engine1");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("handles alternative engines safely (duckduckgo)", async () => {
    const res = await request(app).get("/api/suggestions?q=react&engine=engine0");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("handles unknown engine safely by falling back to default", async () => {
    const res = await request(app).get("/api/suggestions?q=test&engine=unknownEngine99");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
