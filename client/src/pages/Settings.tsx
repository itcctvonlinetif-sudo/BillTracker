
import React, { useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Send, Mail, Bell, Play, Volume2, VolumeX, Upload } from "lucide-react";
import { Link } from "wouter";
import type { Settings as SharedSettings } from "@shared/schema";

export default function SettingsPage() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery<SharedSettings>({
    queryKey: ["/api/settings"],
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  const playTestSound = () => {
    if (settings?.alertSoundUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      const audio = new Audio(settings.alertSoundUrl);
      audioRef.current = audio;
      audio.play().catch(e => {
        toast({
          title: "Gagal memutar suara",
          description: "Klik di mana saja pada halaman lalu coba lagi.",
          variant: "destructive"
        });
      });
    } else {
      toast({
        title: "Suara belum diatur",
        description: "Silakan masukkan URL suara terlebih dahulu.",
      });
    }
  };

  const testEmailMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/settings/test-email", {});
      if (!res.ok) throw new Error("Gagal mengirim email tes");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Email Terkirim",
        description: "Silakan periksa kotak masuk Anda.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Gagal",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const testTelegramMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/settings/test-telegram", {});
      if (!res.ok) throw new Error("Gagal mengirim pesan Telegram tes");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Pesan Terkirim",
        description: "Silakan periksa chat Telegram Anda.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Gagal",
        description: error.message,
        variant: "destructive",
      });
    }
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
                checked={settings?.isEmailEnabled ?? false}
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
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={!settings?.userEmail || !settings?.isEmailEnabled || testEmailMutation.isPending}
                  onClick={() => testEmailMutation.mutate()}
                  className="shrink-0"
                >
                  <Play className="w-3 h-3 mr-2" />
                  Tes
                </Button>
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
                checked={settings?.isTelegramEnabled ?? false}
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
              <div className="flex gap-2">
                <Input 
                  placeholder="ID Chat / User" 
                  defaultValue={settings?.telegramChatId || ""}
                  onBlur={(e) => mutation.mutate({ telegramChatId: e.target.value })}
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={!settings?.telegramToken || !settings?.telegramChatId || !settings?.isTelegramEnabled || testTelegramMutation.isPending}
                  onClick={() => testTelegramMutation.mutate()}
                  className="shrink-0"
                >
                  <Play className="w-3 h-3 mr-2" />
                  Tes
                </Button>
              </div>
              <p className="text-[11px] text-slate-400">
                Gunakan @userinfobot di Telegram untuk mendapatkan Chat ID Anda.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-indigo-500" />
              Alert Suara
            </CardTitle>
            <CardDescription>Konfigurasi alert suara untuk tagihan kritis (Merah).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <Label htmlFor="sound-enabled">Aktifkan Suara</Label>
              <Switch 
                id="sound-enabled" 
                checked={settings?.isSoundEnabled ?? false}
                onCheckedChange={(checked) => mutation.mutate({ isSoundEnabled: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label htmlFor="mute-enabled">Mute Alert</Label>
                <p className="text-xs text-slate-500">Hentikan suara sementara tanpa mematikan fitur.</p>
              </div>
              <Button
                variant={settings?.isMuted ? "destructive" : "outline"}
                size="sm"
                onClick={() => mutation.mutate({ isMuted: !settings?.isMuted })}
              >
                {settings?.isMuted ? <VolumeX className="w-4 h-4 mr-2" /> : <Volume2 className="w-4 h-4 mr-2" />}
                {settings?.isMuted ? "Unmute" : "Mute"}
              </Button>
            </div>

            <div className="space-y-2">
              <Label>File Suara Alert (.mp3 / .wav)</Label>
              <div className="flex gap-2">
                <Input 
                  type="file"
                  accept="audio/mpeg,audio/wav"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const base64 = event.target?.result as string;
                        mutation.mutate({ alertSoundUrl: base64 });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={playTestSound}
                  className="shrink-0"
                >
                  <Play className="w-3 h-3 mr-2" />
                  Tes Suara
                </Button>
              </div>
              <p className="text-[11px] text-slate-400">
                Tagihan Merah (≤ 2 hari) akan membunyikan suara ini secara kontinu.
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
