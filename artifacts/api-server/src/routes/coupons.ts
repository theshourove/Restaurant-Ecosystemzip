import { Router } from "express";
import { db } from "@workspace/db";
import { couponsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";

const router = Router();

function mapCoupon(c: typeof couponsTable.$inferSelect) {
  return {
    id: c.id,
    code: c.code,
    type: c.type,
    value: parseFloat(c.value),
    minOrder: parseFloat(c.minOrder ?? "0"),
    maxUses: c.maxUses ?? 100,
    usedCount: c.usedCount ?? 0,
    expiry: c.expiry ?? null,
    isActive: c.isActive,
    createdAt: c.createdAt.toISOString(),
  };
}

// GET /api/coupons (admin)
router.get("/coupons", requireAdmin, async (req, res) => {
  try {
    const coupons = await db.select().from(couponsTable);
    res.json(coupons.map(mapCoupon));
  } catch (err) {
    req.log.error({ err }, "listCoupons error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/coupons/validate
router.post("/coupons/validate", async (req, res) => {
  try {
    const { code, subtotal } = req.body as { code: string; subtotal: number };
    if (!code || subtotal == null) { res.status(400).json({ error: "code and subtotal required" }); return; }

    const [c] = await db.select().from(couponsTable).where(eq(couponsTable.code, code.toUpperCase()));
    if (!c || !c.isActive) {
      res.json({ valid: false, discount: 0, message: "Invalid or inactive coupon" });
      return;
    }
    const today = new Date().toISOString().split("T")[0];
    if (c.expiry && c.expiry < today) {
      res.json({ valid: false, discount: 0, message: "Coupon has expired" });
      return;
    }
    if (c.usedCount !== null && c.maxUses !== null && c.usedCount >= c.maxUses) {
      res.json({ valid: false, discount: 0, message: "Coupon usage limit reached" });
      return;
    }
    const minOrder = parseFloat(c.minOrder ?? "0");
    if (subtotal < minOrder) {
      res.json({ valid: false, discount: 0, message: `Minimum order ৳${minOrder} required` });
      return;
    }

    const discount = c.type === "percent"
      ? subtotal * (parseFloat(c.value) / 100)
      : parseFloat(c.value);

    res.json({ valid: true, discount, message: `Coupon applied: -৳${discount.toFixed(0)}` });
  } catch (err) {
    req.log.error({ err }, "validateCoupon error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/coupons (admin)
router.post("/coupons", requireAdmin, async (req, res) => {
  try {
    const { code, type, value, minOrder, maxUses, expiry } = req.body;
    if (!code || !type || value == null) { res.status(400).json({ error: "code, type, value required" }); return; }
    const [c] = await db.insert(couponsTable).values({
      code: code.toUpperCase(),
      type,
      value: String(value),
      minOrder: String(minOrder ?? 0),
      maxUses: maxUses ?? 100,
      expiry: expiry ?? null,
      isActive: true,
    }).returning();
    res.status(201).json(mapCoupon(c));
  } catch (err) {
    req.log.error({ err }, "createCoupon error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/coupons/:id (admin)
router.patch("/coupons/:id", requireAdmin, async (req, res) => {
  try {
    const { isActive, code, type, value, minOrder, maxUses, expiry } = req.body;
    const updateData: Record<string, unknown> = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (code !== undefined) updateData.code = code.toUpperCase();
    if (type !== undefined) updateData.type = type;
    if (value !== undefined) updateData.value = String(value);
    if (minOrder !== undefined) updateData.minOrder = String(minOrder);
    if (maxUses !== undefined) updateData.maxUses = maxUses;
    if (expiry !== undefined) updateData.expiry = expiry;
    const [c] = await db.update(couponsTable).set(updateData).where(eq(couponsTable.id, Number(req.params.id))).returning();
    if (!c) { res.status(404).json({ error: "Not found" }); return; }
    res.json(mapCoupon(c));
  } catch (err) {
    req.log.error({ err }, "updateCoupon error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/coupons/:id (admin)
router.delete("/coupons/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(couponsTable).where(eq(couponsTable.id, Number(req.params.id)));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "deleteCoupon error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
