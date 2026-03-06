import { Hono } from "hono";
import { AuditLog } from "../models/AuditLog";
import { authMiddleware } from "../middleware/auth";
import { successResponse, errorResponse, handleError } from "../lib/errors";

export const auditRoute = new Hono();

// List audit logs — Admin only
auditRoute.get("/", authMiddleware(["Admin"]), async (c) => {
    try {
        const page = parseInt(c.req.query("page") || "1");
        const limit = Math.min(parseInt(c.req.query("limit") || "50"), 200);
        const resource = c.req.query("resource") || "";
        const action = c.req.query("action") || "";
        const search = c.req.query("search") || "";

        const filter: any = {};
        if (resource) filter.resource = resource;
        if (action) filter.action = action;
        if (search) {
            filter.$or = [
                { details: { $regex: search, $options: "i" } },
                { resourceName: { $regex: search, $options: "i" } },
            ];
        }

        const skip = (page - 1) * limit;
        const [logs, total] = await Promise.all([
            AuditLog.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("performedBy", "name email role")
                .lean(),
            AuditLog.countDocuments(filter),
        ]);

        return successResponse(c, {
            data: logs,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    } catch (error) {
        return handleError(c, error);
    }
});

// Get audit log stats
auditRoute.get("/stats", authMiddleware(["Admin"]), async (c) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);

        const [totalLogs, todayLogs, weekLogs, byResource, byAction] =
            await Promise.all([
                AuditLog.countDocuments(),
                AuditLog.countDocuments({ createdAt: { $gte: today } }),
                AuditLog.countDocuments({ createdAt: { $gte: weekAgo } }),
                AuditLog.aggregate([
                    { $group: { _id: "$resource", count: { $sum: 1 } } },
                    { $sort: { count: -1 } },
                    { $limit: 10 },
                ]),
                AuditLog.aggregate([
                    { $group: { _id: "$action", count: { $sum: 1 } } },
                    { $sort: { count: -1 } },
                ]),
            ]);

        return successResponse(c, {
            totalLogs,
            todayLogs,
            weekLogs,
            byResource,
            byAction,
        });
    } catch (error) {
        return handleError(c, error);
    }
});

// Helper: create an audit log entry (exported for use in other routes)
export async function createAuditLog(data: {
    action: string;
    resource: string;
    resourceId?: string;
    resourceName?: string;
    performedBy: string;
    details?: string;
    metadata?: any;
    ipAddress?: string;
}) {
    try {
        await AuditLog.create(data);
    } catch (err) {
        console.error("Failed to create audit log:", err);
    }
}
