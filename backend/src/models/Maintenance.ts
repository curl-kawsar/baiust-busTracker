import mongoose from "mongoose";

const maintenanceSchema = new mongoose.Schema(
    {
        busId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Bus",
            required: true,
        },
        type: {
            type: String,
            enum: [
                "oil_change",
                "tire_replacement",
                "brake_service",
                "engine_check",
                "ac_service",
                "battery_replacement",
                "general_service",
                "body_repair",
                "electrical",
                "other",
            ],
            required: true,
        },
        description: { type: String },
        scheduledDate: { type: Date, required: true },
        completedDate: { type: Date },
        status: {
            type: String,
            enum: ["scheduled", "in-progress", "completed", "overdue", "cancelled"],
            default: "scheduled",
        },
        cost: { type: Number, default: 0 },
        odometerAtService: { type: Number },
        vendor: { type: String },
        notes: { type: String },
        scheduledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true },
);

maintenanceSchema.index({ busId: 1, status: 1 });
maintenanceSchema.index({ scheduledDate: 1 });

export const Maintenance = mongoose.model("Maintenance", maintenanceSchema);
