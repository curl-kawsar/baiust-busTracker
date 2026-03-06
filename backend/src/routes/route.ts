import { Hono } from "hono";
import { Route } from "../models/Route.js";
import { Schedule } from "../models/Schedule.js";
import { authMiddleware } from "../middleware/auth.js";

export const transportRoute = new Hono();

// Get all routes
transportRoute.get("/", async (c) => {
  const routes = await Route.find()
    .populate("startPointId")
    .populate("endPointId")
    .populate("waypoints.pickupPointId")
    .sort({ createdAt: -1 });
  const schedules = await Schedule.find();

  // Attach schedules to the route response for convenience
  const routesWithSchedules = routes.map((r) => {
    const routeObj = r.toObject();
    return {
      ...routeObj,
      schedules: schedules.filter(
        (s) => s.routeId.toString() === routeObj._id.toString(),
      ),
    };
  });

  return c.json(routesWithSchedules);
});

// Create a new route
transportRoute.post(
  "/",
  authMiddleware(["Coordinator", "Admin"]),
  async (c) => {
    const body = await c.req.json();
    const { name, startPointId, endPointId, waypoints } = body;
    try {
      const route = await Route.create({
        name,
        startPointId,
        endPointId,
        waypoints,
      });
      return c.json(route, 201);
    } catch (error) {
      return c.json({ error: "Failed to create route" }, 500);
    }
  },
);

// Update a route
transportRoute.put(
  "/:id",
  authMiddleware(["Coordinator", "Admin"]),
  async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json();
    try {
      const route = await Route.findByIdAndUpdate(id, body, { new: true });
      return c.json(route);
    } catch (error) {
      return c.json({ error: "Failed to update route" }, 500);
    }
  },
);

// Delete a route
transportRoute.delete(
  "/:id",
  authMiddleware(["Coordinator", "Admin"]),
  async (c) => {
    const id = c.req.param("id");
    try {
      await Route.findByIdAndDelete(id);
      await Schedule.deleteMany({ routeId: id }); // Cascade delete schedules
      return c.json({ message: "Route deleted" });
    } catch (error) {
      return c.json({ error: "Failed to delete route" }, 500);
    }
  },
);

// Schedules
transportRoute.post(
  "/:routeId/schedules",
  authMiddleware(["Coordinator", "Admin"]),
  async (c) => {
    const routeId = c.req.param("routeId");
    const { busIds, departureTime } = await c.req.json();
    try {
      const schedule = await Schedule.create({
        routeId,
        busIds,
        departureTime,
      });
      return c.json(schedule, 201);
    } catch (error) {
      return c.json({ error: "Failed to allocate schedule" }, 500);
    }
  },
);

transportRoute.delete(
  "/schedules/:id",
  authMiddleware(["Coordinator", "Admin"]),
  async (c) => {
    const id = c.req.param("id");
    try {
      await Schedule.findByIdAndDelete(id);
      return c.json({ message: "Schedule deleted" });
    } catch (error) {
      return c.json({ error: "Failed to delete schedule" }, 500);
    }
  },
);
