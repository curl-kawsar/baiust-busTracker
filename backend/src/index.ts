import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { connectDB } from "./db";
import { authRoute } from "./routes/auth";
import { crewRoute } from "./routes/crew";
import { announcementRoute } from "./routes/announcement";
import { hardwareRoute } from "./routes/hardware";
import { pickupPointRoute } from "./routes/pickup";
import { busRoute } from "./routes/bus";
import { transportRoute } from "./routes/route";
import { travelHistoryRoute } from "./routes/travelHistory";
import { fuelRoute } from "./routes/fuel";
import { settingsRoute } from "./routes/settings";
import { auditRoute } from "./routes/auditLog";
import { maintenanceRoute } from "./routes/maintenance";

connectDB();

const app = new Hono();

app.use("*", cors());
app.route("/api/auth", authRoute);
app.route("/api/crews", crewRoute);
app.route("/api/announcements", announcementRoute);
app.route("/api/hardware", hardwareRoute);
app.route("/api/pickups", pickupPointRoute);
app.route("/api/buses", busRoute);
app.route("/api/routes", transportRoute);
app.route("/api/travel-history", travelHistoryRoute);
app.route("/api/fuel", fuelRoute);
app.route("/api/settings", settingsRoute);
app.route("/api/audit-logs", auditRoute);
app.route("/api/maintenance", maintenanceRoute);

app.get("/", (c) => {
  return c.text("BAIUST Transport Tracker API is running!");
});

const port = process.env.PORT ? parseInt(process.env.PORT) : 4000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
