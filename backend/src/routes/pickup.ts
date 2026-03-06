import { Hono } from "hono";
import { PickupPoint } from "../models/PickupPoint.js";
import { Route } from "../models/Route.js";
import { Schedule } from "../models/Schedule.js";
import { authMiddleware } from "../middleware/auth";

export const pickupPointRoute = new Hono();

// Helper to add minutes to HH:mm (24h format for simplicity)
function addMinutes(timeStr: string, minutes: number) {
  const [h, m] = timeStr.split(":").map(Number);
  const date = new Date();
  date.setHours(h, m + minutes, 0, 0);
  const outH = String(date.getHours()).padStart(2, "0");
  const outM = String(date.getMinutes()).padStart(2, "0");
  return `${outH}:${outM}`;
}

// Get all pickup points
pickupPointRoute.get("/", async (c) => {
  const points = await PickupPoint.find().sort({ createdAt: -1 });
  return c.json(points);
});

// Create a pickup point (Coordinator only)
pickupPointRoute.post(
  "/",
  authMiddleware(["Coordinator", "Admin"]),
  async (c) => {
    const body = await c.req.json();
    const { name, description, lat, lng } = body;

    const point = new PickupPoint({ name, description, lat, lng });
    await point.save();

    return c.json({ message: "Pickup point created", point }, 201);
  },
);

// Update pickup point schedules or metadata
pickupPointRoute.put(
  "/:id",
  authMiddleware(["Coordinator", "Admin"]),
  async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json();

    const point = await PickupPoint.findByIdAndUpdate(id, body, { new: true });
    if (!point) return c.json({ error: "Pickup point not found" }, 404);

    return c.json({ message: "Pickup point updated", point });
  },
);

// Delete a pickup point
pickupPointRoute.delete(
  "/:id",
  authMiddleware(["Coordinator", "Admin"]),
  async (c) => {
    const id = c.req.param("id");
    await PickupPoint.findByIdAndDelete(id);
    return c.json({ message: "Pickup point deleted" });
  },
);
