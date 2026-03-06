import mongoose from "mongoose";

const platformSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ["fuel", "currency", "general", "reporting"],
      required: true,
    },
    dataType: {
      type: String,
      enum: ["string", "number", "boolean", "object"],
      required: true,
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

// Index for efficient querying
platformSettingsSchema.index({ category: 1 });
platformSettingsSchema.index({ key: 1 });

export const PlatformSettings = mongoose.model("PlatformSettings", platformSettingsSchema);

// Default settings to be inserted during initialization
export const defaultSettings = [
  {
    key: "fuel_price_petrol",
    value: 114.0,
    description: "Current petrol price per liter in BDT",
    category: "fuel",
    dataType: "number",
  },
  {
    key: "fuel_price_diesel",
    value: 109.0,
    description: "Current diesel price per liter in BDT",
    category: "fuel",
    dataType: "number",
  },
  {
    key: "fuel_price_cng",
    value: 65.0,
    description: "Current CNG price per liter in BDT",
    category: "fuel",
    dataType: "number",
  },
  {
    key: "fuel_price_octane",
    value: 130.0,
    description: "Current octane price per liter in BDT",
    category: "fuel",
    dataType: "number",
  },
  {
    key: "currency",
    value: "BDT",
    description: "Primary currency for the platform",
    category: "currency",
    dataType: "string",
  },
  {
    key: "mileage_calculation_period",
    value: "weekly",
    description: "Period for mileage calculation (weekly/monthly)",
    category: "reporting",
    dataType: "string",
  },
  {
    key: "fuel_efficiency_threshold",
    value: 8.0,
    description: "Minimum acceptable fuel efficiency (km per liter)",
    category: "fuel",
    dataType: "number",
  },
];
