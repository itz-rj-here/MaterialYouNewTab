import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../server/app.js";

const app = createApp();

describe("Health & Version Endpoints", () => {
  it("GET /api/health returns healthy status", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("healthy");
    expect(typeof res.body.data.uptimeSeconds).toBe("number");
    expect(res.body.data.timestamp).toBeDefined();
  });

  it("GET /api/version returns project metadata", async () => {
    const res = await request(app).get("/api/version");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("material-you-new-tab");
    expect(res.body.data.version).toBeDefined();
    expect(res.body.data.nodeVersion).toBeDefined();
  });
});
