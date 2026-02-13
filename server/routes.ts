
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { bills } from "@shared/schema";
import { eq, and, gte, lte, isNull, or } from "drizzle-orm";
import { api } from "@shared/routes";
import { z } from "zod";
import { differenceInDays, startOfDay, isSameDay } from "date-fns";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // === API ROUTES ===

  app.get(api.bills.list.path, async (req, res) => {
    // Parse query params manually if needed, or rely on storage to handle undefined
    const month = req.query.month as string | undefined;
    const year = req.query.year as string | undefined;
    const bills = await storage.getBills(month, year);
    res.json(bills);
  });

  app.get(api.bills.get.path, async (req, res) => {
    const bill = await storage.getBill(Number(req.params.id));
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }
    res.json(bill);
  });

  app.post(api.bills.create.path, async (req, res) => {
    try {
      const input = api.bills.create.input.parse(req.body);
      const bill = await storage.createBill(input);
      res.status(201).json(bill);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.bills.update.path, async (req, res) => {
    try {
      const input = api.bills.update.input.parse(req.body);
      const bill = await storage.updateBill(Number(req.params.id), input);
      if (!bill) return res.status(404).json({ message: "Bill not found" });
      res.json(bill);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.bills.delete.path, async (req, res) => {
    await storage.deleteBill(Number(req.params.id));
    res.status(204).send();
  });

  // === REMINDER SYSTEM (Simulation) ===
  // In a real app, this would be a separate worker or cron job.
  // Here we run a check every minute for demo purposes.

  setInterval(async () => {
    console.log("[Reminder System] Checking for bills due...");
    const unpaidBills = await storage.getUnpaidBills();
    const now = new Date();

    for (const bill of unpaidBills) {
      const dueDate = new Date(bill.dueDate);
      const diffDays = differenceInDays(startOfDay(dueDate), startOfDay(now));
      
      const lastEmail = bill.lastEmailRemindedAt ? new Date(bill.lastEmailRemindedAt) : null;
      const lastSound = bill.lastRemindedAt ? new Date(bill.lastRemindedAt) : null;

      // RED Status: H-2 to H-0 or Overdue
      if (diffDays <= 2) {
        // 1. Email Reminder: Daily
        const shouldEmail = !lastEmail || !isSameDay(lastEmail, now);
        if (shouldEmail) {
          console.log(`📧 [RED] DAILY EMAIL REMINDER: ${bill.title}`);
          // Send email here...
          await db.update(bills).set({ lastEmailRemindedAt: now }).where(eq(bills.id, bill.id));
        }

        // 2. Sound Reminder: Every X minutes (default 120)
        const soundInterval = bill.reminderSoundInterval || 120;
        const minsSinceSound = lastSound ? (now.getTime() - lastSound.getTime()) / 60000 : Infinity;
        if (minsSinceSound >= soundInterval) {
          console.log(`🔊 [RED] SOUND ALERT: ${bill.title} (Every ${soundInterval}m)`);
          // Mark in DB to track interval
          await storage.updateLastReminded(bill.id);
        }
      } 
      // YELLOW Status: H-7 to H-3
      else if (diffDays <= 7 && diffDays >= 3) {
        // Email every 2 days
        const daysSinceEmail = lastEmail ? differenceInDays(now, lastEmail) : Infinity;
        if (daysSinceEmail >= 2) {
          console.log(`📧 [YELLOW] 2-DAY EMAIL REMINDER: ${bill.title}`);
          // Send email here...
          await db.update(bills).set({ lastEmailRemindedAt: now }).where(eq(bills.id, bill.id));
        }
      }
    }
  }, 60000); // Check every minute

  // Seed Data
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const bills = await storage.getBills();
  if (bills.length === 0) {
    console.log("Seeding database with example bills...");
    const today = new Date();
    
    // 1. Red Status (Due in 1 day)
    const redDate = new Date(today);
    redDate.setDate(today.getDate() + 1);
    
    // 2. Yellow Status (Due in 5 days)
    const yellowDate = new Date(today);
    yellowDate.setDate(today.getDate() + 5);
    
    // 3. Green Status (Due in 15 days)
    const greenDate = new Date(today);
    greenDate.setDate(today.getDate() + 15);
    
    // 4. Paid (Gray) - Due yesterday but paid
    const grayDate = new Date(today);
    grayDate.setDate(today.getDate() - 1);

    await storage.createBill({
      title: "Internet WiFi (IndiHome)",
      amount: "350000",
      dueDate: redDate,
      category: "Utilities",
      status: "unpaid"
    });

    await storage.createBill({
      title: "Listrik Token",
      amount: "200000",
      dueDate: yellowDate,
      category: "Utilities",
      status: "unpaid"
    });

    await storage.createBill({
      title: "Cicilan Motor",
      amount: "850000",
      dueDate: greenDate,
      category: "Transport",
      status: "unpaid"
    });

    await storage.createBill({
      title: "Netflix Subscription",
      amount: "186000",
      dueDate: grayDate,
      category: "Entertainment",
      status: "paid"
    });
  }
}
