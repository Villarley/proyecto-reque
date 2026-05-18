import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { env } from "./env.js";
import { authRoutes } from "./routes/auth.js";
import { eventsRoutes } from "./routes/events.js";
import { levelsRoutes } from "./routes/levels.js";
import { pointsRoutes } from "./routes/points.js";
import { profileRoutes } from "./routes/profile.js";
import { notificationsRoutes } from "./routes/notifications.js";
import { analyticsRoutes } from "./routes/analytics.js";
import { leaderboardRoutes } from "./routes/leaderboard.js";

const app = new Hono();

app.use(logger());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.get("/health", (c) => c.json({ ok: true, service: "stellar-orbit-api" }));

app.route("/auth", authRoutes);
app.route("/events", eventsRoutes);
app.route("/levels", levelsRoutes);
app.route("/points", pointsRoutes);
app.route("/profile", profileRoutes);
app.route("/notifications", notificationsRoutes);
app.route("/analytics", analyticsRoutes);
app.route("/leaderboard", leaderboardRoutes);

serve({
  fetch: app.fetch,
  port: env.PORT,
});

console.log(`API listening on http://localhost:${String(env.PORT)}`);
