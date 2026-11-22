import dotenv from "dotenv";
import { createApp } from "./app.js";

// Load environment variables from .env
dotenv.config();

const app = createApp();
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`\n=================================================`);
  console.log(`  🌟 Material You New Tab - Dynamic Server`);
  console.log(`  Mode:     ${process.env.NODE_ENV || "development"}`);
  console.log(`  URL:      http://localhost:${PORT}`);
  console.log(`  API Docs: http://localhost:${PORT}/api/health`);
  console.log(`=================================================\n`);
});

// Graceful shutdown handling
process.on("SIGINT", () => {
  console.log("\nShutting down gracefully...");
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  console.log("\nProcess terminated.");
  server.close(() => {
    process.exit(0);
  });
});
