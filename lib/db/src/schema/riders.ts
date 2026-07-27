import { pgTable, serial, varchar, integer, decimal, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ridersTable = pgTable(
  "riders",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    phone: varchar("phone", { length: 20 }),
    status: varchar("status", { length: 20 }).notNull().default("Available"),
    totalDeliveries: integer("total_deliveries").default(0).notNull(),
    earnings: decimal("earnings", { precision: 10, scale: 2 }).default("0").notNull(),
    salary: decimal("salary", { precision: 10, scale: 2 }).default("0").notNull(),
    assignedOrderId: varchar("assigned_order_id", { length: 20 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("idx_riders_status").on(t.status)]
);

export const insertRiderSchema = createInsertSchema(ridersTable).omit({ id: true, createdAt: true });
export type InsertRider = z.infer<typeof insertRiderSchema>;
export type Rider = typeof ridersTable.$inferSelect;
