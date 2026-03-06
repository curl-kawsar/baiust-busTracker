import { Hono } from "hono";
import { createAuditLog } from "./auditLog";
import { Bus } from "../models/Bus.js";
import { authMiddleware } from "../middleware/auth.js";

export const busRoute = new Hono();

// List all buses
busRoute.get("/", async (c) => {
  try {
    const buses = await Bus.find().sort({ createdAt: -1 });
    return c.json(buses);
  } catch (error) {
    return c.json({ error: "Failed to load buses" }, 500);
  }
});

// Create a new bus entity
busRoute.post("/", authMiddleware(["Admin", "Coordinator"]), async (c) => {
  const body = await c.req.json();
  const {
    busId,
    name,
    vehicleType,
    color,
    licensePlate,
    capacity,
    expectedMileage,
    fuelTankCapacity,
    preferredFuelType,
    currentOdometerReading,
    maintenanceInterval,
    notes,
  } = body;

  try {
    // Check if duplicate busId
    const exists = await Bus.findOne({ busId });
    if (exists) {
      return c.json({ error: "Bus ID already registered" }, 400);
    }
    const newBus = await Bus.create({
      busId,
      name,
      vehicleType,
      color,
      licensePlate,
      capacity,
      expectedMileage,
      fuelTankCapacity,
      preferredFuelType,
      currentOdometerReading,
      maintenanceInterval,
      notes,
    });
    const user = c.get("user") as any;
    await createAuditLog({ action: "CREATE", resource: "Bus", resourceId: newBus._id.toString(), resourceName: name, performedBy: user._id.toString(), details: `Created bus: ${name} (${busId})` });
    return c.json(newBus, 201);
  } catch (error) {
    return c.json({ error: "Failed to create bus" }, 500);
  }
});

// Get a specific bus by ID
busRoute.get("/:id", async (c) => {
  const id = c.req.param("id");

  try {
    const bus = await Bus.findById(id);
    if (!bus) {
      return c.json({ error: "Bus not found" }, 404);
    }
    return c.json(bus);
  } catch (error) {
    return c.json({ error: "Failed to load bus" }, 500);
  }
});

// Update bus entity
busRoute.put("/:id", authMiddleware(["Admin", "Coordinator"]), async (c) => {
  const id = c.req.param("id");

  try {
    const body = await c.req.json();

    // Don't allow changing busId after creation for consistency
    if (body.busId) {
      delete body.busId;
    }

    const updated = await Bus.findByIdAndUpdate(id, body, { new: true });
    if (!updated) {
      return c.json({ error: "Bus not found" }, 404);
    }

    const user = c.get("user") as any;
    await createAuditLog({ action: "UPDATE", resource: "Bus", resourceId: id, resourceName: updated.name, performedBy: user._id.toString(), details: `Updated bus: ${updated.name}` });

    return c.json(updated);
  } catch (error) {
    return c.json({ error: "Failed to update bus" }, 500);
  }
});

// Delete bus entity
busRoute.delete("/:id", authMiddleware(["Admin", "Coordinator"]), async (c) => {
  const id = c.req.param("id");
  try {
    const bus = await Bus.findById(id);
    await Bus.findByIdAndDelete(id);
    const user = c.get("user") as any;
    await createAuditLog({ action: "DELETE", resource: "Bus", resourceId: id, resourceName: bus?.name || "Unknown", performedBy: user._id.toString(), details: `Deleted bus: ${bus?.name || id}` });
    return c.json({ message: "Bus removed" });
  } catch (error) {
    return c.json({ error: "Failed to remove bus" }, 500);
  }
});
