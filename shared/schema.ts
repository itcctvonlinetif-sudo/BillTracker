
import { pgTable, text, serial, boolean, timestamp, integer, numeric } from "drizzle-orm/pg-core";
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
  reminderSoundInterval: integer("reminder_sound_interval").default(120), // minutes, default 2 hours
  lastEmailRemindedAt: timestamp("last_email_reminded_at"),
  createdAt: timestamp("created_at").defaultNow(),
  lastRemindedAt: timestamp("last_reminded_at"),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  userEmail: text("user_email"),
  telegramToken: text("telegram_token"),
  telegramChatId: text("telegram_chat_id"),
  isTelegramEnabled: boolean("is_telegram_enabled").default(false),
  isEmailEnabled: boolean("is_email_enabled").default(true),
});

export const insertBillSchema = createInsertSchema(bills).omit({ 
  id: true, 
  createdAt: true,
  lastRemindedAt: true 
}).extend({
  amount: z.number().or(z.string()).transform(val => String(val)),
  dueDate: z.coerce.date(),
});

export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true });

export type Bill = typeof bills.$inferSelect;
export type InsertBill = z.infer<typeof insertBillSchema>;
export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type BillStatusColor = "red" | "yellow" | "green" | "gray";
