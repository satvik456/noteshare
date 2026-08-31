import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import authRoutes from "./routes/auth";
import notesRoutes from "./routes/notes";
import sharesRoutes from "./routes/shares";

const app = new Hono().basePath("/api");

// CORS configuration
app.use(
  "*",
  cors({
    origin: process.env.APP_URL ?? "http://localhost:3000",
    credentials: true,
  })
);

// Request logging in development
if (process.env.NODE_ENV !== "production") {
  app.use("*", logger());
}

// Mount routes
app.route("/auth", authRoutes);
app.route("/notes", notesRoutes);
app.route("/share", sharesRoutes);

// Health check
app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

export default app;
