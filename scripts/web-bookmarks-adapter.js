/*
 * Material You New Tab - Web Bookmarks Adapter
 * Provides full bookmarks functionality when running as a dynamic website
 * Seamlessly interfaces with /api/bookmarks or falls back to localStorage.
 */

(function () {
  const STORAGE_KEY = "mynt_web_bookmarks_tree";

  const DEFAULT_TREE = [
    {
      id: "0",
      title: "root",
      children: [
        {
          id: "1",
          title: "Bookmarks bar",
          dateAdded: Date.now() - 10000000,
          children: [
            {
              id: "101",
              parentId: "1",
              title: "GitHub",
              url: "https://github.com",
              dateAdded: Date.now() - 9000000
            },
            {
              id: "102",
              parentId: "1",
              title: "YouTube",
              url: "https://youtube.com",
              dateAdded: Date.now() - 8000000
            },
            {
              id: "103",
              parentId: "1",
              title: "Reddit",
              url: "https://reddit.com",
              dateAdded: Date.now() - 7000000
            },
            {
              id: "104",
              parentId: "1",
              title: "Wikipedia",
              url: "https://wikipedia.org",
              dateAdded: Date.now() - 6000000
            },
            {
              id: "105",
              parentId: "1",
              title: "Dev Resources",
              dateAdded: Date.now() - 5000000,
              children: [
                {
                  id: "1051",
                  parentId: "105",
                  title: "MDN Web Docs",
                  url: "https://developer.mozilla.org",
                  dateAdded: Date.now() - 4000000
                },
                {
                  id: "1052",
                  parentId: "105",
                  title: "Material Design 3",
                  url: "https://m3.material.io",
                  dateAdded: Date.now() - 3000000
                }
              ]
            }
          ]
        },
        {
          id: "2",
          title: "Other bookmarks",
          dateAdded: Date.now() - 2000000,
          children: []
        }
      ]
    }
  ];

  function getLocalTree() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Error reading local bookmark cache:", e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_TREE));
  }

  function saveLocalTree(tree) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tree));
    } catch (e) {
      console.warn("Error saving local bookmark cache:", e);
    }
  }

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

  function flattenBookmarks(nodes, result = []) {
    for (const node of nodes) {
      if (node.url) result.push(node);
      if (node.children) flattenBookmarks(node.children, result);
    }
    return result;
  }

  const WebBookmarksAdapter = {
    async getTree() {
      try {
        const res = await fetch("/api/bookmarks");
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            saveLocalTree(json.data);
            return json.data;
          }
        }
      } catch (err) {
        // Offline or server unavailable, use localStorage
      }
      return getLocalTree();
    },

    async getRecent(count = 8) {
      try {
        const res = await fetch(`/api/bookmarks/recent?count=${count}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            return json.data;
          }
        }
      } catch (err) {
        // Fallback to local
      }
      const tree = getLocalTree();
      const all = flattenBookmarks(tree);
      all.sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
      return all.slice(0, count);
    },

    async get(id) {
      const tree = await this.getTree();
      const node = findNode(tree, id);
      return node ? [node] : [];
    },

    async create(details) {
      try {
        const res = await fetch("/api/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(details)
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success) return json.data;
        }
      } catch (e) {}

      // Fallback local mutation
      const tree = getLocalTree();
      const parent = details.parentId ? findNode(tree, details.parentId) : tree[0].children[0];
      const newNode = {
        id: String(Date.now()),
        parentId: parent ? String(parent.id) : "1",
        title: details.title || "",
        dateAdded: Date.now()
      };
      if (details.url) {
        newNode.url = details.url;
      } else {
        newNode.children = [];
      }
      if (parent && parent.children) {
        if (typeof details.index === "number") {
          parent.children.splice(details.index, 0, newNode);
        } else {
          parent.children.push(newNode);
        }
      }
      saveLocalTree(tree);
      return newNode;
    },

    async update(id, changes) {
      try {
        const res = await fetch(`/api/bookmarks/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(changes)
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success) return json.data;
        }
      } catch (e) {}

      // Fallback local mutation
      const tree = getLocalTree();
      const node = findNode(tree, id);
      if (node) {
        if (changes.title !== undefined) node.title = changes.title;
        if (changes.url !== undefined && node.url) node.url = changes.url;
        saveLocalTree(tree);
        return node;
      }
      return null;
    },

    async remove(id) {
      try {
        await fetch(`/api/bookmarks/${id}`, { method: "DELETE" });
      } catch (e) {}

      const tree = getLocalTree();
      const match = findNodeWithParent(tree, id);
      if (match) {
        match.siblings.splice(match.index, 1);
        saveLocalTree(tree);
      }
      return true;
    },

    async removeTree(id) {
      return this.remove(id);
    },

    async move(id, destination) {
      const tree = getLocalTree();
      const match = findNodeWithParent(tree, id);
      if (!match) return;

      const [removedNode] = match.siblings.splice(match.index, 1);
      const targetParent = destination.parentId ? findNode(tree, destination.parentId) : match.parent;

      if (targetParent && targetParent.children) {
        removedNode.parentId = String(targetParent.id);
        const targetIndex = typeof destination.index === "number" ? destination.index : targetParent.children.length;
        targetParent.children.splice(targetIndex, 0, removedNode);
        saveLocalTree(tree);
      }
      return removedNode;
    },

    async search(query) {
      const tree = await this.getTree();
      const all = flattenBookmarks(tree);
      const q = String(query).toLowerCase();
      return all.filter((b) => (b.title && b.title.toLowerCase().includes(q)) || (b.url && b.url.toLowerCase().includes(q)));
    }
  };

  // Expose to window for web mode
  window.webBookmarks = WebBookmarksAdapter;
})();
