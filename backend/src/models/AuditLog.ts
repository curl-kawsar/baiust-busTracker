import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
    {
        action: {
            type: String,
            required: true,
            enum: [
                "CREATE",
                "UPDATE",
                "DELETE",
                "LOGIN",
                "LOGOUT",
                "ASSIGN",
                "UNASSIGN",
                "SETTING_CHANGE",
                "STATUS_CHANGE",
                "BULK_ACTION",
            ],
        },
        resource: {
            type: String,
            required: true, // e.g. "Bus", "Crew", "Route", "User", "Announcement", etc.
        },
        resourceId: { type: String }, // ID of the affected resource
        resourceName: { type: String }, // Human-readable name
        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        details: { type: String }, // Human-readable description
        metadata: { type: mongoose.Schema.Types.Mixed }, // Extra data (old/new values)
        ipAddress: { type: String },
    },
    { timestamps: true },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ performedBy: 1 });
auditLogSchema.index({ resource: 1, action: 1 });

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
