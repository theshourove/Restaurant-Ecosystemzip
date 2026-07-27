import { pgTable, serial, varchar, decimal, integer, boolean, date, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const couponsTable = pgTable(
  "coupons",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 50 }).unique().notNull(),
    type: varchar("type", { length: 10 }).notNull().default("fixed"),
    value: decimal("value", { precision: 10, scale: 2 }).notNull(),
    minOrder: decimal("min_order", { precision: 10, scale: 2 }).default("0"),
    maxUses: integer("max_uses").default(100),
    usedCount: integer("used_count").default(0),
    expiry: date("expiry"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("idx_coupon_code").on(t.code)]
);

export const insertCouponSchema = createInsertSchema(couponsTable).omit({ id: true, createdAt: true, usedCount: true });
export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type Coupon = typeof couponsTable.$inferSelect;
