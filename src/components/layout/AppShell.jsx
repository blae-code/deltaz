import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { isAdminOrGM } from "../../lib/displayName";
import ScanlineOverlay from "../terminal/ScanlineOverlay";
import SyncStatusFooter from "../terminal/SyncStatusFooter";
import Onboarding from "../../pages/Onboarding";
import { isGameMaster } from "../../lib/displayName";

export default function AppShell() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
      // Auto-onboard the Game Master account
      if (isGameMaster(u) && !u.is_onboarded) {
        base44.auth.updateMe({
          callsign: "Game Master",
          is_onboarded: true,
          discord_username: "game_master",
        }).then(() => setUser((prev) => ({ ...prev, callsign: "Game Master", is_onboarded: true })));
      }
    }).catch(() => {}).finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-primary text-xs tracking-widest animate-pulse font-mono">AUTHENTICATING...</div>
      </div>
    );
  }

  // Show onboarding if user hasn't completed it
  if (user && !user.is_onboarded) {
    return (
      <Onboarding
        onComplete={() => {
          base44.auth.me().then(setUser);
        }}
      />
    );
  }

  const isAdmin = isAdminOrGM(user);

  return (
    <div className="flex h-screen overflow-hidden terminal-flicker">
      <ScanlineOverlay />
      <Sidebar user={user} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar user={user} />
        <main className="flex-1 overflow-auto px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-6 pt-14 md:pt-6">
          <div className="max-w-[1400px] mx-auto">
            <Outlet context={{ user, isAdmin }} />
          </div>
        </main>
        <footer className="border-t border-border/30 px-4 py-1.5 flex items-center justify-between bg-card/50 shrink-0">
          <span className="text-[10px] text-muted-foreground/50 font-mono tracking-widest">DEAD SIGNAL v2.1.7b</span>
          <SyncStatusFooter />
        </footer>
      </div>
    </div>
  );
}