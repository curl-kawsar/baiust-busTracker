import mongoose from "mongoose";

const crewSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    role: { type: String, enum: ["Driver", "Supervisor"], required: true },
    phone: { type: String, required: true },
    busId: { type: String, required: false }, // Matches device_id from hardware e.g., 'bus01'
    pictureUrl: { type: String, required: false },
  },
  { timestamps: true },
);

export const Crew = mongoose.model("Crew", crewSchema);
