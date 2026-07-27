import { Router } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";

const router = Router();

function mapSettings(s: typeof settingsTable.$inferSelect) {
  return {
    id: s.id,
    restaurantName: s.restaurantName ?? "PETUK",
    address: s.address ?? "",
    phone: s.phone ?? "",
    taxEnabled: s.taxEnabled,
    taxRate: parseFloat(s.taxRate ?? "5"),
    taxName: s.taxName ?? "VAT",
    currency: s.currency ?? "৳",
    paperWidth: s.paperWidth ?? 48,
    deliveryFee: parseFloat(s.deliveryFee ?? "60"),
    deliveryFeeEnabled: s.deliveryFeeEnabled,
    pointsPer100Taka: s.pointsPer100Taka ?? 1,
    pointsRedemptionRate: parseFloat(s.pointsRedemptionRate ?? "1"),
    maxCashierDiscountPercent: parseFloat(s.maxCashierDiscountPercent ?? "5"),
    maxCashierDiscountAmount: parseFloat(s.maxCashierDiscountAmount ?? "100"),
    syncApiKey: s.syncApiKey ?? "",
  };
}

// GET /api/settings
router.get("/settings", async (req, res) => {
  try {
    let [s] = await db.select().from(settingsTable).where(eq(settingsTable.id, 1));
    if (!s) {
      [s] = await db.insert(settingsTable).values({ id: 1 }).returning();
    }
    res.json(mapSettings(s));
  } catch (err) {
    req.log.error({ err }, "getSettings error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/settings (admin)
router.put("/settings", requireAdmin, async (req, res) => {
  try {
    const body = req.body;
    const updateData: Record<string, unknown> = {};
    const fields = [
      "restaurantName", "address", "phone", "taxEnabled", "taxName",
      "currency", "paperWidth", "deliveryFeeEnabled", "pointsPer100Taka",
      "syncApiKey",
    ];
    for (const f of fields) {
      if (body[f] !== undefined) updateData[f] = body[f];
    }
    // Decimal fields
    for (const f of ["taxRate", "deliveryFee", "pointsRedemptionRate", "maxCashierDiscountPercent", "maxCashierDiscountAmount"]) {
      if (body[f] !== undefined) updateData[f] = String(body[f]);
    }

    let [s] = await db.select().from(settingsTable).where(eq(settingsTable.id, 1));
    if (!s) {
      [s] = await db.insert(settingsTable).values({ id: 1, ...updateData }).returning();
    } else {
      [s] = await db.update(settingsTable).set(updateData).where(eq(settingsTable.id, 1)).returning();
    }
    res.json(mapSettings(s));
  } catch (err) {
    req.log.error({ err }, "updateSettings error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
