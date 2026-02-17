
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Send, Mail, Bell } from "lucide-react";
import { Link } from "wouter";
import type { Settings as SharedSettings } from "@shared/schema";

export default function SettingsPage() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery<SharedSettings>({
    queryKey: ["/api/settings"],
  });

  const mutation = useMutation({
    mutationFn: async (updates: Partial<SharedSettings>) => {
      const res = await apiRequest("PUT", "/api/settings", updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Berhasil",
        description: "Pengaturan telah disimpan.",
      });
    },
  });

  if (isLoading) return null;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="font-display font-bold text-xl text-slate-900">Pengaturan Notifikasi</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Email Pengingat
            </CardTitle>
            <CardDescription>Atur alamat email untuk menerima notifikasi tagihan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <Label htmlFor="email-enabled">Aktifkan Email</Label>
              <Switch 
                id="email-enabled" 
                checked={settings?.isEmailEnabled}
                onCheckedChange={(checked) => mutation.mutate({ isEmailEnabled: checked })}
              />
            </div>
            <div className="space-y-2">
              <Label>Alamat Email</Label>
              <div className="flex gap-2">
                <Input 
                  placeholder="email@contoh.com" 
                  defaultValue={settings?.userEmail || ""}
                  onBlur={(e) => mutation.mutate({ userEmail: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-sky-500" />
              Telegram Bot
            </CardTitle>
            <CardDescription>Hubungkan dengan Telegram untuk menerima alert real-time.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <Label htmlFor="tele-enabled">Aktifkan Telegram</Label>
              <Switch 
                id="tele-enabled" 
                checked={settings?.isTelegramEnabled}
                onCheckedChange={(checked) => mutation.mutate({ isTelegramEnabled: checked })}
              />
            </div>
            <div className="space-y-2">
              <Label>Bot Token</Label>
              <Input 
                type="password"
                placeholder="Token dari BotFather" 
                defaultValue={settings?.telegramToken || ""}
                onBlur={(e) => mutation.mutate({ telegramToken: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Chat ID</Label>
              <Input 
                placeholder="ID Chat / User" 
                defaultValue={settings?.telegramChatId || ""}
                onBlur={(e) => mutation.mutate({ telegramChatId: e.target.value })}
              />
              <p className="text-[11px] text-slate-400">
                Gunakan @userinfobot di Telegram untuk mendapatkan Chat ID Anda.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
          <Bell className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800">
            Sistem akan mengirimkan pengingat otomatis ke email dan Telegram yang dikonfigurasi di atas sesuai dengan jadwal jatuh tempo tagihan.
          </p>
        </div>
      </main>
    </div>
  );
}
