import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();
const bookmarksFile = path.resolve(__dirname, "../../data/bookmarks.json");
const defaultBookmarksFile = path.resolve(__dirname, "../data/default-bookmarks.json");

// Ensure data directory exists
function ensureDataDir() {
  const dir = path.dirname(bookmarksFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Load bookmarks tree
function loadBookmarks() {
  ensureDataDir();
  if (fs.existsSync(bookmarksFile)) {
    try {
      return JSON.parse(fs.readFileSync(bookmarksFile, "utf-8"));
    } catch (e) {
      console.warn("Corrupt bookmarks.json, restoring default.", e.message);
    }
  }

  // Fallback to default bookmarks
  let defaultData = [];
  try {
    defaultData = JSON.parse(fs.readFileSync(defaultBookmarksFile, "utf-8"));
  } catch (e) {
    defaultData = [
      {
        id: "0",
        title: "root",
        children: [
          { id: "1", title: "Bookmarks bar", children: [] },
          { id: "2", title: "Other bookmarks", children: [] }
        ]
      }
    ];
  }
  fs.writeFileSync(bookmarksFile, JSON.stringify(defaultData, null, 2), "utf-8");
  return defaultData;
}

// Save bookmarks tree
function saveBookmarks(tree) {
  ensureDataDir();
  fs.writeFileSync(bookmarksFile, JSON.stringify(tree, null, 2), "utf-8");
}

// Helper: recursive finder
function findNode(nodes, id) {
  for (const node of nodes) {
    if (String(node.id) === String(id)) return node;
    if (node.children) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

// Helper: recursive finder with parent & index
function findNodeWithParent(nodes, id, parent = null) {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (String(node.id) === String(id)) {
      return { node, parent, index: i, siblings: nodes };
    }
    if (node.children) {
      const found = findNodeWithParent(node.children, id, node);
      if (found) return found;
    }
  }
  return null;
}

// Helper: collect all bookmarks
function flattenBookmarks(nodes, result = []) {
  for (const node of nodes) {
    if (node.url) {
      result.push(node);
    }
    if (node.children) {
      flattenBookmarks(node.children, result);
    }
  }
  return result;
}

/**
 * GET /api/bookmarks
 * Returns full tree matching browser.bookmarks.getTree()
 */
router.get("/bookmarks", (req, res) => {
  const tree = loadBookmarks();
  res.json({ success: true, data: tree });
});

/**
 * GET /api/bookmarks/recent?count=8
 * Returns recent bookmarks
 */
router.get("/bookmarks/recent", (req, res) => {
  const count = Math.min(Math.max(Number(req.query.count) || 8, 1), 30);
  const tree = loadBookmarks();
  const allBookmarks = flattenBookmarks(tree);
  allBookmarks.sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
  res.json({ success: true, data: allBookmarks.slice(0, count) });
});

/**
 * POST /api/bookmarks
 * Create bookmark or folder
 * Body: { parentId, title, url, index? }
 */
router.post("/bookmarks", (req, res) => {
  const { parentId, title, url, index } = req.body;
  if (!title) {
    return res.status(400).json({ success: false, error: { code: "VALIDATION_ERROR", message: "Title is required" } });
  }

  const tree = loadBookmarks();
  const targetParent = parentId ? findNode(tree, parentId) : (tree[0]?.children?.[0] || tree[0]);

  if (!targetParent || !targetParent.children) {
    return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Parent folder not found" } });
  }

  const newNode = {
    id: String(Date.now()),
    parentId: String(targetParent.id),
    title: String(title).trim(),
    dateAdded: Date.now()
  };

  if (url) {
    newNode.url = String(url).trim();
  } else {
    newNode.children = [];
  }

  if (typeof index === "number" && index >= 0 && index <= targetParent.children.length) {
    targetParent.children.splice(index, 0, newNode);
  } else {
    targetParent.children.push(newNode);
  }

  saveBookmarks(tree);
  res.status(201).json({ success: true, data: newNode });
});

/**
 * PUT /api/bookmarks/:id
 * Update title and/or URL
 */
router.put("/bookmarks/:id", (req, res) => {
  const { id } = req.params;
  const { title, url } = req.body;

  const tree = loadBookmarks();
  const found = findNode(tree, id);

  if (!found) {
    return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Bookmark not found" } });
  }

  if (title !== undefined) found.title = String(title).trim();
  if (url !== undefined && found.url) found.url = String(url).trim();

  saveBookmarks(tree);
  res.json({ success: true, data: found });
});

/**
 * DELETE /api/bookmarks/:id
 * Delete bookmark or folder
 */
router.delete("/bookmarks/:id", (req, res) => {
  const { id } = req.params;
  const tree = loadBookmarks();
  const match = findNodeWithParent(tree, id);

  if (!match) {
    return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Bookmark not found" } });
  }

  match.siblings.splice(match.index, 1);
  saveBookmarks(tree);

  res.json({ success: true, data: { id } });
});

/**
 * POST /api/bookmarks/reset
 * Reset to default bookmarks
 */
router.post("/bookmarks/reset", (req, res) => {
  let defaultData = [];
  try {
    defaultData = JSON.parse(fs.readFileSync(defaultBookmarksFile, "utf-8"));
  } catch (e) {
    defaultData = [];
  }
  saveBookmarks(defaultData);
  res.json({ success: true, data: defaultData });
});

export default router;
