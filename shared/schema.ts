
import { pgTable, text, serial, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const bills = pgTable("bills", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  amount: numeric("amount").notNull(),
  dueDate: timestamp("due_date").notNull(),
  status: text("status", { enum: ["paid", "unpaid"] }).default("unpaid").notNull(),
  category: text("category").notNull(),
  isRecurring: boolean("is_recurring").default(false),
  recurringInterval: text("recurring_interval"), // "monthly", "yearly", or "custom"
  invoiceUrl: text("invoice_url"), // URL for uploaded invoice
  createdAt: timestamp("created_at").defaultNow(),
  lastRemindedAt: timestamp("last_reminded_at"),
});

export const insertBillSchema = createInsertSchema(bills).omit({ 
  id: true, 
  createdAt: true,
  lastRemindedAt: true 
}).extend({
  amount: z.number().or(z.string()).transform(val => String(val)),
  dueDate: z.coerce.date(),
});

export type Bill = typeof bills.$inferSelect;
export type InsertBill = z.infer<typeof insertBillSchema>;
export type BillStatusColor = "red" | "yellow" | "green" | "gray";
