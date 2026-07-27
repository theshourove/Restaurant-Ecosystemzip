import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, membersTable, couponsTable, settingsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";
import { getTier, calcPointsEarned } from "../lib/tiers";
import { desc } from "drizzle-orm";

const router = Router();

async function generateOrderId(): Promise<string> {
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(cast(regexp_replace(order_id, '[^0-9]', '', 'g') as integer)), 1000)` })
    .from(ordersTable);
  const next = (max ?? 1000) + 1;
  return `PK-${String(next).padStart(4, "0")}`;
}

async function getSettings() {
  let [s] = await db.select().from(settingsTable).where(eq(settingsTable.id, 1));
  if (!s) {
    [s] = await db.insert(settingsTable).values({ id: 1 }).returning();
  }
  return s;
}

function mapOrder(o: typeof ordersTable.$inferSelect) {
  return {
    id: o.id,
    orderId: o.orderId,
    items: (o.items as unknown) as Array<{ id: number; name: string; price: number; qty: number; category?: string }>,
    subtotal: parseFloat(o.subtotal),
    taxEnabled: o.taxEnabled ?? false,
    taxRate: parseFloat(o.taxRate ?? "0"),
    taxAmount: parseFloat(o.taxAmount ?? "0"),
    memberDiscount: parseFloat(o.memberDiscount ?? "0"),
    memberTier: o.memberTier ?? null,
    memberPhone: o.memberPhone ?? null,
    couponCode: o.couponCode ?? null,
    couponDiscount: parseFloat(o.couponDiscount ?? "0"),
    manualDiscount: parseFloat(o.manualDiscount ?? "0"),
    manualDiscountReason: o.manualDiscountReason ?? null,
    pointsEarned: o.pointsEarned ?? 0,
    pointsRedeemed: o.pointsRedeemed ?? 0,
    deliveryFee: parseFloat(o.deliveryFee ?? "0"),
    total: parseFloat(o.total),
    orderType: o.orderType as "dine_in" | "takeout" | "delivery",
    tableNumber: o.tableNumber ?? null,
    customerName: o.customerName ?? null,
    customerPhone: o.customerPhone ?? null,
    customerAddress: o.customerAddress ?? null,
    paymentMethod: o.paymentMethod as "cash" | "card" | "bkash" | "cash_on_delivery" | "cash_on_desk",
    riderName: o.riderName ?? null,
    status: o.status as "pending" | "cooking" | "ready" | "served" | "delivered" | "completed" | "cancelled",
    source: o.source as "website" | "qr" | "pos_web" | "pos",
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

// GET /api/orders — newest first
router.get("/orders", async (req, res) => {
  try {
    const { status, source, limit, offset } = req.query as Record<string, string>;
    let rows = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
    if (status) rows = rows.filter(r => status.split(",").includes(r.status));
    if (source) rows = rows.filter(r => r.source === source);
    const total = rows.length;
    if (offset) rows = rows.slice(Number(offset));
    if (limit) rows = rows.slice(0, Number(limit));
    res.json({ orders: rows.map(mapOrder), total });
  } catch (err) {
    req.log.error({ err }, "listOrders error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/orders/track
router.get("/orders/track", async (req, res) => {
  try {
    const { order_id, phone } = req.query as { order_id?: string; phone?: string };
    if (!order_id && !phone) { res.status(400).json({ error: "order_id or phone required" }); return; }
    let rows = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt));
    if (order_id) rows = rows.filter(r => r.orderId === order_id);
    if (phone) rows = rows.filter(r => r.customerPhone === phone);
    res.json(rows.map(mapOrder));
  } catch (err) {
    req.log.error({ err }, "trackOrder error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/orders/:id
router.get("/orders/:id", async (req, res) => {
  try {
    const [o] = await db.select().from(ordersTable).where(eq(ordersTable.orderId, req.params.id));
    if (!o) { res.status(404).json({ error: "Not found" }); return; }
    res.json(mapOrder(o));
  } catch (err) {
    req.log.error({ err }, "getOrder error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/orders
router.post("/orders", async (req, res) => {
  try {
    const body = req.body as {
      items: Array<{ id: number; name: string; price: number; qty: number; category?: string }>;
      orderType: string;
      customerName?: string;
      customerPhone?: string;
      customerAddress?: string;
      tableNumber?: number;
      paymentMethod: string;
      memberPhone?: string;
      couponCode?: string;
      manualDiscount?: number;
      manualDiscountReason?: string;
      source?: string;
      riderName?: string;
    };

    if (!body.items?.length) { res.status(400).json({ error: "items required" }); return; }
    if (!body.orderType) { res.status(400).json({ error: "orderType required" }); return; }
    if (body.orderType === "delivery" && !body.customerAddress) {
      res.status(400).json({ error: "address required for delivery" }); return;
    }

    const s = await getSettings();
    const subtotal = body.items.reduce((sum, item) => sum + item.price * item.qty, 0);

    // Member discount
    let memberDiscount = 0;
    let memberTier: string | null = null;
    if (body.memberPhone) {
      const [member] = await db.select().from(membersTable).where(eq(membersTable.phone, body.memberPhone));
      if (member) {
        const tier = getTier(member.points);
        memberTier = tier.name;
        memberDiscount = subtotal * (tier.discountPercent / 100);
      }
    }

    const afterMember = subtotal - memberDiscount;

    // Coupon discount
    let couponDiscount = 0;
    if (body.couponCode) {
      const [c] = await db.select().from(couponsTable).where(eq(couponsTable.code, body.couponCode.toUpperCase()));
      if (c && c.isActive) {
        const today = new Date().toISOString().split("T")[0];
        if (
          (!c.expiry || c.expiry >= today) &&
          (c.usedCount ?? 0) < (c.maxUses ?? 9999) &&
          afterMember >= parseFloat(c.minOrder ?? "0")
        ) {
          couponDiscount = c.type === "percent"
            ? afterMember * (parseFloat(c.value) / 100)
            : parseFloat(c.value);
          await db.update(couponsTable)
            .set({ usedCount: (c.usedCount ?? 0) + 1 })
            .where(eq(couponsTable.id, c.id));
        }
      }
    }

    const afterCoupon = Math.max(0, afterMember - couponDiscount);

    // Manual discount (capped by settings)
    let manualDiscount = body.manualDiscount ?? 0;
    const maxPct = parseFloat(s.maxCashierDiscountPercent ?? "5");
    const maxAmt = parseFloat(s.maxCashierDiscountAmount ?? "500");
    const capPct = afterCoupon * (maxPct / 100);
    manualDiscount = Math.min(manualDiscount, capPct, maxAmt);

    const afterAll = Math.max(0, afterCoupon - manualDiscount);
    const taxEnabled = s.taxEnabled;
    const taxRate = parseFloat(s.taxRate ?? "0");
    const taxAmount = taxEnabled ? afterAll * (taxRate / 100) : 0;
    const deliveryFeeAmt = (body.orderType === "delivery" && s.deliveryFeeEnabled)
      ? parseFloat(s.deliveryFee ?? "60")
      : 0;
    const total = afterAll + taxAmount + deliveryFeeAmt;
    const pointsEarned = body.memberPhone ? calcPointsEarned(subtotal, s.pointsPer100Taka ?? 1) : 0;

    const orderId = await generateOrderId();

    const [o] = await db.insert(ordersTable).values({
      orderId,
      items: body.items as unknown as object,
      subtotal: String(subtotal),
      taxEnabled,
      taxRate: String(taxRate),
      taxAmount: String(taxAmount),
      memberDiscount: String(memberDiscount),
      memberTier,
      memberPhone: body.memberPhone ?? null,
      couponCode: body.couponCode ?? null,
      couponDiscount: String(couponDiscount),
      manualDiscount: String(manualDiscount),
      manualDiscountReason: body.manualDiscountReason ?? null,
      pointsEarned,
      pointsRedeemed: 0,
      deliveryFee: String(deliveryFeeAmt),
      total: String(total),
      orderType: body.orderType,
      tableNumber: body.tableNumber ?? null,
      customerName: body.customerName ?? null,
      customerPhone: body.customerPhone ?? null,
      customerAddress: body.customerAddress ?? null,
      paymentMethod: body.paymentMethod ?? "cash",
      riderName: body.riderName ?? null,
      status: "pending",
      source: body.source ?? "website",
    }).returning();

    // Update member points
    if (body.memberPhone && pointsEarned > 0) {
      const [member] = await db.select().from(membersTable).where(eq(membersTable.phone, body.memberPhone));
      if (member) {
        const newPoints = member.points + pointsEarned;
        const newTier = getTier(newPoints).name;
        await db.update(membersTable)
          .set({ points: newPoints, tier: newTier })
          .where(eq(membersTable.phone, body.memberPhone));
      }
    }

    res.status(201).json({ ok: true, orderId, total });
  } catch (err) {
    req.log.error({ err }, "createOrder error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/orders/:id/status (admin)
router.patch("/orders/:id/status", requireAdmin, async (req, res) => {
  try {
    const { status } = req.body as { status: string };
    if (!status) { res.status(400).json({ error: "status required" }); return; }
    const [o] = await db.update(ordersTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(ordersTable.orderId, req.params.id))
      .returning();
    if (!o) { res.status(404).json({ error: "Not found" }); return; }
    res.json(mapOrder(o));
  } catch (err) {
    req.log.error({ err }, "updateOrderStatus error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
