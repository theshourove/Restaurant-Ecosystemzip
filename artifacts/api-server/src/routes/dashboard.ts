import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, membersTable } from "@workspace/db";
import { requireAdmin } from "../lib/auth";

const router = Router();

// GET /api/dashboard/stats
router.get("/dashboard/stats", requireAdmin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    const allOrders = await db.select().from(ordersTable);
    const todayOrders = allOrders.filter(o => o.createdAt >= today && o.status !== "cancelled");
    const todaySales = todayOrders.reduce((sum, o) => sum + parseFloat(o.total), 0);
    const pendingOrders = allOrders.filter(o => o.status === "pending").length;
    const cookingNow = allOrders.filter(o => o.status === "cooking").length;
    const totalDiscountsToday = todayOrders.reduce((sum, o) => {
      return sum + parseFloat(o.memberDiscount ?? "0") + parseFloat(o.couponDiscount ?? "0") + parseFloat(o.manualDiscount ?? "0");
    }, 0);
    const pendingDeliveries = allOrders.filter(o => o.orderType === "delivery" && ["pending", "cooking", "ready"].includes(o.status)).length;

    const [membersCount] = await db.select({ count: membersTable.id }).from(membersTable);
    const activeMembers = await db.select().from(membersTable);

    res.json({
      todaySales,
      todayOrders: todayOrders.length,
      pendingOrders,
      cookingNow,
      totalDiscountsToday,
      activeMembers: activeMembers.length,
      pendingDeliveries,
    });
  } catch (err) {
    req.log.error({ err }, "getDashboardStats error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/dashboard/sales-chart
router.get("/dashboard/sales-chart", requireAdmin, async (req, res) => {
  try {
    const days: Array<{ date: string; label: string; sales: number; orders: number }> = [];
    const allOrders = await db.select().from(ordersTable);

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);

      const dayOrders = allOrders.filter(o => o.createdAt >= d && o.createdAt < next && o.status !== "cancelled");
      const sales = dayOrders.reduce((sum, o) => sum + parseFloat(o.total), 0);

      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      days.push({
        date: d.toISOString().split("T")[0],
        label: i === 0 ? "Today" : dayNames[d.getDay()],
        sales,
        orders: dayOrders.length,
      });
    }

    res.json(days);
  } catch (err) {
    req.log.error({ err }, "getSalesChart error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/dashboard/top-sellers
router.get("/dashboard/top-sellers", requireAdmin, async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const orders = await db.select().from(ordersTable);
    const recent = orders.filter(o => o.createdAt >= sevenDaysAgo && o.status !== "cancelled");

    const itemMap = new Map<string, { qtySold: number; revenue: number }>();
    for (const order of recent) {
      const items = order.items as Array<{ id: number; name: string; price: number; qty: number }>;
      for (const item of items) {
        const existing = itemMap.get(item.name) ?? { qtySold: 0, revenue: 0 };
        itemMap.set(item.name, {
          qtySold: existing.qtySold + item.qty,
          revenue: existing.revenue + item.price * item.qty,
        });
      }
    }

    const topSellers = Array.from(itemMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.qtySold - a.qtySold)
      .slice(0, 10);

    res.json(topSellers);
  } catch (err) {
    req.log.error({ err }, "getTopSellers error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/dashboard/recent-orders
router.get("/dashboard/recent-orders", requireAdmin, async (req, res) => {
  try {
    const allOrders = await db.select().from(ordersTable);
    const recent = allOrders
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

    const mapOrder = (o: typeof ordersTable.$inferSelect) => ({
      id: o.id,
      orderId: o.orderId,
      items: o.items,
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
      orderType: o.orderType,
      tableNumber: o.tableNumber ?? null,
      customerName: o.customerName ?? null,
      customerPhone: o.customerPhone ?? null,
      customerAddress: o.customerAddress ?? null,
      paymentMethod: o.paymentMethod,
      riderName: o.riderName ?? null,
      status: o.status,
      source: o.source,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    });

    res.json(recent.map(mapOrder));
  } catch (err) {
    req.log.error({ err }, "getRecentOrders error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
