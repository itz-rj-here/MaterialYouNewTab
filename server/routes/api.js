import { Router } from "express";
import { apiLimiter } from "../middleware/security.js";
import healthRouter from "./health.js";
import suggestionsRouter from "./suggestions.js";
import weatherRouter from "./weather.js";
import quotesRouter from "./quotes.js";
import bookmarksRouter from "./bookmarks.js";
import todosRouter from "./todos.js";

const apiRouter = Router();

// Apply general API rate limiter
apiRouter.use(apiLimiter);

// Mount feature routers
apiRouter.use(healthRouter);
apiRouter.use(suggestionsRouter);
apiRouter.use(weatherRouter);
apiRouter.use(quotesRouter);
apiRouter.use(bookmarksRouter);
apiRouter.use(todosRouter);

export default apiRouter;
