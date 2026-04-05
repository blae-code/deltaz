import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import StatusBar from "./StatusBar";
import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

export default function AppShell() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden scanline-overlay">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar userRole={user?.role} />
        <main className="flex-1 overflow-auto bg-background">
          <Outlet />
        </main>
      </div>
      <StatusBar user={user} />
    </div>
  );
}