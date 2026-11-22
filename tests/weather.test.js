import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../server/app.js";

const app = createApp();

describe("Weather API", () => {
  it("GET /api/weather with coordinates returns formatted weather data", async () => {
    const res = await request(app).get("/api/weather?lat=51.5074&lon=-0.1278");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.current).toBeDefined();
    expect(res.body.data.current.temp_c).toBeDefined();
    expect(res.body.data.current.condition).toBeDefined();
    expect(res.body.data.location).toBeDefined();
  }, 10000);

  it("GET /api/weather with city name resolves coordinates", async () => {
    const res = await request(app).get("/api/weather?loc=Tokyo");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.current).toBeDefined();
  }, 10000);
});
