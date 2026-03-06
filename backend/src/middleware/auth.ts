import { Hono } from "hono";
import jwt from "jsonwebtoken";
import { User } from "../models/User";

export const authMiddleware = (roles: string[] = []) => {
  return async (c: any, next: any) => {
    const authHeader = c.req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "Unauthorized, token missing" }, 401);
    }

    const token = authHeader.split(" ")[1];
    try {
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);

      // Optional: Check if user still exists
      const user = await User.findById(decoded.id);
      if (!user) {
        return c.json({ error: "Unauthorized, user not found" }, 401);
      }

      // Role authorization
      if (roles.length > 0 && !roles.includes(user.role)) {
        return c.json({ error: "Forbidden, insufficient permissions" }, 403);
      }

      // Inject user into context for further usage
      c.set("user", user);
      await next();
    } catch (err) {
      return c.json({ error: "Unauthorized, invalid token" }, 401);
    }
  };
};
