import { Router } from "express";
import { suggestionsLimiter } from "../middleware/security.js";

const router = Router();

// Allowlist of search suggestion target APIs for SSRF protection
const TARGET_APIS = {
  engine0: (q) => `https://duckduckgo.com/ac/?q=${encodeURIComponent(q)}&type=list`,
  engine1: (q, client = "chrome") => `https://www.google.com/complete/search?client=${encodeURIComponent(client)}&q=${encodeURIComponent(q)}`,
  engine2: (q) => `https://duckduckgo.com/ac/?q=${encodeURIComponent(q)}&type=list`,
  engine4: (q) => `https://search.brave.com/api/suggest?q=${encodeURIComponent(q)}&rich=true&source=web`,
  engine5: (q, client = "chrome") => `https://www.google.com/complete/search?client=${encodeURIComponent(client)}&ds=yt&q=${encodeURIComponent(q)}`,
  engine7: (q) => `https://www.reddit.com/search.json?q=${encodeURIComponent(q)}&sort=relevance&limit=15`,
  engine8: (q, lang = "en") => `https://${encodeURIComponent(lang)}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&format=json`
};

// Aliases
const ENGINE_ALIASES = {
  duckduckgo: "engine0",
  google: "engine1",
  brave: "engine4",
  youtube: "engine5",
  reddit: "engine7",
  wikipedia: "engine8"
};

/**
 * Auto-complete Search Suggestions Proxy
 * GET /api/suggestions?q=query&engine=engine1&lang=en
 * 
 * Provides server-side proxying so search suggestions work on the web
 * without hitting CORS blocks.
 */
router.get("/suggestions", suggestionsLimiter, async (req, res, next) => {
  try {
    const rawQuery = req.query.q || "";
    const q = String(rawQuery).trim().slice(0, 120); // Sanitize and cap length

    if (!q) {
      return res.json({ success: true, data: [] });
    }

    let engine = String(req.query.engine || "engine1").toLowerCase();
    if (ENGINE_ALIASES[engine]) {
      engine = ENGINE_ALIASES[engine];
    }

    const lang = String(req.query.lang || "en").replace(/[^a-zA-Z_-]/g, "").slice(0, 5) || "en";
    const client = String(req.query.client || "chrome").replace(/[^a-zA-Z0-9]/g, "").slice(0, 10) || "chrome";

    const apiBuilder = TARGET_APIS[engine] || TARGET_APIS.engine1;
    const targetUrl = engine === "engine8" ? apiBuilder(q, lang) : apiBuilder(q, client);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500); // 3.5s timeout

    const upstreamResponse = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*"
      }
    });

    clearTimeout(timeout);

    if (!upstreamResponse.ok) {
      return res.json({ success: true, data: [] });
    }

    const data = await upstreamResponse.json();
    let suggestions = [];

    if (engine === "engine4") { // Brave
      if (Array.isArray(data[1])) {
        suggestions = data[1].map((item) => {
          if (item && item.is_entity) {
            return `${item.q} - ${item.name} (${item.category ? item.category : "No category"})`;
          }
          return typeof item === "string" ? item : item.q;
        });
      }
    } else if (engine === "engine7") { // Reddit
      if (data?.data?.children && Array.isArray(data.data.children)) {
        data.data.children.forEach((post) => {
          if (post.data && post.data.title) {
            const subreddit = post.data.subreddit_name_prefixed || "";
            suggestions.push(subreddit ? `${post.data.title} (${subreddit})` : post.data.title);
          }
        });
      }
    } else if (Array.isArray(data) && Array.isArray(data[1])) {
      // Standard OpenSearch format (Google, DuckDuckGo, Wikipedia)
      suggestions = data[1].filter((item) => typeof item === "string");
    } else if (Array.isArray(data)) {
      suggestions = data.filter((item) => typeof item === "string");
    }

    return res.json({
      success: true,
      data: suggestions.slice(0, 10)
    });
  } catch (error) {
    if (error.name === "AbortError") {
      return res.json({ success: true, data: [] });
    }
    next(error);
  }
});

export default router;
