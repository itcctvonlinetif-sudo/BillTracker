
import { pgTable, text, serial, boolean, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const bills = pgTable("bills", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  amount: numeric("amount").notNull(), // Use numeric for money
  dueDate: timestamp("due_date").notNull(),
  status: text("status", { enum: ["paid", "unpaid"] }).default("unpaid").notNull(),
  category: text("category").notNull(),
  isRecurring: boolean("is_recurring").default(false),
  recurringInterval: text("recurring_interval"), // e.g., "monthly"
  lastRemindedAt: timestamp("last_reminded_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBillSchema = createInsertSchema(bills).omit({ 
  id: true, 
  createdAt: true,
  lastRemindedAt: true 
}).extend({
  amount: z.number().or(z.string()).transform(val => String(val)), // Handle number input for numeric field
  dueDate: z.coerce.date(), // Ensure date strings are parsed
});

export type Bill = typeof bills.$inferSelect;
export type InsertBill = z.infer<typeof insertBillSchema>;

// Types for status logic (frontend can derive this, but good to have shared understanding)
export type BillStatusColor = "red" | "yellow" | "green" | "gray";

// Helper to determine status color based on logic
// Red: H-2 to H-0 (unpaid)
// Yellow: H-7 to H-3 (unpaid)
// Green: > H-7 (unpaid)
// Gray: Paid
