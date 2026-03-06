import mongoose from "mongoose";

const fuelRecordSchema = new mongoose.Schema(
  {
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
      required: true,
    },
    travelHistoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TravelHistory",
    },
    date: { type: Date, required: true, default: Date.now },
    liters: { type: Number, required: true }, // fuel quantity in liters
    costPerLiter: { type: Number, required: true }, // cost per liter in BDT
    totalCost: { type: Number, required: true }, // total cost in BDT
    fuelType: {
      type: String,
      enum: ["petrol", "diesel", "cng", "octane"],
      required: true,
    },
    odometer: { type: Number }, // odometer reading in km
    fuelStation: { type: String },
    location: {
      name: { type: String },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },
    receiptNumber: { type: String },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    notes: { type: String },
  },
  { timestamps: true },
);

// Index for efficient querying
fuelRecordSchema.index({ busId: 1, date: -1 });
fuelRecordSchema.index({ date: -1 });
fuelRecordSchema.index({ fuelType: 1 });

export const FuelRecord = mongoose.model("FuelRecord", fuelRecordSchema);
