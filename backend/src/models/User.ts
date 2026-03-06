import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["Admin", "Student", "Staff", "Faculty", "Coordinator"],
      required: true,
    },
    // Student ID for Students, Staff ID for Staff/Faculty
    institutionId: { type: String, unique: true, sparse: true },
    department: { type: String },
    session: { type: String }, // For students (e.g., "2021-2022")
    isEligible: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Index for faster lookups (institutionId already indexed via unique constraint)
userSchema.index({ role: 1, isEligible: 1 });

export const User = mongoose.model("User", userSchema);
