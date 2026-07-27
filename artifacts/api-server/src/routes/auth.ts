import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { adminUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";

const router = Router();

// POST /api/auth/login
router.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body as { username: string; password: string };
    if (!username || !password) {
      res.status(400).json({ error: "Username and password required" });
      return;
    }

    const [user] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.username, username));
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    if (!user.isActive) {
      res.status(401).json({ error: "Account deactivated" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    req.session.adminUser = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      station: user.station,
    };

    // Force session save to DB before responding so the next GET /auth/me
    // is guaranteed to find the session in the store.
    const payload = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      station: user.station,
    };
    req.session.save((err) => {
      if (err) {
        req.log.error({ err }, "Session save error");
        res.status(500).json({ error: "Internal server error" });
        return;
      }
      res.json(payload);
    });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/logout
router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// GET /api/auth/me
router.get("/auth/me", requireAdmin, (req, res) => {
  const u = req.session.adminUser!;
  res.json({
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    role: u.role,
    station: u.station,
    isActive: true,
    createdAt: new Date().toISOString(),
  });
});

export default router;
