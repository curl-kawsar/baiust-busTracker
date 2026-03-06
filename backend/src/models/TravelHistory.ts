import mongoose from "mongoose";

const travelHistorySchema = new mongoose.Schema(
  {
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
      required: true,
    },
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route",
      required: true,
    },
    departureTime: { type: Date, required: true },
    arrivalTime: { type: Date },
    startLocation: {
      name: { type: String, required: true },
      coordinates: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
      },
    },
    endLocation: {
      name: { type: String, required: true },
      coordinates: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
      },
    },
    distance: { type: Number, required: true }, // in kilometers
    status: {
      type: String,
      enum: ["in-progress", "completed", "cancelled"],
      default: "in-progress",
    },
    passengers: { type: Number, default: 0 },
    driver: { type: String },
    notes: { type: String },
  },
  { timestamps: true },
);

// Index for efficient querying
travelHistorySchema.index({ busId: 1, departureTime: -1 });
travelHistorySchema.index({ routeId: 1 });
travelHistorySchema.index({ departureTime: -1 });

export const TravelHistory = mongoose.model("TravelHistory", travelHistorySchema);
