import express from "express";
import path from "path";
import compression from "compression";
import { fileURLToPath } from "url";
import { configureSecurityHeaders, configureCors } from "./middleware/security.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import apiRouter from "./routes/api.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

export function createApp() {
  const app = express();

  // 1. Security headers & CORS
  app.use(configureSecurityHeaders());
  app.use(configureCors());

  // 2. High-performance compression (Gzip / Brotli)
  app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) return false;
      return compression.filter(req, res);
    }
  }));

  // 3. Body parsers
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  // 4. API Routes
  app.use("/api", apiRouter);

  // 5. Static Assets with optimized caching
  const staticCacheOptions = {
    maxAge: process.env.NODE_ENV === "production" ? "7d" : "0",
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      // Long-term immutable caching for static fonts and svgs
      if (filePath.endsWith(".ttf") || filePath.endsWith(".woff2") || filePath.endsWith(".png") || filePath.endsWith(".svg")) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    }
  };

  app.use(express.static(rootDir, staticCacheOptions));

  // 6. Root route serves index.html explicitly
  app.get("/", (req, res) => {
    res.sendFile(path.join(rootDir, "index.html"));
  });

  // 7. 404 for unhandled /api calls
  app.use("/api/*", notFoundHandler);

  // 8. Centralized error handler
  app.use(errorHandler);

  return app;
}

export default createApp;
