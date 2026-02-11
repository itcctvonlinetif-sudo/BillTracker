
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
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
      
      // Logic from user requirements:
      // 🔴 Red: H-2 to H-0 (diffDays <= 2 && diffDays >= 0) -> Remind frequent
      // 🟡 Yellow: H-7 to H-3 (diffDays <= 7 && diffDays >= 3) -> Remind 2x daily
      // 🟢 Green: > 7 days -> No reminder

      let shouldRemind = false;
      let reminderType = "";

      if (diffDays <= 0) {
        // Today or Overdue (Red logic)
        // Reminder every 10 mins (simulated)
        // In real app: check lastRemindedAt
        const minsSinceLast = bill.lastRemindedAt 
          ? (now.getTime() - new Date(bill.lastRemindedAt).getTime()) / 60000 
          : Infinity;
          
        if (minsSinceLast >= 10) {
          shouldRemind = true;
          reminderType = "URGENT (Every 10 mins)";
        }
      } else if (diffDays <= 2) {
        // H-2 to H-1 (Red logic)
        // Reminder every 1 hour
        const hoursSinceLast = bill.lastRemindedAt 
          ? (now.getTime() - new Date(bill.lastRemindedAt).getTime()) / 3600000 
          : Infinity;

        if (hoursSinceLast >= 1) {
          shouldRemind = true;
          reminderType = "HIGH PRIORITY (Every 1 hour)";
        }
      } else if (diffDays <= 7 && diffDays >= 3) {
        // H-7 to H-3 (Yellow logic)
        // Reminder 2x daily (09:00 & 15:00)
        // We simulate by checking if current hour is 9 or 15 and we haven't sent one this hour
        const currentHour = now.getHours();
        const sentToday = bill.lastRemindedAt && isSameDay(new Date(bill.lastRemindedAt), now);
        
        // Simple logic: if hour is 9 or 15 and we haven't reminded in the last 6 hours
         const hoursSinceLast = bill.lastRemindedAt 
          ? (now.getTime() - new Date(bill.lastRemindedAt).getTime()) / 3600000 
          : Infinity;

        if ((currentHour === 9 || currentHour === 15) && hoursSinceLast > 4) {
             shouldRemind = true;
             reminderType = "MEDIUM PRIORITY (2x Daily)";
        }
      }

      if (shouldRemind) {
        console.log(`📧 SENDING EMAIL REMINDER for "${bill.title}": ${reminderType}`);
        // Here we would call the email service (SendGrid/Resend)
        // await sendEmail(...) 
        
        await storage.updateLastReminded(bill.id);
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
