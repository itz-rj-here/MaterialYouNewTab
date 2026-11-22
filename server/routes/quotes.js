import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Load quotes data
const quotesFilePath = path.resolve(__dirname, "../data/quotes.json");
let quotes = [];
try {
  quotes = JSON.parse(fs.readFileSync(quotesFilePath, "utf-8"));
} catch (e) {
  quotes = [
    { id: 1, quote: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci", category: "design" }
  ];
}

/**
 * Get quotes
 * GET /api/quotes
 * Optional query: ?random=true, ?category=design, ?daily=true
 */
router.get("/quotes", (req, res) => {
  const { random, category, daily } = req.query;

  let pool = quotes;
  if (category) {
    const filtered = quotes.filter((q) => q.category.toLowerCase() === String(category).toLowerCase());
    if (filtered.length > 0) pool = filtered;
  }

  if (daily === "true") {
    // Deterministic daily quote based on day of year
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const dailyQuote = pool[dayOfYear % pool.length];
    return res.json({ success: true, data: dailyQuote });
  }

  if (random !== "false") {
    const randomIndex = Math.floor(Math.random() * pool.length);
    return res.json({ success: true, data: pool[randomIndex] });
  }

  res.json({ success: true, data: pool });
});

export default router;
