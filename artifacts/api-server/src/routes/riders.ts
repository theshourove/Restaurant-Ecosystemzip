import { Router } from "express";
import { db } from "@workspace/db";
import { ridersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";

const router = Router();

function mapRider(r: typeof ridersTable.$inferSelect) {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone ?? null,
    status: r.status,
    totalDeliveries: r.totalDeliveries,
    earnings: parseFloat(r.earnings),
    salary: parseFloat(r.salary),
    assignedOrderId: r.assignedOrderId ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

// GET /api/riders (admin)
router.get("/riders", requireAdmin, async (req, res) => {
  try {
    const riders = await db.select().from(ridersTable);
    res.json(riders.map(mapRider));
  } catch (err) {
    req.log.error({ err }, "listRiders error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/riders (admin)
router.post("/riders", requireAdmin, async (req, res) => {
  try {
    const { name, phone, salary } = req.body;
    if (!name) { res.status(400).json({ error: "name required" }); return; }
    const [r] = await db.insert(ridersTable).values({
      name,
      phone: phone ?? null,
      status: "Available",
      salary: String(salary ?? 0),
    }).returning();
    res.status(201).json(mapRider(r));
  } catch (err) {
    req.log.error({ err }, "createRider error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/riders/:id (admin)
router.patch("/riders/:id", requireAdmin, async (req, res) => {
  try {
    const { status, name, phone, salary } = req.body;
    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (salary !== undefined) updateData.salary = String(salary);
    const [r] = await db.update(ridersTable).set(updateData).where(eq(ridersTable.id, Number(req.params.id))).returning();
    if (!r) { res.status(404).json({ error: "Not found" }); return; }
    res.json(mapRider(r));
  } catch (err) {
    req.log.error({ err }, "updateRider error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/riders/:id/assign (admin)
router.post("/riders/:id/assign", requireAdmin, async (req, res) => {
  try {
    const { orderId } = req.body as { orderId: string };
    if (!orderId) { res.status(400).json({ error: "orderId required" }); return; }
    const [r] = await db.update(ridersTable)
      .set({ status: "On Delivery", assignedOrderId: orderId })
      .where(eq(ridersTable.id, Number(req.params.id)))
      .returning();
    if (!r) { res.status(404).json({ error: "Not found" }); return; }
    res.json(mapRider(r));
  } catch (err) {
    req.log.error({ err }, "assignRider error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/riders/:id/complete-delivery (admin)
router.post("/riders/:id/complete-delivery", requireAdmin, async (req, res) => {
  try {
    const [existing] = await db.select().from(ridersTable).where(eq(ridersTable.id, Number(req.params.id)));
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    const [r] = await db.update(ridersTable)
      .set({
        status: "Available",
        assignedOrderId: null,
        totalDeliveries: (existing.totalDeliveries ?? 0) + 1,
        earnings: String(parseFloat(existing.earnings) + 60),
      })
      .where(eq(ridersTable.id, Number(req.params.id)))
      .returning();
    res.json(mapRider(r));
  } catch (err) {
    req.log.error({ err }, "completeDelivery error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
