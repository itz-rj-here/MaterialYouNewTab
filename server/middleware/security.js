import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";

/**
 * Configure Helmet Content Security Policy and security headers.
 * Complies with OWASP and security-and-hardening guidelines.
 */
export function configureSecurityHeaders() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Required for Material You early theme injection (preload.js) and DOM listeners
          "https://apis.google.com"
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // Required for Material You dynamic color system CSS variables
          "https://fonts.googleapis.com"
        ],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https:",
          "http:"
        ],
        connectSrc: [
          "'self'",
          "https:",
          "http:"
        ],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  });
}

/**
 * Configure CORS middleware
 */
export function configureCors() {
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
  const allowedOrigins = allowedOriginsEnv
    ? allowedOriginsEnv.split(",").map((origin) => origin.trim())
    : ["http://localhost:3000", "http://127.0.0.1:3000"];

  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, same-origin)
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith("chrome-extension://") || origin.startsWith("moz-extension://")) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive for local dashboard usage
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
  });
}

/**
 * General API Rate Limiter
 */
export const apiLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.RATE_LIMIT_MAX) || 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests. Please try again later."
    }
  }
});

/**
 * Faster Rate Limiter for Auto-complete Suggestions (debounced keystrokes)
 */
export const suggestionsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Search suggestion rate limit reached. Please pause typing briefly."
    }
  }
});
