import { Router } from "express";
import { db } from "@workspace/db";
import { menuItemsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";

const router = Router();

// GET /api/menu
router.get("/menu", async (req, res) => {
  try {
    const { category, available } = req.query as { category?: string; available?: string };
    const conditions = [];
    if (category) conditions.push(eq(menuItemsTable.category, category));
    if (available !== undefined) conditions.push(eq(menuItemsTable.isAvailable, available === "true"));

    const items = await db.select().from(menuItemsTable).where(conditions.length ? and(...conditions) : undefined);
    res.json(items.map(mapMenuItem));
  } catch (err) {
    req.log.error({ err }, "listMenuItems error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/menu/:id
router.get("/menu/:id", async (req, res) => {
  try {
    const [item] = await db.select().from(menuItemsTable).where(eq(menuItemsTable.id, Number(req.params.id)));
    if (!item) { res.status(404).json({ error: "Not found" }); return; }
    res.json(mapMenuItem(item));
  } catch (err) {
    req.log.error({ err }, "getMenuItem error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/menu (admin)
router.post("/menu", requireAdmin, async (req, res) => {
  try {
    const { name, price, category, emoji, imagePath, isAvailable } = req.body;
    if (!name || price == null || !category) {
      res.status(400).json({ error: "name, price, category required" });
      return;
    }
    const [item] = await db.insert(menuItemsTable).values({
      name,
      price: String(price),
      category,
      emoji: emoji ?? "",
      imagePath: imagePath ?? null,
      isAvailable: isAvailable !== false,
    }).returning();
    res.status(201).json(mapMenuItem(item));
  } catch (err) {
    req.log.error({ err }, "createMenuItem error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/menu/:id (admin)
router.put("/menu/:id", requireAdmin, async (req, res) => {
  try {
    const { name, price, category, emoji, imagePath, isAvailable } = req.body;
    const [item] = await db.update(menuItemsTable)
      .set({ name, price: String(price), category, emoji, imagePath, isAvailable })
      .where(eq(menuItemsTable.id, Number(req.params.id)))
      .returning();
    if (!item) { res.status(404).json({ error: "Not found" }); return; }
    res.json(mapMenuItem(item));
  } catch (err) {
    req.log.error({ err }, "updateMenuItem error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/menu/:id (admin)
router.delete("/menu/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(menuItemsTable).where(eq(menuItemsTable.id, Number(req.params.id)));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "deleteMenuItem error");
    res.status(500).json({ error: "Internal server error" });
  }
});

function mapMenuItem(item: typeof menuItemsTable.$inferSelect) {
  return {
    id: item.id,
    name: item.name,
    price: parseFloat(item.price),
    category: item.category,
    emoji: item.emoji ?? "",
    imagePath: item.imagePath ?? null,
    isAvailable: item.isAvailable,
    createdAt: item.createdAt.toISOString(),
  };
}

export default router;
