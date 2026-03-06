import { Hono } from "hono";
import { Crew } from "../models/Crew";
import { authMiddleware } from "../middleware/auth";

export const crewRoute = new Hono();

// Get all crew
crewRoute.get("/", async (c) => {
  const crews = await Crew.find();
  return c.json(crews);
});

// Create crew (Coordinator or Admin)
crewRoute.post("/", authMiddleware(["Coordinator", "Admin"]), async (c) => {
  const body = await c.req.json();
  const { name, role, phone, busId, pictureUrl } = body;

  const crew = new Crew({ name, role, phone, busId, pictureUrl });
  await crew.save();

  return c.json({ message: "Crew created properly", crew }, 201);
});

// Update crew profile/picture/bus assigned
crewRoute.put("/:id", authMiddleware(["Coordinator", "Admin"]), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  const crew = await Crew.findByIdAndUpdate(id, body, { new: true });
  if (!crew) {
    return c.json({ error: "Crew not found" }, 404);
  }

  return c.json({ message: "Crew updated", crew });
});

// Delete crew
crewRoute.delete(
  "/:id",
  authMiddleware(["Coordinator", "Admin"]),
  async (c) => {
    const id = c.req.param("id");
    await Crew.findByIdAndDelete(id);
    return c.json({ message: "Crew deleted successfully" });
  },
);
