import { pgTable, serial, varchar, decimal, boolean, integer, timestamp, index, text, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ordersTable = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    orderId: varchar("order_id", { length: 20 }).unique().notNull(),
    items: json("items").notNull(),
    subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
    taxEnabled: boolean("tax_enabled").default(false),
    taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("0"),
    taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"),
    memberDiscount: decimal("member_discount", { precision: 10, scale: 2 }).default("0"),
    memberTier: varchar("member_tier", { length: 20 }),
    memberPhone: varchar("member_phone", { length: 20 }),
    couponCode: varchar("coupon_code", { length: 50 }),
    couponDiscount: decimal("coupon_discount", { precision: 10, scale: 2 }).default("0"),
    manualDiscount: decimal("manual_discount", { precision: 10, scale: 2 }).default("0"),
    manualDiscountReason: varchar("manual_discount_reason", { length: 50 }),
    pointsEarned: integer("points_earned").default(0),
    pointsRedeemed: integer("points_redeemed").default(0),
    deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).default("0"),
    total: decimal("total", { precision: 10, scale: 2 }).notNull().default("0"),
    orderType: varchar("order_type", { length: 20 }).notNull().default("takeout"),
    tableNumber: integer("table_number"),
    customerName: varchar("customer_name", { length: 100 }),
    customerPhone: varchar("customer_phone", { length: 20 }),
    customerAddress: text("customer_address"),
    paymentMethod: varchar("payment_method", { length: 30 }).notNull().default("cash"),
    riderName: varchar("rider_name", { length: 100 }),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    source: varchar("source", { length: 20 }).notNull().default("website"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_orders_status").on(t.status),
    index("idx_orders_source").on(t.source),
    index("idx_orders_created").on(t.createdAt),
    index("idx_orders_phone").on(t.customerPhone),
    index("idx_orders_order_id").on(t.orderId),
  ]
);

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
