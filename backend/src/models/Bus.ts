import mongoose from "mongoose";

const busSchema = new mongoose.Schema(
  {
    busId: { type: String, required: true, unique: true }, // Hardware device ID e.g., 'bus01'
    name: { type: String, required: true }, // Display name, e.g. 'Surma'
    vehicleType: {
      type: String,
      enum: ["Bus", "Microbus", "Car", "Bike", "Ambulance", "Pickup", "Truck", "Other"],
      default: "Bus",
    },
    color: { type: String, default: "#3b82f6" }, // Hex color for map marker
    licensePlate: { type: String },
    capacity: { type: Number },

    // Fuel efficiency and variables
    expectedMileage: { type: Number, default: 8.0 }, // km per liter
    fuelTankCapacity: { type: Number }, // tank capacity in liters
    preferredFuelType: {
      type: String,
      enum: ["petrol", "diesel", "cng", "octane"],
      default: "diesel",
    },

    // Additional operational data
    currentOdometerReading: { type: Number, default: 0 }, // in km
    lastMaintenanceOdometer: { type: Number, default: 0 }, // in km
    maintenanceInterval: { type: Number, default: 5000 }, // km between maintenance

    // Status tracking
    isActive: { type: Boolean, default: true },
    lastFuelDate: { type: Date },

    // Notes
    notes: { type: String },
  },
  { timestamps: true },
);

export const Bus = mongoose.model("Bus", busSchema);
