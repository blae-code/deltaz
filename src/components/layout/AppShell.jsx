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
        <div className="flex flex-col items-center gap-3">
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />
          <div className="text-primary text-[11px] tracking-[0.4em] animate-pulse font-mono uppercase">
            Authenticating
          </div>
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        </div>
      </div>
    );
  }

  if (user && !user.is_onboarded) {
    return (
      <Onboarding
        onComplete={() => { base44.auth.me().then(setUser); }}
      />
    );
  }

  const isAdmin = isAdminOrGM(user);

  return (
    <div className="flex h-screen overflow-hidden">
      <ScanlineOverlay />
      <Sidebar user={user} />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <TopBar user={user} />
        <main className="flex-1 overflow-auto px-4 py-4 sm:px-5 sm:py-5 md:px-6 md:py-6 tech-grid-bg">
          <div className="max-w-[1440px] mx-auto">
            <Outlet context={{ user, isAdmin }} />
          </div>
        </main>
        <footer className="border-t border-border/30 px-4 py-1 flex items-center justify-between bg-card/40 shrink-0 h-[26px]">
          <div className="flex items-center gap-3 text-[9px] text-muted-foreground/35 font-mono tracking-widest">
            <span>DEAD SIGNAL</span>
            <span className="text-muted-foreground/20">·</span>
            <span>v2.1.7b</span>
            <span className="text-muted-foreground/20">·</span>
            <span className="hidden sm:inline">PROTO·2</span>
          </div>
          <SyncStatusFooter />
        </footer>
      </div>
    </div>
  );
}
