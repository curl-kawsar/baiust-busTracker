import mongoose from "mongoose";

const scheduleSchema = new mongoose.Schema({
  time: { type: String, required: true }, // e.g. "07:30 AM"
  busId: { type: String, required: true }, // Which bus comes to this point
});

const pickupPointSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: false },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    schedules: [scheduleSchema],
  },
  { timestamps: true },
);

export const PickupPoint = mongoose.model("PickupPoint", pickupPointSchema);
