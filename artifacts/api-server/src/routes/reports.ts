import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable } from "@workspace/db";
import { requireAdmin } from "../lib/auth";

const router = Router();

// GET /api/reports?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/reports", requireAdmin, async (req, res) => {
  try {
    const { from, to } = req.query as { from: string; to: string };
    if (!from || !to) { res.status(400).json({ error: "from and to required" }); return; }

    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    const allOrders = await db.select().from(ordersTable);
    const orders = allOrders.filter(o => o.createdAt >= fromDate && o.createdAt <= toDate && o.status !== "cancelled");

    const totalSales = orders.reduce((sum, o) => sum + parseFloat(o.total), 0);
    const totalOrders = orders.length;
    const avgOrder = totalOrders > 0 ? totalSales / totalOrders : 0;
    const taxCollected = orders.reduce((sum, o) => sum + parseFloat(o.taxAmount ?? "0"), 0);
    const totalDiscounts = orders.reduce((sum, o) => {
      return sum + parseFloat(o.memberDiscount ?? "0") + parseFloat(o.couponDiscount ?? "0") + parseFloat(o.manualDiscount ?? "0");
    }, 0);

    // Daily sales
    const dayMap = new Map<string, { sales: number; orders: number }>();
    for (const o of orders) {
      const day = o.createdAt.toISOString().split("T")[0];
      const existing = dayMap.get(day) ?? { sales: 0, orders: 0 };
      dayMap.set(day, { sales: existing.sales + parseFloat(o.total), orders: existing.orders + 1 });
    }
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dailySales = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        label: dayNames[new Date(date + "T12:00:00").getDay()],
        sales: data.sales,
        orders: data.orders,
      }));

    // Top sellers
    const itemMap = new Map<string, { qtySold: number; revenue: number }>();
    for (const order of orders) {
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
      .slice(0, 15);

    res.json({ totalSales, totalOrders, avgOrder, taxCollected, totalDiscounts, dailySales, topSellers });
  } catch (err) {
    req.log.error({ err }, "getReports error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
