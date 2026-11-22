import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();
const todosFile = path.resolve(__dirname, "../../data/todos.json");

function ensureDataDir() {
  const dir = path.dirname(todosFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadTodos() {
  ensureDataDir();
  if (fs.existsSync(todosFile)) {
    try {
      return JSON.parse(fs.readFileSync(todosFile, "utf-8"));
    } catch (e) {
      console.warn("Corrupt todos.json, resetting to empty list.", e.message);
    }
  }
  return [];
}

function saveTodos(todos) {
  ensureDataDir();
  fs.writeFileSync(todosFile, JSON.stringify(todos, null, 2), "utf-8");
}

/**
 * GET /api/todos
 * Fetch saved todos
 */
router.get("/todos", (req, res) => {
  const todos = loadTodos();
  res.json({ success: true, data: todos });
});

/**
 * POST /api/todos
 * Sync / replace todos list
 */
router.post("/todos", (req, res) => {
  const { todos } = req.body;
  if (!Array.isArray(todos)) {
    return res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Expected 'todos' array in request body." }
    });
  }

  saveTodos(todos);
  res.json({ success: true, data: todos });
});

export default router;
