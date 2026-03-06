import "dotenv/config";
import mongoose from "mongoose";
import { PickupPoint } from "./backend/src/models/PickupPoint.js";
import { Route } from "./backend/src/models/Route.js";
import { Schedule } from "./backend/src/models/Schedule.js";

async function check() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Connected to DB");

  const points = await PickupPoint.find();
  console.log("--- Pickup Points ---");
  points.forEach((p) => {
    console.log(`Point: ${p.name} (_id: ${p._id})`);
    console.log("Schedules:", JSON.stringify(p.schedules, null, 2));
  });

  const routes = await Route.find();
  console.log("\n--- Routes ---");
  routes.forEach((r) => {
    console.log(`Route: ${r.name} (_id: ${r._id})`);
    console.log(`Start: ${r.startPointId}, End: ${r.endPointId}`);
    console.log("Waypoints:", JSON.stringify(r.waypoints, null, 2));
  });

  const schedules = await Schedule.find();
  console.log("\n--- Schedules ---");
  console.log(JSON.stringify(schedules, null, 2));

  await mongoose.disconnect();
}

check();
