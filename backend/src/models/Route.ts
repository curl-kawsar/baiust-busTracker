import mongoose from "mongoose";

const routeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    startPointId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PickupPoint",
      required: true,
    },
    endPointId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PickupPoint",
      required: true,
    },
    // Optional/Legacy fields (can be deprecated later)
    startName: { type: String },
    startLat: { type: Number },
    startLng: { type: Number },
    endName: { type: String },
    endLat: { type: Number },
    endLng: { type: Number },
    waypoints: [
      {
        pickupPointId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "PickupPoint",
          required: true,
        },
        delayMinutes: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true },
);

export const Route = mongoose.model("Route", routeSchema);
