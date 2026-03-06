import { Hono } from "hono";
import { createAuditLog } from "./auditLog";
import { Maintenance } from "../models/Maintenance";
import { Bus } from "../models/Bus";
import { authMiddleware } from "../middleware/auth";
import { successResponse, errorResponse, handleError } from "../lib/errors";

export const maintenanceRoute = new Hono();

// List all maintenance records
maintenanceRoute.get("/", authMiddleware(["Admin", "Coordinator"]), async (c) => {
    try {
        const status = c.req.query("status") || "";
        const busId = c.req.query("busId") || "";
        const limit = Math.min(parseInt(c.req.query("limit") || "50"), 200);

        const filter: any = {};
        if (status) filter.status = status;
        if (busId) filter.busId = busId;

        // Auto-mark overdue records
        await Maintenance.updateMany(
            { status: "scheduled", scheduledDate: { $lt: new Date() } },
            { $set: { status: "overdue" } },
        );

        const records = await Maintenance.find(filter)
            .sort({ scheduledDate: -1 })
            .limit(limit)
            .populate("busId", "name busId vehicleType color")
            .populate("scheduledBy", "name email")
            .lean();

        return successResponse(c, records);
    } catch (error) {
        return handleError(c, error);
    }
});

// Get maintenance stats
maintenanceRoute.get("/stats", authMiddleware(["Admin", "Coordinator"]), async (c) => {
    try {
        const [total, scheduled, overdue, completed, totalCost] = await Promise.all([
            Maintenance.countDocuments(),
            Maintenance.countDocuments({ status: "scheduled" }),
            Maintenance.countDocuments({ status: "overdue" }),
            Maintenance.countDocuments({ status: "completed" }),
            Maintenance.aggregate([
                { $match: { status: "completed" } },
                { $group: { _id: null, total: { $sum: "$cost" } } },
            ]),
        ]);

        // Buses due for maintenance (based on odometer)
        const busesDue = await Bus.find({
            $expr: {
                $gte: [
                    { $subtract: ["$currentOdometerReading", "$lastMaintenanceOdometer"] },
                    "$maintenanceInterval",
                ],
            },
        })
            .select("name busId currentOdometerReading lastMaintenanceOdometer maintenanceInterval")
            .lean();

        return successResponse(c, {
            total,
            scheduled,
            overdue,
            completed,
            totalCost: totalCost[0]?.total || 0,
            busesDue,
        });
    } catch (error) {
        return handleError(c, error);
    }
});

// Create maintenance record
maintenanceRoute.post("/", authMiddleware(["Admin", "Coordinator"]), async (c) => {
    try {
        const body = await c.req.json();
        const user = c.get("user") as any;
        const record = await Maintenance.create({ ...body, scheduledBy: user._id });
        await createAuditLog({ action: "CREATE", resource: "Maintenance", resourceId: record._id.toString(), performedBy: user._id.toString(), details: `Scheduled ${body.type} maintenance for bus ${body.busId}` });
        return successResponse(c, record, 201);
    } catch (error) {
        return handleError(c, error);
    }
});

// Update maintenance record
maintenanceRoute.put("/:id", authMiddleware(["Admin", "Coordinator"]), async (c) => {
    try {
        const id = c.req.param("id");
        const body = await c.req.json();
        const record = await Maintenance.findByIdAndUpdate(id, body, { new: true })
            .populate("busId", "name busId vehicleType color")
            .lean();
        if (!record) return errorResponse(c, "Record not found", 404);

        // If completed, update bus's lastMaintenanceOdometer
        if (body.status === "completed" && body.odometerAtService) {
            await Bus.findByIdAndUpdate((record as any).busId._id || (record as any).busId, {
                lastMaintenanceOdometer: body.odometerAtService,
            });
        }

        const user = c.get("user") as any;
        await createAuditLog({ action: "STATUS_CHANGE", resource: "Maintenance", resourceId: id, performedBy: user._id.toString(), details: `Updated maintenance record${body.status ? ` → ${body.status}` : ""}` });

        return successResponse(c, record);
    } catch (error) {
        return handleError(c, error);
    }
});

// Delete maintenance record
maintenanceRoute.delete("/:id", authMiddleware(["Admin"]), async (c) => {
    try {
        const id = c.req.param("id");
        const user = c.get("user") as any;
        await Maintenance.findByIdAndDelete(id);
        await createAuditLog({ action: "DELETE", resource: "Maintenance", resourceId: id, performedBy: user._id.toString(), details: `Deleted maintenance record ${id}` });
        return successResponse(c, { message: "Deleted successfully" });
    } catch (error) {
        return handleError(c, error);
    }
});
