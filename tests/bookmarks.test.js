import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../server/app.js";

const app = createApp();

describe("Bookmarks API", () => {
  it("GET /api/bookmarks returns root bookmark tree", async () => {
    const res = await request(app).get("/api/bookmarks");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0].id).toBe("0");
  });

  it("GET /api/bookmarks/recent returns recent bookmarks array", async () => {
    const res = await request(app).get("/api/bookmarks/recent?count=5");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("POST /api/bookmarks creates a bookmark and validates title", async () => {
    // Missing title should fail
    const failRes = await request(app).post("/api/bookmarks").send({});
    expect(failRes.status).toBe(400);
    expect(failRes.body.success).toBe(false);

    // Valid create
    const successRes = await request(app)
      .post("/api/bookmarks")
      .send({ title: "Test Bookmark", url: "https://example.com" });
    expect(successRes.status).toBe(201);
    expect(successRes.body.success).toBe(true);
    expect(successRes.body.data.title).toBe("Test Bookmark");
    expect(successRes.body.data.url).toBe("https://example.com");

    const createdId = successRes.body.data.id;

    // Update the bookmark
    const updateRes = await request(app)
      .put(`/api/bookmarks/${createdId}`)
      .send({ title: "Updated Test Bookmark" });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.title).toBe("Updated Test Bookmark");

    // Delete the bookmark
    const deleteRes = await request(app).delete(`/api/bookmarks/${createdId}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);
  });
});
