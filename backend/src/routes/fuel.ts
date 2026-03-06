import { Hono } from "hono";
import { FuelRecord } from "../models/FuelRecord.js";
import { Bus } from "../models/Bus.js";
import { TravelHistory } from "../models/TravelHistory.js";
import { PlatformSettings } from "../models/PlatformSettings.js";
import { authMiddleware } from "../middleware/auth.js";

export const fuelRoute = new Hono();

// Get all fuel records with pagination and filters
fuelRoute.get("/", authMiddleware(["Admin", "Coordinator"]), async (c) => {
  try {
    const { page = "1", limit = "20", busId, fuelType, fromDate, toDate } = c.req.query();

    const filter: any = {};
    if (busId) filter.busId = busId;
    if (fuelType) filter.fuelType = fuelType;

    if (fromDate || toDate) {
      filter.date = {};
      if (fromDate) filter.date.$gte = new Date(fromDate);
      if (toDate) filter.date.$lte = new Date(toDate);
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [fuelRecords, total] = await Promise.all([
      FuelRecord.find(filter)
        .populate("busId", "name busId licensePlate")
        .populate("addedBy", "name email")
        .populate("travelHistoryId", "distance departureTime")
        .sort({ date: -1 })
        .skip(skip)
        .limit(limitNum),
      FuelRecord.countDocuments(filter),
    ]);

    return c.json({
      data: fuelRecords,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    return c.json({ error: "Failed to load fuel records" }, 500);
  }
});

// Get fuel records for a specific bus
fuelRoute.get("/bus/:busId", authMiddleware(["Admin", "Coordinator"]), async (c) => {
  const busId = c.req.param("busId");
  const { fromDate, toDate, limit = "10" } = c.req.query();

  try {
    const filter: any = { busId };

    if (fromDate || toDate) {
      filter.date = {};
      if (fromDate) filter.date.$gte = new Date(fromDate);
      if (toDate) filter.date.$lte = new Date(toDate);
    }

    const records = await FuelRecord.find(filter).populate("addedBy", "name").sort({ date: -1 }).limit(parseInt(limit));

    return c.json(records);
  } catch (error) {
    return c.json({ error: "Failed to load bus fuel records" }, 500);
  }
});

// Create new fuel record
fuelRoute.post("/", authMiddleware(["Admin", "Coordinator"]), async (c) => {
  try {
    const body = await c.req.json();
    const user = c.get("user");

    const {
      busId,
      travelHistoryId,
      date,
      liters,
      costPerLiter,
      fuelType,
      odometer,
      fuelStation,
      location,
      receiptNumber,
      notes,
    } = body;

    // Verify bus exists
    const bus = await Bus.findById(busId);
    if (!bus) {
      return c.json({ error: "Bus not found" }, 404);
    }

    // If costPerLiter is not provided, get from platform settings
    let finalCostPerLiter = costPerLiter;
    if (!finalCostPerLiter) {
      const setting = await PlatformSettings.findOne({ key: `fuel_price_${fuelType}` });
      finalCostPerLiter = setting?.value || 0;
    }

    const totalCost = liters * finalCostPerLiter;

    const fuelRecord = await FuelRecord.create({
      busId,
      travelHistoryId,
      date: date ? new Date(date) : new Date(),
      liters,
      costPerLiter: finalCostPerLiter,
      totalCost,
      fuelType,
      odometer,
      fuelStation,
      location,
      receiptNumber,
      addedBy: user._id,
      notes,
    });

    const populated = await FuelRecord.findById(fuelRecord._id)
      .populate("busId", "name busId licensePlate")
      .populate("addedBy", "name email")
      .populate("travelHistoryId", "distance departureTime");

    return c.json(populated, 201);
  } catch (error) {
    return c.json({ error: "Failed to create fuel record" }, 500);
  }
});

// Update fuel record
fuelRoute.put("/:id", authMiddleware(["Admin", "Coordinator"]), async (c) => {
  const id = c.req.param("id");

  try {
    const body = await c.req.json();
    const updateData = { ...body };

    if (updateData.date) {
      updateData.date = new Date(updateData.date);
    }

    // Recalculate total cost if liters or costPerLiter changed
    if (updateData.liters || updateData.costPerLiter) {
      const existing = await FuelRecord.findById(id);
      if (existing) {
        const liters = updateData.liters || existing.liters;
        const costPerLiter = updateData.costPerLiter || existing.costPerLiter;
        updateData.totalCost = liters * costPerLiter;
      }
    }

    const updated = await FuelRecord.findByIdAndUpdate(id, updateData, { new: true })
      .populate("busId", "name busId licensePlate")
      .populate("addedBy", "name email")
      .populate("travelHistoryId", "distance departureTime");

    if (!updated) {
      return c.json({ error: "Fuel record not found" }, 404);
    }

    return c.json(updated);
  } catch (error) {
    return c.json({ error: "Failed to update fuel record" }, 500);
  }
});

// Delete fuel record
fuelRoute.delete("/:id", authMiddleware(["Admin", "Coordinator"]), async (c) => {
  const id = c.req.param("id");

  try {
    const deleted = await FuelRecord.findByIdAndDelete(id);
    if (!deleted) {
      return c.json({ error: "Fuel record not found" }, 404);
    }

    return c.json({ message: "Fuel record deleted successfully" });
  } catch (error) {
    return c.json({ error: "Failed to delete fuel record" }, 500);
  }
});

// Get fuel consumption statistics
fuelRoute.get("/stats/consumption", authMiddleware(["Admin", "Coordinator"]), async (c) => {
  try {
    const { fromDate, toDate, busId, period = "monthly" } = c.req.query();

    const filter: any = {};
    if (busId) filter.busId = busId;

    if (fromDate || toDate) {
      filter.date = {};
      if (fromDate) filter.date.$gte = new Date(fromDate);
      if (toDate) filter.date.$lte = new Date(toDate);
    }

    // Group by period (monthly/weekly)
    const groupFormat = period === "weekly" ? "%Y-%U" : "%Y-%m";

    const stats = await FuelRecord.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            period: { $dateToString: { format: groupFormat, date: "$date" } },
            busId: "$busId",
            fuelType: "$fuelType",
          },
          totalLiters: { $sum: "$liters" },
          totalCost: { $sum: "$totalCost" },
          recordCount: { $sum: 1 },
          avgCostPerLiter: { $avg: "$costPerLiter" },
        },
      },
      { $sort: { "_id.period": -1 } },
    ]);

    // Get mileage data if travel history exists
    const mileageStats = await TravelHistory.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            period: { $dateToString: { format: groupFormat, date: "$departureTime" } },
            busId: "$busId",
          },
          totalDistance: { $sum: "$distance" },
          tripCount: { $sum: 1 },
        },
      },
    ]);

    return c.json({
      fuelConsumption: stats,
      mileage: mileageStats,
    });
  } catch (error) {
    return c.json({ error: "Failed to load fuel consumption statistics" }, 500);
  }
});

// Calculate fuel efficiency
fuelRoute.get("/stats/efficiency", authMiddleware(["Admin", "Coordinator"]), async (c) => {
  try {
    const { fromDate, toDate, busId } = c.req.query();

    const filter: any = {};
    if (busId) filter.busId = busId;

    const dateFilter = {};
    if (fromDate || toDate) {
      if (fromDate) dateFilter.$gte = new Date(fromDate);
      if (toDate) dateFilter.$lte = new Date(toDate);
    }

    // Get fuel records and travel history for the period
    const [fuelData, travelData] = await Promise.all([
      FuelRecord.aggregate([
        { $match: { ...filter, ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}) } },
        {
          $group: {
            _id: "$busId",
            totalLiters: { $sum: "$liters" },
            totalCost: { $sum: "$totalCost" },
          },
        },
      ]),
      TravelHistory.aggregate([
        { $match: { ...filter, ...(Object.keys(dateFilter).length ? { departureTime: dateFilter } : {}) } },
        {
          $group: {
            _id: "$busId",
            totalDistance: { $sum: "$distance" },
          },
        },
      ]),
    ]);

    // Combine data and calculate efficiency
    const efficiency = fuelData.map((fuel) => {
      const travel = travelData.find((t) => t._id.toString() === fuel._id.toString());
      const distance = travel?.totalDistance || 0;
      const fuelEfficiency = fuel.totalLiters > 0 ? distance / fuel.totalLiters : 0;

      return {
        busId: fuel._id,
        totalDistance: distance,
        totalLiters: fuel.totalLiters,
        totalCost: fuel.totalCost,
        fuelEfficiency: Math.round(fuelEfficiency * 100) / 100, // km per liter
        costPerKm: distance > 0 ? Math.round((fuel.totalCost / distance) * 100) / 100 : 0,
      };
    });

    return c.json(efficiency);
  } catch (error) {
    return c.json({ error: "Failed to calculate fuel efficiency" }, 500);
  }
});
