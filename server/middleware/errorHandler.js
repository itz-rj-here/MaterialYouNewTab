/**
 * Centralized error handler adhering to api-and-interface-design
 * Produces consistent structured error responses:
 * {
 *   success: false,
 *   error: {
 *     code: string,
 *     message: string,
 *     details?: unknown
 *   }
 * }
 */
export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
  const isDev = process.env.NODE_ENV !== "production";

  // Log error internally (without leaking secrets)
  if (statusCode >= 500) {
    console.error(`[Server Error] ${req.method} ${req.url}:`, err.message);
    if (isDev && err.stack) {
      console.error(err.stack);
    }
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || (statusCode === 404 ? "NOT_FOUND" : statusCode === 400 ? "BAD_REQUEST" : "INTERNAL_ERROR"),
      message: err.message || "An unexpected error occurred on the server.",
      ...(isDev && err.details ? { details: err.details } : {})
    }
  });
}

/**
 * 404 handler for API routes
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: "ROUTE_NOT_FOUND",
      message: `The endpoint ${req.method} ${req.originalUrl} does not exist.`
    }
  });
}
