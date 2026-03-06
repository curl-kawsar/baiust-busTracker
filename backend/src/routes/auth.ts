import { Hono } from "hono";
import { createAuditLog } from "./auditLog";
import * as bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { authMiddleware } from "../middleware/auth";
import {
  createUserSchema,
  updateUserSchema,
  loginSchema,
  bulkCreateStudentsSchema,
} from "../lib/validators";
import {
  handleError,
  successResponse,
  errorResponse,
  NotFoundError,
  ConflictError,
} from "../lib/errors";

export const authRoute = new Hono();

// ============================================
// PUBLIC ROUTES
// ============================================

// Login
authRoute.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const validated = loginSchema.parse(body);

    const user = await User.findOne({ email: validated.email });
    if (!user) {
      return errorResponse(
        c,
        "Invalid credentials",
        401,
        "INVALID_CREDENTIALS",
      );
    }

    const isMatch = await bcrypt.compare(validated.password, user.password);
    if (!isMatch) {
      return errorResponse(
        c,
        "Invalid credentials",
        401,
        "INVALID_CREDENTIALS",
      );
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" },
    );

    await createAuditLog({ action: "LOGIN", resource: "User", resourceId: user._id.toString(), resourceName: user.name, performedBy: user._id.toString(), details: `${user.name} (${user.role}) logged in` });

    return successResponse(c, {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        institutionId: (user as any).institutionId,
        department: (user as any).department,
        session: (user as any).session,
        isEligible: user.isEligible,
      },
    });
  } catch (error) {
    return handleError(c, error);
  }
});

// Get current user profile
authRoute.get("/me", authMiddleware([]), async (c) => {
  try {
    const user = c.get("user") as any;
    return successResponse(c, {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      institutionId: user.institutionId,
      department: user.department,
      session: user.session,
      isEligible: user.isEligible,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    return handleError(c, error);
  }
});

// Seed initial Admin & Demo (Should be disabled in production)
authRoute.post("/seed-admin", async (c) => {
  try {
    const adminExists = await User.findOne({ role: "Admin" });
    if (adminExists) {
      return errorResponse(c, "System already seeded", 400, "ALREADY_SEEDED");
    }

    const users = [
      {
        name: "System Admin",
        email: "admin@baiust.edu.bd",
        password: "admin123",
        role: "Admin",
        isEligible: true,
      },
      {
        name: "Transport Coordinator",
        email: "coord@baiust.edu.bd",
        password: "coord123",
        role: "Coordinator",
        isEligible: true,
      },
      {
        name: "Demo Student",
        email: "demo@baiust.edu.bd",
        password: "demo123",
        role: "Student",
        isEligible: true,
      },
    ];

    for (const userData of users) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      await User.create({ ...userData, password: hashedPassword });
    }

    return successResponse(
      c,
      {
        message:
          "System seeded successfully with Admin, Coordinator, and Demo Student",
      },
      201,
    );
  } catch (error) {
    return handleError(c, error);
  }
});

// ============================================
// ADMIN ONLY ROUTES
// ============================================

// List all users with pagination and filtering
authRoute.get("/users", authMiddleware(["Admin"]), async (c) => {
  try {
    const page = parseInt(c.req.query("page") || "1");
    const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100);
    const search = c.req.query("search") || "";
    const role = c.req.query("role") || "";
    const sortBy = c.req.query("sortBy") || "createdAt";
    const sortOrder = c.req.query("sortOrder") === "asc" ? 1 : -1;

    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { institutionId: { $regex: search, $options: "i" } },
      ];
    }

    if (role) {
      query.role = role;
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select("-password")
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return successResponse(c, {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    return handleError(c, error);
  }
});

// Get single user by ID
authRoute.get("/users/:id", authMiddleware(["Admin"]), async (c) => {
  try {
    const id = c.req.param("id");
    const user = await User.findById(id).select("-password").lean();

    if (!user) {
      throw new NotFoundError("User");
    }

    return successResponse(c, user);
  } catch (error) {
    return handleError(c, error);
  }
});

// Create user
authRoute.post("/users", authMiddleware(["Admin"]), async (c) => {
  try {
    const body = await c.req.json();
    const validated = createUserSchema.parse(body);

    const existingUser = await User.findOne({ email: validated.email });
    if (existingUser) {
      throw new ConflictError("User with this email already exists");
    }

    // Check for duplicate institutionId if provided
    if (validated.institutionId) {
      const existingInstitutionId = await User.findOne({
        institutionId: validated.institutionId,
      });
      if (existingInstitutionId) {
        throw new ConflictError(
          "User with this Student/Staff ID already exists",
        );
      }
    }

    const hashedPassword = await bcrypt.hash(validated.password, 12);
    const user = await User.create({
      ...validated,
      password: hashedPassword,
    });

    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      institutionId: (user as any).institutionId,
      department: (user as any).department,
      session: (user as any).session,
      isEligible: user.isEligible,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const admin = c.get("user") as any;
    await createAuditLog({ action: "CREATE", resource: "User", resourceId: user._id.toString(), resourceName: user.name, performedBy: admin._id.toString(), details: `Created ${validated.role} account: ${user.name} (${user.email})` });

    return successResponse(
      c,
      { message: "User created successfully", user: userResponse },
      201,
    );
  } catch (error) {
    return handleError(c, error);
  }
});

// Update user
authRoute.put("/users/:id", authMiddleware(["Admin"]), async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const validated = updateUserSchema.parse(body);

    const existingUser = await User.findById(id);
    if (!existingUser) {
      throw new NotFoundError("User");
    }

    if (validated.email && validated.email !== existingUser.email) {
      const emailTaken = await User.findOne({
        email: validated.email,
        _id: { $ne: id },
      });
      if (emailTaken) {
        throw new ConflictError("Email is already taken");
      }
    }

    // Check for duplicate institutionId if provided
    if (
      validated.institutionId &&
      validated.institutionId !== (existingUser as any).institutionId
    ) {
      const institutionIdTaken = await User.findOne({
        institutionId: validated.institutionId,
        _id: { $ne: id },
      });
      if (institutionIdTaken) {
        throw new ConflictError("Student/Staff ID is already taken");
      }
    }

    const updateData: any = { ...validated };
    if (validated.password) {
      updateData.password = await bcrypt.hash(validated.password, 12);
    }

    const user = await User.findByIdAndUpdate(id, updateData, { new: true })
      .select("-password")
      .lean();

    const admin = c.get("user") as any;
    await createAuditLog({ action: "UPDATE", resource: "User", resourceId: id, resourceName: (user as any)?.name, performedBy: admin._id.toString(), details: `Updated user: ${(user as any)?.name} (${(user as any)?.email})` });

    return successResponse(c, { message: "User updated successfully", user });
  } catch (error) {
    return handleError(c, error);
  }
});

// Delete user
authRoute.delete("/users/:id", authMiddleware(["Admin"]), async (c) => {
  try {
    const id = c.req.param("id");
    const currentUser = c.get("user") as any;

    if (currentUser._id.toString() === id) {
      return errorResponse(
        c,
        "Cannot delete your own account",
        400,
        "SELF_DELETE_FORBIDDEN",
      );
    }

    const user = await User.findById(id);
    if (!user) {
      throw new NotFoundError("User");
    }

    await User.findByIdAndDelete(id);

    await createAuditLog({ action: "DELETE", resource: "User", resourceId: id, resourceName: user.name, performedBy: currentUser._id.toString(), details: `Deleted ${user.role} account: ${user.name} (${user.email})` });

    return successResponse(c, { message: "User deleted successfully" });
  } catch (error) {
    return handleError(c, error);
  }
});

// Bulk update eligibility
authRoute.patch(
  "/users/bulk/eligibility",
  authMiddleware(["Admin"]),
  async (c) => {
    try {
      const body = await c.req.json();
      const { userIds, isEligible } = body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return errorResponse(c, "User IDs are required", 400, "INVALID_INPUT");
      }

      if (typeof isEligible !== "boolean") {
        return errorResponse(
          c,
          "isEligible must be a boolean",
          400,
          "INVALID_INPUT",
        );
      }

      const result = await User.updateMany(
        { _id: { $in: userIds } },
        { isEligible },
      );

      return successResponse(c, {
        message: `Updated ${result.modifiedCount} users`,
        modifiedCount: result.modifiedCount,
      });
    } catch (error) {
      return handleError(c, error);
    }
  },
);

// Bulk create students
authRoute.post("/users/bulk/students", authMiddleware(["Admin"]), async (c) => {
  try {
    const body = await c.req.json();
    const validated = bulkCreateStudentsSchema.parse(body);

    const { students, defaultPassword } = validated;

    // Collect all emails and institutionIds for duplicate checking
    const emails = students.map((s) => s.email);
    const institutionIds = students.map((s) => s.institutionId).filter(Boolean);

    // Check for duplicate emails within the input
    const emailSet = new Set(emails);
    if (emailSet.size !== emails.length) {
      return errorResponse(
        c,
        "Duplicate emails found in the input",
        400,
        "DUPLICATE_INPUT",
      );
    }

    // Check for duplicate institutionIds within the input
    const institutionIdSet = new Set(institutionIds);
    if (institutionIdSet.size !== institutionIds.length) {
      return errorResponse(
        c,
        "Duplicate Student IDs found in the input",
        400,
        "DUPLICATE_INPUT",
      );
    }

    // Check for existing emails in database
    const existingEmails = await User.find({
      email: { $in: emails },
    }).select("email");

    if (existingEmails.length > 0) {
      const existingEmailList = existingEmails.map((u) => u.email);
      return errorResponse(
        c,
        `Emails already exist: ${existingEmailList.join(", ")}`,
        409,
        "EMAIL_CONFLICT",
      );
    }

    // Check for existing institutionIds in database
    if (institutionIds.length > 0) {
      const existingInstitutionIds = await User.find({
        institutionId: { $in: institutionIds },
      }).select("institutionId");

      if (existingInstitutionIds.length > 0) {
        const existingIdList = existingInstitutionIds.map(
          (u: any) => u.institutionId,
        );
        return errorResponse(
          c,
          `Student IDs already exist: ${existingIdList.join(", ")}`,
          409,
          "INSTITUTION_ID_CONFLICT",
        );
      }
    }

    // Hash the default password once
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

    // Prepare users for insertion
    const usersToCreate = students.map((student) => ({
      name: student.name,
      email: student.email,
      password: hashedPassword,
      role: "Student" as const,
      institutionId: student.institutionId,
      department: student.department,
      session: student.session,
      isEligible: student.isEligible,
    }));

    // Bulk insert
    const createdUsers = await User.insertMany(usersToCreate);

    return successResponse(
      c,
      {
        message: `Successfully created ${createdUsers.length} students`,
        created: createdUsers.length,
        students: createdUsers.map((u: any) => ({
          id: u._id,
          name: u.name,
          email: u.email,
          institutionId: u.institutionId,
          department: u.department,
          session: u.session,
          isEligible: u.isEligible,
        })),
      },
      201,
    );
  } catch (error) {
    return handleError(c, error);
  }
});

// IUMSS Eligibility Mock Verification
authRoute.get("/iumss/verify/:email", authMiddleware(["Admin"]), async (c) => {
  try {
    const email = c.req.param("email");

    // In production, this would make an external API call to IUMSS
    const mockResponse = {
      email,
      isRegisteredAndPaid: Math.random() > 0.3,
      session: "Spring 2026",
      studentId: `STU${Math.floor(Math.random() * 100000)}`,
      department: "Computer Science & Engineering",
      verifiedAt: new Date().toISOString(),
    };

    return successResponse(c, mockResponse);
  } catch (error) {
    return handleError(c, error);
  }
});

// Get user statistics
authRoute.get("/stats", authMiddleware(["Admin"]), async (c) => {
  try {
    const [
      totalUsers,
      adminCount,
      coordinatorCount,
      studentCount,
      staffCount,
      facultyCount,
      eligibleCount,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "Admin" }),
      User.countDocuments({ role: "Coordinator" }),
      User.countDocuments({ role: "Student" }),
      User.countDocuments({ role: "Staff" }),
      User.countDocuments({ role: "Faculty" }),
      User.countDocuments({ isEligible: true }),
    ]);

    return successResponse(c, {
      total: totalUsers,
      byRole: {
        Admin: adminCount,
        Coordinator: coordinatorCount,
        Student: studentCount,
        Staff: staffCount,
        Faculty: facultyCount,
      },
      eligible: eligibleCount,
      ineligible: totalUsers - eligibleCount,
    });
  } catch (error) {
    return handleError(c, error);
  }
});
