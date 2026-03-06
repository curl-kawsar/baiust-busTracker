import mongoose from "mongoose";

const scheduleSchema = new mongoose.Schema(
  {
    busIds: [{ type: String, required: true }], // The IDs of the assigned Buses
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route",
      required: true,
    },
    departureTime: { type: String, required: true }, // e.g., "07:30"
  },
  { timestamps: true },
);

export const Schedule = mongoose.model("Schedule", scheduleSchema);
