import { Hono } from "hono";
import { Announcement } from "../models/Announcement";
import { authMiddleware } from "../middleware/auth";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export const announcementRoute = new Hono();

// Ensure uploads directory exists
const uploadsDir = path.resolve("uploads", "announcements");
fs.mkdirSync(uploadsDir, { recursive: true });

// Serve uploaded images
announcementRoute.get("/uploads/:filename", async (c) => {
  const filename = c.req.param("filename");
  const filePath = path.join(uploadsDir, filename);

  if (!fs.existsSync(filePath)) {
    return c.json({ error: "File not found" }, 404);
  }

  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };

  const data = fs.readFileSync(filePath);
  return new Response(data, {
    headers: {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000",
    },
  });
});

// Upload images (Coordinator or Admin)
announcementRoute.post(
  "/upload",
  authMiddleware(["Coordinator", "Admin"]),
  async (c) => {
    const body = await c.req.parseBody({ all: true });
    const files = body["images"];

    if (!files) {
      return c.json({ error: "No images provided" }, 400);
    }

    const fileArray = Array.isArray(files) ? files : [files];
    const urls: string[] = [];

    for (const file of fileArray) {
      if (!(file instanceof File)) continue;

      const ext = path.extname(file.name).toLowerCase();
      const allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
      if (!allowed.includes(ext)) continue;

      const uniqueName = `${crypto.randomUUID()}${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(path.join(uploadsDir, uniqueName), buffer);

      urls.push(`/api/announcements/uploads/${uniqueName}`);
    }

    return c.json({ urls });
  },
);

// Get all announcements
announcementRoute.get("/", async (c) => {
  const announcements = await Announcement.find()
    .populate("postedBy", "name role")
    .sort({ createdAt: -1 });
  return c.json(announcements);
});

// Create announcement (Coordinator or Admin)
announcementRoute.post(
  "/",
  authMiddleware(["Coordinator", "Admin"]),
  async (c) => {
    const body = await c.req.json();
    const { title, message, fileUrl, images } = body;
    const user = c.get("user") as any;

    const announcement = new Announcement({
      title,
      message,
      fileUrl,
      images: images || [],
      postedBy: user._id,
    });

    await announcement.save();
    return c.json(
      { message: "Announcement created successfully", announcement },
      201,
    );
  },
);

// Delete announcement (also clean up uploaded images)
announcementRoute.delete(
  "/:id",
  authMiddleware(["Coordinator", "Admin"]),
  async (c) => {
    const id = c.req.param("id");
    const announcement = await Announcement.findById(id);

    if (announcement?.images) {
      for (const url of announcement.images) {
        const filename = url.split("/").pop();
        if (filename) {
          const filePath = path.join(uploadsDir, filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      }
    }

    await Announcement.findByIdAndDelete(id);
    return c.json({ message: "Announcement deleted" });
  },
);
