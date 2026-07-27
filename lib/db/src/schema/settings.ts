import { pgTable, integer, varchar, boolean, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const settingsTable = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  restaurantName: varchar("restaurant_name", { length: 100 }).default("PETUK"),
  address: varchar("address", { length: 255 }).default("Gudaraghat, Jhawchar, Hazaribagh, Dhaka-1211"),
  phone: varchar("phone", { length: 20 }).default("01990800951"),
  taxEnabled: boolean("tax_enabled").default(false).notNull(),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("5.00"),
  taxName: varchar("tax_name", { length: 20 }).default("VAT"),
  currency: varchar("currency", { length: 5 }).default("৳"),
  paperWidth: integer("paper_width").default(48),
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).default("60.00"),
  deliveryFeeEnabled: boolean("delivery_fee_enabled").default(true).notNull(),
  pointsPer100Taka: integer("points_per_100_taka").default(1),
  pointsRedemptionRate: decimal("points_redemption_rate", { precision: 5, scale: 2 }).default("1.00"),
  maxCashierDiscountPercent: decimal("max_cashier_discount_percent", { precision: 5, scale: 2 }).default("5.00"),
  maxCashierDiscountAmount: decimal("max_cashier_discount_amount", { precision: 10, scale: 2 }).default("100.00"),
  syncApiKey: varchar("sync_api_key", { length: 100 }).default("petuk_sync_key_2025"),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
