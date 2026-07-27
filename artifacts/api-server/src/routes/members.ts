import { Router } from "express";
import { db } from "@workspace/db";
import { membersTable } from "@workspace/db";
import { eq, or, ilike } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";
import { getTier } from "../lib/tiers";

const router = Router();

function mapMember(m: typeof membersTable.$inferSelect) {
  const tier = getTier(m.points);
  return {
    id: m.id,
    phone: m.phone,
    name: m.name,
    points: m.points,
    tier: tier.name,
    discountPercent: tier.discountPercent,
    tierColor: tier.color,
    joined: m.joined,
  };
}

// GET /api/members (admin)
router.get("/members", requireAdmin, async (req, res) => {
  try {
    const { search } = req.query as { search?: string };
    let rows;
    if (search) {
      rows = await db.select().from(membersTable).where(
        or(ilike(membersTable.phone, `%${search}%`), ilike(membersTable.name, `%${search}%`))
      );
    } else {
      rows = await db.select().from(membersTable);
    }
    res.json(rows.map(mapMember));
  } catch (err) {
    req.log.error({ err }, "listMembers error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/members/lookup?phone=
router.get("/members/lookup", async (req, res) => {
  try {
    const { phone } = req.query as { phone?: string };
    if (!phone) { res.status(400).json({ error: "phone required" }); return; }
    const [m] = await db.select().from(membersTable).where(eq(membersTable.phone, phone));
    if (!m) {
      res.json({ found: false });
      return;
    }
    res.json({ found: true, member: mapMember(m) });
  } catch (err) {
    req.log.error({ err }, "lookupMember error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/members
router.post("/members", async (req, res) => {
  try {
    const { phone, name } = req.body as { phone: string; name: string };
    if (!phone || !name) { res.status(400).json({ error: "phone and name required" }); return; }
    const [existing] = await db.select().from(membersTable).where(eq(membersTable.phone, phone));
    if (existing) { res.status(409).json({ error: "Phone already registered" }); return; }
    const [m] = await db.insert(membersTable).values({ phone, name, points: 0, tier: "Regular" }).returning();
    res.status(201).json(mapMember(m));
  } catch (err) {
    req.log.error({ err }, "createMember error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/members/:id (admin)
router.put("/members/:id", requireAdmin, async (req, res) => {
  try {
    const { name, points } = req.body as { name?: string; points?: number };
    const updateData: Partial<{ name: string; points: number; tier: string }> = {};
    if (name !== undefined) updateData.name = name;
    if (points !== undefined) {
      updateData.points = points;
      updateData.tier = getTier(points).name;
    }
    const [m] = await db.update(membersTable).set(updateData).where(eq(membersTable.id, Number(req.params.id))).returning();
    if (!m) { res.status(404).json({ error: "Not found" }); return; }
    res.json(mapMember(m));
  } catch (err) {
    req.log.error({ err }, "updateMember error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
