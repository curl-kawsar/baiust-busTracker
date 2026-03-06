import * as dotenv from "dotenv";
import mongoose from "mongoose";
import * as bcrypt from "bcrypt";
import { User } from "./models/User";

dotenv.config();

async function seedAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log("MongoDB Connected");

    const adminExists = await User.findOne({ role: "Admin" });
    if (adminExists) {
      console.log("Admin already exists!");
      process.exit(0);
    }

    const hashedPasswordAdmin = await bcrypt.hash("admin123", 10);
    const admin = new User({
      name: "System Admin",
      email: "admin@baiust.edu.bd",
      password: hashedPasswordAdmin,
      role: "Admin",
    });

    const hashedPasswordCoord = await bcrypt.hash("coord123", 10);
    const coord = new User({
      name: "Transport Coordinator",
      email: "coord@baiust.edu.bd",
      password: hashedPasswordCoord,
      role: "Coordinator",
    });

    const hashedPasswordDemo = await bcrypt.hash("demo123", 10);
    const demo = new User({
      name: "Demo Student",
      email: "demo@baiust.edu.bd",
      password: hashedPasswordDemo,
      role: "Student",
      isEligible: true,
    });

    await admin.save();
    await coord.save();
    await demo.save();

    console.log("✅ Seeded successfully!");
    console.log("Admin: admin@baiust.edu.bd / admin123");
    console.log("Coordinator: coord@baiust.edu.bd / coord123");
    console.log("Demo Student: demo@baiust.edu.bd / demo123");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding:", error);
    process.exit(1);
  }
}

seedAdmin();
