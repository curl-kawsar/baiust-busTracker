import "dotenv/config";
import { Hono } from "hono";
import { handle } from "hono/vercel";
import { cors } from "hono/cors";
import { connectDB } from "../src/db";
import { authRoute } from "../src/routes/auth";
import { crewRoute } from "../src/routes/crew";
import { announcementRoute } from "../src/routes/announcement";
import { hardwareRoute } from "../src/routes/hardware";
import { pickupPointRoute } from "../src/routes/pickup";
import { busRoute } from "../src/routes/bus";
import { transportRoute } from "../src/routes/route";
import { travelHistoryRoute } from "../src/routes/travelHistory";
import { fuelRoute } from "../src/routes/fuel";
import { settingsRoute } from "../src/routes/settings";

// Connect to MongoDB (cached connection for serverless)
connectDB();

const app = new Hono().basePath("/api");

app.use("*", cors());
app.route("/auth", authRoute);
app.route("/crews", crewRoute);
app.route("/announcements", announcementRoute);
app.route("/hardware", hardwareRoute);
app.route("/pickups", pickupPointRoute);
app.route("/buses", busRoute);
app.route("/routes", transportRoute);
app.route("/travel-history", travelHistoryRoute);
app.route("/fuel", fuelRoute);
app.route("/settings", settingsRoute);

app.get("/", (c) => {
  return c.json({ message: "BAIUST Transport Tracker API is running!" });
});

// Export for Vercel
export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
