import { pgTable, serial, varchar, integer, date, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const membersTable = pgTable(
  "members",
  {
    id: serial("id").primaryKey(),
    phone: varchar("phone", { length: 20 }).unique().notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    points: integer("points").default(0).notNull(),
    tier: varchar("tier", { length: 20 }).default("Regular").notNull(),
    joined: date("joined").defaultNow().notNull(),
  },
  (t) => [index("idx_members_phone").on(t.phone), index("idx_members_tier").on(t.tier)]
);

export const insertMemberSchema = createInsertSchema(membersTable).omit({ id: true, joined: true });
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Member = typeof membersTable.$inferSelect;
