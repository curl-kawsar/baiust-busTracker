import { Hono } from "hono";
import { TravelHistory } from "../models/TravelHistory.js";
import { Bus } from "../models/Bus.js";
import { Route } from "../models/Route.js";
import { authMiddleware } from "../middleware/auth.js";

export const travelHistoryRoute = new Hono();

// Get all travel history with pagination and filters
travelHistoryRoute.get("/", authMiddleware(["Admin", "Coordinator"]), async (c) => {
  try {
    const { page = "1", limit = "20", busId, routeId, status, fromDate, toDate } = c.req.query();

    const filter: any = {};
    if (busId) filter.busId = busId;
    if (routeId) filter.routeId = routeId;
    if (status) filter.status = status;

    if (fromDate || toDate) {
      filter.departureTime = {};
      if (fromDate) filter.departureTime.$gte = new Date(fromDate);
      if (toDate) filter.departureTime.$lte = new Date(toDate);
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [travelHistory, total] = await Promise.all([
      TravelHistory.find(filter)
        .populate("busId", "name busId licensePlate")
        .populate("routeId", "name")
        .sort({ departureTime: -1 })
        .skip(skip)
        .limit(limitNum),
      TravelHistory.countDocuments(filter),
    ]);

    return c.json({
      data: travelHistory,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    return c.json({ error: "Failed to load travel history" }, 500);
  }
});

// Get travel history for a specific bus
travelHistoryRoute.get("/bus/:busId", authMiddleware(["Admin", "Coordinator"]), async (c) => {
  const busId = c.req.param("busId");
  const { fromDate, toDate, limit = "10" } = c.req.query();

  try {
    const filter: any = { busId };

    if (fromDate || toDate) {
      filter.departureTime = {};
      if (fromDate) filter.departureTime.$gte = new Date(fromDate);
      if (toDate) filter.departureTime.$lte = new Date(toDate);
    }

    const history = await TravelHistory.find(filter)
      .populate("routeId", "name")
      .sort({ departureTime: -1 })
      .limit(parseInt(limit));

    return c.json(history);
  } catch (error) {
    return c.json({ error: "Failed to load bus travel history" }, 500);
  }
});

// Create new travel history entry
travelHistoryRoute.post("/", authMiddleware(["Admin", "Coordinator"]), async (c) => {
  try {
    const body = await c.req.json();
    const { busId, routeId, departureTime, arrivalTime, startLocation, endLocation, distance, passengers, driver, notes } =
      body;

    // Verify bus and route exist
    const [bus, route] = await Promise.all([Bus.findById(busId), Route.findById(routeId)]);

    if (!bus) {
      return c.json({ error: "Bus not found" }, 404);
    }

    if (!route) {
      return c.json({ error: "Route not found" }, 404);
    }

    const travelHistory = await TravelHistory.create({
      busId,
      routeId,
      departureTime: new Date(departureTime),
      arrivalTime: arrivalTime ? new Date(arrivalTime) : undefined,
      startLocation,
      endLocation,
      distance,
      passengers,
      driver,
      notes,
      status: arrivalTime ? "completed" : "in-progress",
    });

    const populated = await TravelHistory.findById(travelHistory._id)
      .populate("busId", "name busId licensePlate")
      .populate("routeId", "name");

    return c.json(populated, 201);
  } catch (error) {
    return c.json({ error: "Failed to create travel history entry" }, 500);
  }
});

// Update travel history entry
travelHistoryRoute.put("/:id", authMiddleware(["Admin", "Coordinator"]), async (c) => {
  const id = c.req.param("id");

  try {
    const body = await c.req.json();
    const updateData = { ...body };

    if (updateData.departureTime) {
      updateData.departureTime = new Date(updateData.departureTime);
    }

    if (updateData.arrivalTime) {
      updateData.arrivalTime = new Date(updateData.arrivalTime);
      updateData.status = "completed";
    }

    const updated = await TravelHistory.findByIdAndUpdate(id, updateData, { new: true })
      .populate("busId", "name busId licensePlate")
      .populate("routeId", "name");

    if (!updated) {
      return c.json({ error: "Travel history entry not found" }, 404);
    }

    return c.json(updated);
  } catch (error) {
    return c.json({ error: "Failed to update travel history entry" }, 500);
  }
});

// Delete travel history entry
travelHistoryRoute.delete("/:id", authMiddleware(["Admin", "Coordinator"]), async (c) => {
  const id = c.req.param("id");

  try {
    const deleted = await TravelHistory.findByIdAndDelete(id);
    if (!deleted) {
      return c.json({ error: "Travel history entry not found" }, 404);
    }

    return c.json({ message: "Travel history entry deleted successfully" });
  } catch (error) {
    return c.json({ error: "Failed to delete travel history entry" }, 500);
  }
});

// Get travel statistics
travelHistoryRoute.get("/stats/summary", authMiddleware(["Admin", "Coordinator"]), async (c) => {
  try {
    const { fromDate, toDate, busId } = c.req.query();

    const filter: any = {};
    if (busId) filter.busId = busId;

    if (fromDate || toDate) {
      filter.departureTime = {};
      if (fromDate) filter.departureTime.$gte = new Date(fromDate);
      if (toDate) filter.departureTime.$lte = new Date(toDate);
    }

    const stats = await TravelHistory.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalTrips: { $sum: 1 },
          totalDistance: { $sum: "$distance" },
          totalPassengers: { $sum: "$passengers" },
          completedTrips: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          inProgressTrips: {
            $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] },
          },
          cancelledTrips: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
          },
        },
      },
    ]);

    const result = stats[0] || {
      totalTrips: 0,
      totalDistance: 0,
      totalPassengers: 0,
      completedTrips: 0,
      inProgressTrips: 0,
      cancelledTrips: 0,
    };

    return c.json(result);
  } catch (error) {
    return c.json({ error: "Failed to load travel statistics" }, 500);
  }
});
