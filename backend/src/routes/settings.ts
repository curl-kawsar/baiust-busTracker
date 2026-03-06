import { Hono } from "hono";
import { createAuditLog } from "./auditLog";
import { PlatformSettings, defaultSettings } from "../models/PlatformSettings.js";
import { authMiddleware } from "../middleware/auth.js";

export const settingsRoute = new Hono();

// Initialize default settings (call this during app startup)
settingsRoute.post("/init", authMiddleware(["Admin"]), async (c) => {
  try {
    const user = c.get("user");

    for (const setting of defaultSettings) {
      const exists = await PlatformSettings.findOne({ key: setting.key });
      if (!exists) {
        await PlatformSettings.create({
          ...setting,
          lastUpdatedBy: user._id,
        });
      }
    }

    return c.json({ message: "Default settings initialized successfully" });
  } catch (error) {
    return c.json({ error: "Failed to initialize settings" }, 500);
  }
});

// Get all platform settings
settingsRoute.get("/", authMiddleware(["Admin", "Coordinator"]), async (c) => {
  try {
    const { category } = c.req.query();

    const filter = category ? { category } : {};

    const settings = await PlatformSettings.find(filter)
      .populate("lastUpdatedBy", "name email")
      .sort({ category: 1, key: 1 });

    return c.json(settings);
  } catch (error) {
    return c.json({ error: "Failed to load settings" }, 500);
  }
});

// Get a specific setting by key
settingsRoute.get("/:key", authMiddleware(["Admin", "Coordinator"]), async (c) => {
  try {
    const key = c.req.param("key");

    const setting = await PlatformSettings.findOne({ key }).populate("lastUpdatedBy", "name email");

    if (!setting) {
      return c.json({ error: "Setting not found" }, 404);
    }

    return c.json(setting);
  } catch (error) {
    return c.json({ error: "Failed to load setting" }, 500);
  }
});

// Update a setting
settingsRoute.put("/:key", authMiddleware(["Admin"]), async (c) => {
  try {
    const key = c.req.param("key");
    const user = c.get("user");
    const body = await c.req.json();

    const { value, description } = body;

    const setting = await PlatformSettings.findOneAndUpdate(
      { key },
      {
        value,
        description: description || undefined,
        lastUpdatedBy: user._id,
      },
      { new: true },
    ).populate("lastUpdatedBy", "name email");

    if (!setting) {
      return c.json({ error: "Setting not found" }, 404);
    }

    await createAuditLog({ action: "SETTING_CHANGE", resource: "Settings", resourceName: key, performedBy: (user as any)._id.toString(), details: `Changed setting "${key}" to ${JSON.stringify(value)}` });

    return c.json(setting);
  } catch (error) {
    return c.json({ error: "Failed to update setting" }, 500);
  }
});

// Create a new setting
settingsRoute.post("/", authMiddleware(["Admin"]), async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();

    const { key, value, description, category, dataType } = body;

    // Check if setting already exists
    const exists = await PlatformSettings.findOne({ key });
    if (exists) {
      return c.json({ error: "Setting with this key already exists" }, 400);
    }

    const setting = await PlatformSettings.create({
      key,
      value,
      description,
      category,
      dataType,
      lastUpdatedBy: user._id,
    });

    const populated = await PlatformSettings.findById(setting._id).populate("lastUpdatedBy", "name email");

    return c.json(populated, 201);
  } catch (error) {
    return c.json({ error: "Failed to create setting" }, 500);
  }
});

// Delete a setting
settingsRoute.delete("/:key", authMiddleware(["Admin"]), async (c) => {
  try {
    const key = c.req.param("key");

    const deleted = await PlatformSettings.findOneAndDelete({ key });
    if (!deleted) {
      return c.json({ error: "Setting not found" }, 404);
    }

    return c.json({ message: "Setting deleted successfully" });
  } catch (error) {
    return c.json({ error: "Failed to delete setting" }, 500);
  }
});

// Get settings by category
settingsRoute.get("/category/:category", authMiddleware(["Admin", "Coordinator"]), async (c) => {
  try {
    const category = c.req.param("category");

    const settings = await PlatformSettings.find({ category }).populate("lastUpdatedBy", "name email").sort({ key: 1 });

    return c.json(settings);
  } catch (error) {
    return c.json({ error: "Failed to load category settings" }, 500);
  }
});

// Bulk update multiple settings
settingsRoute.put("/bulk", authMiddleware(["Admin"]), async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();
    const { updates } = body; // Array of { key, value, description? }

    const promises = updates.map((update) =>
      PlatformSettings.findOneAndUpdate(
        { key: update.key },
        {
          value: update.value,
          description: update.description || undefined,
          lastUpdatedBy: user._id,
        },
        { new: true },
      ),
    );

    const results = await Promise.all(promises);

    return c.json({
      message: "Settings updated successfully",
      updated: results.filter((r) => r !== null).length,
      failed: results.filter((r) => r === null).length,
    });
  } catch (error) {
    return c.json({ error: "Failed to bulk update settings" }, 500);
  }
});
