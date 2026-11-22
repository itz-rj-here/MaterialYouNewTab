import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Read package.json metadata
let pkg = { name: "material-you-new-tab", version: "3.3.1121" };
try {
  const pkgPath = path.resolve(__dirname, "../../package.json");
  pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
} catch (e) {
  // Use fallback values if package.json read fails
}

/**
 * Health check endpoint
 * GET /api/health
 */
router.get("/health", (req, res) => {
  res.json({
    success: true,
    data: {
      status: "healthy",
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development"
    }
  });
});

/**
 * Version info endpoint
 * GET /api/version
 */
router.get("/version", (req, res) => {
  res.json({
    success: true,
    data: {
      name: pkg.name,
      version: pkg.version,
      description: pkg.description,
      nodeVersion: process.version
    }
  });
});

export default router;
