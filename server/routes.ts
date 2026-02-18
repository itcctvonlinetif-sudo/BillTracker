
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { bills } from "@shared/schema";
import { eq, and, gte, lte, isNull, or } from "drizzle-orm";
import { api } from "@shared/routes";
import { z } from "zod";
import { differenceInDays, startOfDay, isSameDay } from "date-fns";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function sendReminderEmail(bill: any, urgency: 'RED' | 'YELLOW', targetEmail?: string) {
  if (!resend) {
    console.log(`[Email] Skipping real email (API Key missing) for: ${bill.title}`);
    return;
  }

  try {
    const amountStr = Number(bill.amount).toLocaleString('id-ID');
    const dueDateStr = new Date(bill.dueDate).toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });

    const subject = urgency === 'RED' 
      ? `🚨 SEGARA BAYAR: Tagihan ${bill.title} Jatuh Tempo!`
      : `📅 PENGINGAT: Tagihan ${bill.title} Mendekati Jatuh Tempo`;

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
        <h2 style="color: ${urgency === 'RED' ? '#ef4444' : '#f59e0b'}; margin-top: 0;">Halo, Pembayar Setia!</h2>
        <p>Ini adalah pengingat otomatis untuk tagihan Anda:</p>
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Tagihan:</strong> ${bill.title}</p>
          <p style="margin: 5px 0;"><strong>Jumlah:</strong> Rp ${amountStr}</p>
          <p style="margin: 5px 0;"><strong>Jatuh Tempo:</strong> ${dueDateStr}</p>
          <p style="margin: 5px 0;"><strong>Kategori:</strong> ${bill.category}</p>
        </div>
        <p>Silakan segera lakukan pembayaran untuk menghindari denda atau gangguan layanan.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="font-size: 12px; color: #64748b; text-align: center;">Sent by BillTracker Dashboard</p>
      </div>
    `;

    // Note: In development with Resend, you can usually only send to your own verified email
    // For this demo, we'll try to send, but log if it's restricted
    const recipient = targetEmail || 'acp13505@gmail.com';
    
    const { data, error } = await resend.emails.send({
      from: 'BillTracker <onboarding@resend.dev>',
      to: [recipient], 
      subject: subject,
      html: html,
    });

    if (error) {
      console.error(`❌ [Resend Error] ${error.message}`);
    } else {
      console.log(`✅ [Email Sent] ${urgency} reminder for ${bill.title} (ID: ${data?.id})`);
    }
  } catch (err) {
    console.error(`❌ [Email Failed] Error sending to Resend:`, err);
  }
}

async function sendTelegramMessage(bill: any, urgency: string, token: string, chatId: string) {
  try {
    const amountStr = Number(bill.amount).toLocaleString('id-ID');
    const dueDateStr = new Date(bill.dueDate).toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });

    const message = urgency === 'RED'
      ? `🚨 *SEGERA BAYAR: Tagihan ${bill.title} Jatuh Tempo!*\n\n` +
        `• *Jumlah:* Rp ${amountStr}\n` +
        `• *Jatuh Tempo:* ${dueDateStr}\n` +
        `• *Kategori:* ${bill.category}\n\n` +
        `Silakan segera lakukan pembayaran.`
      : `📅 *PENGINGAT: Tagihan ${bill.title} Mendekati Jatuh Tempo*\n\n` +
        `• *Jumlah:* Rp ${amountStr}\n` +
        `• *Jatuh Tempo:* ${dueDateStr}\n` +
        `• *Kategori:* ${bill.category}`;

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`❌ [Telegram Error] ${JSON.stringify(errorData)}`);
    } else {
      console.log(`✅ [Telegram Sent] ${urgency} reminder for ${bill.title}`);
    }
  } catch (err) {
    console.error(`❌ [Telegram Failed] Error sending:`, err);
  }
}

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

  app.get("/api/settings", async (req, res) => {
    const settings = await storage.getSettings();
    res.json(settings);
  });

  app.put("/api/settings", async (req, res) => {
    const settings = await storage.updateSettings(req.body);
    res.json(settings);
  });

  app.post("/api/settings/test-email", async (req, res) => {
    const settings = await storage.getSettings();
    if (!settings.isEmailEnabled || !settings.userEmail) {
      return res.status(400).json({ message: "Email not enabled or address missing" });
    }

    await sendReminderEmail({
      title: "Tes Notifikasi",
      amount: "0",
      dueDate: new Date(),
      category: "Sistem"
    }, 'YELLOW', settings.userEmail);

    res.json({ message: "Test email sent" });
  });

  app.post("/api/settings/test-telegram", async (req, res) => {
    const settings = await storage.getSettings();
    if (!settings.isTelegramEnabled || !settings.telegramToken || !settings.telegramChatId) {
      return res.status(400).json({ message: "Telegram not enabled or configuration missing" });
    }

    await sendTelegramMessage({
      title: "Tes Notifikasi",
      amount: "0",
      dueDate: new Date(),
      category: "Sistem"
    }, 'YELLOW', settings.telegramToken, settings.telegramChatId);

    res.json({ message: "Test Telegram message sent" });
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

      const settings = await storage.getSettings();

      // RED Status: H-2 to H-0 or Overdue
      if (diffDays <= 2) {
        // 1. Email Reminder: Daily
        const shouldEmail = settings.isEmailEnabled && settings.userEmail && (!lastEmail || !isSameDay(lastEmail, now));
        if (shouldEmail) {
          console.log(`📧 [RED] DAILY EMAIL REMINDER: ${bill.title} to ${settings.userEmail}`);
          await sendReminderEmail(bill, 'RED', settings.userEmail!);
          await db.update(bills).set({ lastEmailRemindedAt: now }).where(eq(bills.id, bill.id));
        }

        // 2. Telegram Reminder: Daily
        if (settings.isTelegramEnabled && settings.telegramToken && settings.telegramChatId && shouldEmail) {
           await sendTelegramMessage(bill, 'RED', settings.telegramToken, settings.telegramChatId);
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
        if (daysSinceEmail >= 2 && settings.isEmailEnabled && settings.userEmail) {
          console.log(`📧 [YELLOW] 2-DAY EMAIL REMINDER: ${bill.title} to ${settings.userEmail}`);
          await sendReminderEmail(bill, 'YELLOW', settings.userEmail);
          await db.update(bills).set({ lastEmailRemindedAt: now }).where(eq(bills.id, bill.id));
        }

        // Telegram reminder for Yellow status too if enabled
        if (settings.isTelegramEnabled && settings.telegramToken && settings.telegramChatId && (lastEmail ? differenceInDays(now, lastEmail) >= 2 : true)) {
           await sendTelegramMessage(bill, 'YELLOW', settings.telegramToken, settings.telegramChatId);
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
