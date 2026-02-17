
import { db } from "./db";
import { bills, settings, type Bill, type InsertBill, type Settings, type InsertSettings } from "@shared/schema";
import { eq, sql, and, gte, lte } from "drizzle-orm";

export interface IStorage {
  getBills(month?: string, year?: string): Promise<Bill[]>;
  getBill(id: number): Promise<Bill | undefined>;
  createBill(bill: InsertBill): Promise<Bill>;
  updateBill(id: number, updates: Partial<InsertBill>): Promise<Bill>;
  deleteBill(id: number): Promise<void>;
  getUnpaidBills(): Promise<Bill[]>;
  updateLastReminded(id: number): Promise<void>;
  
  getSettings(): Promise<Settings>;
  updateSettings(updates: Partial<InsertSettings>): Promise<Settings>;
}

export class DatabaseStorage implements IStorage {
  async getBills(month?: string, year?: string): Promise<Bill[]> {
    let query = db.select().from(bills);
    
    if (month && year) {
      const startDate = new Date(`${year}-${month}-01`);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      
      return await db.select().from(bills)
        .where(
          and(
            gte(bills.dueDate, startDate),
            sql`${bills.dueDate} < ${endDate.toISOString()}`
          )
        );
    }
    
    return await query;
  }

  async getBill(id: number): Promise<Bill | undefined> {
    const [bill] = await db.select().from(bills).where(eq(bills.id, id));
    return bill;
  }

  async createBill(bill: InsertBill): Promise<Bill> {
    const [newBill] = await db.insert(bills).values(bill).returning();
    return newBill;
  }

  async updateBill(id: number, updates: Partial<InsertBill>): Promise<Bill> {
    const [updated] = await db.update(bills)
      .set(updates)
      .where(eq(bills.id, id))
      .returning();
    return updated;
  }

  async deleteBill(id: number): Promise<void> {
    await db.delete(bills).where(eq(bills.id, id));
  }

  async getUnpaidBills(): Promise<Bill[]> {
    return await db.select().from(bills).where(eq(bills.status, "unpaid"));
  }

  async updateLastReminded(id: number): Promise<void> {
    await db.update(bills)
      .set({ lastRemindedAt: new Date() })
      .where(eq(bills.id, id));
  }

  async getSettings(): Promise<Settings> {
    const [row] = await db.select().from(settings);
    if (!row) {
      const [newSettings] = await db.insert(settings).values({}).returning();
      return newSettings;
    }
    return row;
  }

  async updateSettings(updates: Partial<InsertSettings>): Promise<Settings> {
    const existing = await this.getSettings();
    const [updated] = await db.update(settings)
      .set(updates)
      .where(eq(settings.id, existing.id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
