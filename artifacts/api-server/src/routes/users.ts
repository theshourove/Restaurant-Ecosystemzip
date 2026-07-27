import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { adminUsersTable } from "@workspace/db";
import { eq, ne } from "drizzle-orm";
import { requireAdmin, requireAdminRole } from "../lib/auth";

const router = Router();

function mapUser(u: typeof adminUsersTable.$inferSelect) {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName ?? u.username,
    role: u.role ?? "Admin",
    station: u.station ?? "All",
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
  };
}

// GET /api/users (admin only)
router.get("/users", requireAdminRole, async (req, res) => {
  try {
    const users = await db.select().from(adminUsersTable);
    res.json(users.map(mapUser));
  } catch (err) {
    req.log.error({ err }, "listAdminUsers error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/users (admin only)
router.post("/users", requireAdminRole, async (req, res) => {
  try {
    const { username, displayName, password, role, station, isActive } = req.body;
    if (!username || !password) { res.status(400).json({ error: "username and password required" }); return; }
    const passwordHash = await bcrypt.hash(password, 10);
    const [u] = await db.insert(adminUsersTable).values({
      username,
      displayName: displayName ?? username,
      passwordHash,
      role: role ?? "Admin",
      station: station ?? "All",
      isActive: isActive !== false,
    }).returning();
    res.status(201).json(mapUser(u));
  } catch (err) {
    req.log.error({ err }, "createAdminUser error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/users/:id (admin only)
router.put("/users/:id", requireAdminRole, async (req, res) => {
  try {
    const { username, displayName, password, role, station, isActive } = req.body;
    const updateData: Record<string, unknown> = { username, displayName, role, station };
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) updateData.passwordHash = await bcrypt.hash(password, 10);
    const [u] = await db.update(adminUsersTable).set(updateData).where(eq(adminUsersTable.id, Number(req.params.id))).returning();
    if (!u) { res.status(404).json({ error: "Not found" }); return; }
    res.json(mapUser(u));
  } catch (err) {
    req.log.error({ err }, "updateAdminUser error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/users/:id (admin only)
router.delete("/users/:id", requireAdminRole, async (req, res) => {
  try {
    const targetId = Number(req.params.id);
    const currentUserId = req.session.adminUser!.id;
    if (targetId === currentUserId) { res.status(400).json({ error: "Cannot delete your own account" }); return; }

    // Ensure at least one Admin remains
    const admins = await db.select().from(adminUsersTable)
      .where(ne(adminUsersTable.id, targetId));
    const activeAdmins = admins.filter(u => u.role === "Admin" && u.isActive);
    const [targetUser] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.id, targetId));
    if (targetUser?.role === "Admin" && activeAdmins.length === 0) {
      res.status(400).json({ error: "Cannot delete the last admin" });
      return;
    }

    await db.delete(adminUsersTable).where(eq(adminUsersTable.id, targetId));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "deleteAdminUser error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
