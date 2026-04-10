import { Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { isAdminOrGM } from "../../lib/displayName";
import ScanlineOverlay from "../terminal/ScanlineOverlay";
import SyncStatusFooter from "../terminal/SyncStatusFooter";
import TerminalLoader from "../terminal/TerminalLoader";
import Onboarding from "../../pages/Onboarding";
import { isGameMaster } from "../../lib/displayName";

export default function AppShell() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [catalogBootstrapped, setCatalogBootstrapped] = useState(false);

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

  useEffect(() => {
    if (!user?.email || catalogBootstrapped) {
      return;
    }

    let cancelled = false;

    const ensureCatalog = async () => {
      try {
        await base44.functions.invoke("gameDataOps", { action: "bootstrap_catalog" });
      } catch (error) {
        console.warn("gameDataOps bootstrap failed", error);
      } finally {
        if (!cancelled) {
          setCatalogBootstrapped(true);
        }
      }
    };

    ensureCatalog();

    return () => {
      cancelled = true;
    };
  }, [user?.email, catalogBootstrapped]);

  if (checking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <TerminalLoader size="lg" messages={["AUTHENTICATING...", "VERIFYING CREDENTIALS...", "ESTABLISHING SESSION..."]} />
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
        <footer className="border-t border-border/40 px-4 py-1 flex items-center justify-between bg-card/50 shrink-0 h-[26px]">
          <div className="flex items-center gap-3 text-[9px] text-muted-foreground/45 font-mono tracking-widest">
            <span>DEAD SIGNAL</span>
            <span className="text-muted-foreground/25">·</span>
            <span>v2.1.7b</span>
            <span className="text-muted-foreground/25">·</span>
            <span className="hidden sm:inline">PROTO·2</span>
          </div>
          <SyncStatusFooter />
        </footer>
      </div>
    </div>
  );
}